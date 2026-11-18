// The playgrounds: pixel snapping, corner fit, and "this device", which reads the visitor's
// safe-area insets, pixel ratio and screen size and names the closest measured device.

import { useEffect, useState } from 'preact/hooks'
import { trackPlayground } from '../lib/analytics.ts'
import { num } from '../lib/format.ts'
import { concentricRadius, cornerDepth, onPixelGrid, snapToPixels } from '../lib/geometry.ts'

export interface PlayDevice {
  id: string
  name: string
  unit: 'pt' | 'dp'
  /** Pixels per pt or dp. */
  perUnit: number
  /** The first display in its natural orientation, in pt or dp. */
  display: { width: number; height: number }
  /** The display profile's bottom-left radius in the current reading, if read. */
  radius: number | null
  /** The newest content margin read in the natural orientation, if any. */
  margin: number | null
  /** The current reading's bottom safe-area inset. */
  bottom: number | null
}

function numberInput(value: string, set: (v: string) => void, label: string, unit: string) {
  return (
    <label>{label}
      <span class="input-unit">
        <input type="number" inputMode="decimal" step="any" value={value} onInput={(e) => set((e.target as HTMLInputElement).value)} />
        {unit}
      </span>
    </label>
  )
}

function DevicePicker({ devices, value, onChange }: { devices: PlayDevice[]; value: string; onChange: (id: string) => void }) {
  return (
    <label>Device
      <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {devices.map((d) => <option value={d.id}>{d.name}</option>)}
      </select>
    </label>
  )
}

export function PixelSnapping({ devices, initial }: { devices: PlayDevice[]; initial: string }) {
  const [id, setId] = useState(initial)
  const [value, setValue] = useState('16.5')
  const d = devices.find((x) => x.id === id) ?? devices[0]
  const v = Number(value)
  const ok = value.trim() !== '' && Number.isFinite(v)
  const px = v * d.perUnit
  const down = Math.floor(px + 1e-9) / d.perUnit
  const up = Math.ceil(px - 1e-9) / d.perUnit
  const use = (f: () => void) => () => { f(); trackPlayground('pixel-snapping') }
  return (
    <div class="playground">
      <div class="pickers">
        <DevicePicker devices={devices} value={id} onChange={(x) => use(() => setId(x))()} />
        {numberInput(value, (x) => use(() => setValue(x))(), 'Length', d.unit)}
      </div>
      <p class="result" aria-live="polite">
        {!ok ? 'Enter a length.' : onPixelGrid(v, d.perUnit, 0.001)
          ? `${num(v)} ${d.unit} is ${num(px)} px on the ${d.name}: on the pixel grid.`
          : `${num(v)} ${d.unit} is ${num(px)} px on the ${d.name}: between pixels. The edges either side are ${down.toFixed(3)} ${d.unit} (${Math.round(down * d.perUnit)} px) and ${up.toFixed(3)} ${d.unit} (${Math.round(up * d.perUnit)} px); the nearest is ${snapToPixels(v, d.perUnit).toFixed(3)} ${d.unit}.`}
      </p>
    </div>
  )
}

export function CornerFit({ devices, initial }: { devices: PlayDevice[]; initial: string }) {
  const rounded = devices.filter((d) => d.radius)
  const start = rounded.find((d) => d.id === initial) ?? rounded[0]
  const [id, setId] = useState(start.id)
  const [dx, setDx] = useState(String(start.margin ?? 16))
  const [dy, setDy] = useState(String(start.bottom ?? 16))
  const d = rounded.find((x) => x.id === id) ?? start
  const R = d.radius ?? 0
  const x = Number(dx)
  const y = Number(dy)
  const ok = dx.trim() !== '' && dy.trim() !== '' && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0
  const depth = ok ? cornerDepth(R, x, y) : 0
  const concentric = ok ? concentricRadius(R, x, y) : 0
  const use = (f: () => void) => { f(); trackPlayground('corner-fit') }
  // The display's bottom-left corner, R + 8 on a side, y growing upwards from the bottom edge.
  const side = Math.max(R, x, y) + 8
  return (
    <div class="playground">
      <div class="pickers">
        <DevicePicker
          devices={rounded}
          value={id}
          onChange={(next) => use(() => {
            const n = rounded.find((r) => r.id === next)!
            setId(next)
            setDx(String(n.margin ?? 16))
            setDy(String(n.bottom ?? 16))
          })}
        />
        {numberInput(dx, (v) => use(() => setDx(v)), 'From the side', d.unit)}
        {numberInput(dy, (v) => use(() => setDy(v)), 'From the bottom', d.unit)}
      </div>
      <div class="corner-fit">
        <svg class="corner" viewBox={`-2 -2 ${side + 4} ${side + 4}`} role="img" aria-label={`Bottom-left corner of radius ${num(R)}`}>
          <path class="d-display" d={`M0,0 V${side - R} A${R},${R} 0 0 0 ${R},${side} H${side}`} stroke-width="1.5" vector-effect="non-scaling-stroke" />
          {ok && (
            <path class={depth >= 0 ? 'd-frame' : 'd-frame cut'} stroke-width="1.5" vector-effect="non-scaling-stroke"
              d={concentric > 0
                ? `M${x},0 V${side - y - concentric} A${concentric},${concentric} 0 0 0 ${x + concentric},${side - y} H${side}`
                : `M${x},0 V${side - y} H${side}`} />
          )}
          {ok && <circle class={depth >= 0 ? 'd-point' : 'd-point cut'} cx={x} cy={side - y} r={Math.max(side / 80, 0.8)} />}
        </svg>
        <p class="result" aria-live="polite">
          {!ok ? 'Enter two distances of 0 or more.' : (
            <>
              On the {d.name} (corner radius {num(R)} {d.unit}), a square corner {num(x)} {d.unit} from the side and {num(y)} {d.unit} from the bottom {depth >= 0 ? `lies ${num(depth)} ${d.unit} inside the curve` : `is cut off by ${num(-depth)} ${d.unit}`}.
              {' '}A rounded corner of radius {num(concentric)} {d.unit} keeps an even gap to the display's corner.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

interface Reading {
  width: number
  height: number
  ratio: number
  insets: [number, number, number, number]
}

/** The measured device whose display, turned upright, is nearest the screen's size; a different pixel ratio counts 40 units. */
export function closest(devices: PlayDevice[], width: number, height: number, ratio: number): { device: PlayDevice; distance: number } {
  const [w, h] = [Math.min(width, height), Math.max(width, height)]
  return devices
    .map((device) => {
      const [dw, dh] = [Math.min(device.display.width, device.display.height), Math.max(device.display.width, device.display.height)]
      return { device, distance: Math.abs(dw - w) + Math.abs(dh - h) + 40 * Math.abs(device.perUnit - ratio) }
    })
    .sort((a, b) => a.distance - b.distance)[0]
}

export function ThisDevice({ devices }: { devices: PlayDevice[] }) {
  const [read, setRead] = useState<Reading | null>(null)
  useEffect(() => {
    const probe = document.querySelector('.safe-probe')
    const cs = probe ? getComputedStyle(probe) : null
    const px = (v: string | undefined) => Number.parseFloat(v ?? '0') || 0
    setRead({
      width: screen.width,
      height: screen.height,
      ratio: devicePixelRatio,
      insets: [px(cs?.paddingTop), px(cs?.paddingBottom), px(cs?.paddingLeft), px(cs?.paddingRight)],
    })
  }, [])
  const match = read && closest(devices, read.width, read.height, read.ratio)
  useEffect(() => {
    if (match) trackPlayground('this-device', match.device.id)
  }, [match?.device.id])
  return (
    <div class="playground">
      <div class="safe-probe" aria-hidden="true" />
      {!read ? <p class="result">This part reads your screen once the page's script runs.</p> : (
        <dl class="facts">
          <dt>Screen</dt><dd>{read.width} × {read.height} CSS pixels</dd>
          <dt>Pixel ratio</dt><dd>{num(read.ratio)}</dd>
          <dt>Safe-area insets</dt><dd>{read.insets.map(num).join(' / ')} (top / bottom / left / right)</dd>
          <dt>Closest measured device</dt>
          <dd>
            {match && match.distance <= 60
              ? <><a href={`/devices/${match.device.id}`}>{match.device.name}</a>: {num(match.device.display.width)} × {num(match.device.display.height)} {match.device.unit}, {num(match.device.perUnit)} pixels per {match.device.unit}</>
              : 'none within 60 points of this screen'}
          </dd>
        </dl>
      )}
    </div>
  )
}
