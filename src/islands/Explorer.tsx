// The explorer on a device page: platform, device, screen, orientation and runtime pickers, the
// drawing of the chosen reading, and its table, whose rows highlight their part of the drawing.
// Rendered on the server at the device's current reading; the pickers work once it hydrates.

import { useMemo, useState } from 'preact/hooks'
import Drawing, { layerOf, type Layer } from '../components/Drawing.tsx'
import { track } from '../lib/analytics.ts'
import type { Device, Reading } from '../lib/dataset.ts'
import { SCREEN_LABEL, compareRuntimes, rotationLabel, runtimeLabel } from '../lib/format.ts'
import { rowsFor } from '../lib/rows.ts'

export interface DeviceLink {
  id: string
  name: string
  platform: 'ios' | 'android'
}

interface Props {
  device: Device
  devices: DeviceLink[]
}

const LAYERS: [Layer, string][] = [
  ['insets', 'Safe area'],
  ['status', 'Status bar'],
  ['nav', 'Navigation bar'],
  ['tab', 'Tab bar'],
  ['regions', 'Reserved regions'],
  ['fold', 'Fold'],
  ['margins', 'Content margins'],
]

const PLATFORM = { ios: 'iOS', android: 'Android' }

function pick(d: Device, screen: string, rotation: number, build: string): Reading | undefined {
  return d.readings.find((r) => r.screen === screen && r.rotation === rotation && r.runtime.build === build)
}

export default function Explorer({ device: d, devices }: Props) {
  const screens = d.screens ? d.screens.map((s) => s.id) : ['main']
  const first = d.readings.find((r) => r.runtime.build === d.current.build && r.screen === screens[0] && r.rotation === 0) ??
    d.readings.find((r) => r.runtime.build === d.current.build)!
  const [platform, setPlatform] = useState(d.platform)
  const [screen, setScreen] = useState<string>(first.screen)
  const [rotation, setRotation] = useState<number>(first.rotation)
  const [build, setBuild] = useState(first.runtime.build)
  const [hidden, setHidden] = useState<ReadonlySet<Layer>>(new Set())
  const [highlight, setHighlight] = useState<Layer | null>(null)

  const rotations = useMemo(
    () => [...new Map(d.readings.filter((r) => r.screen === screen).map((r) => [r.rotation, r])).values()].sort((a, b) => a.rotation - b.rotation),
    [d, screen],
  )
  const builds = useMemo(
    () => d.readings.filter((r) => r.screen === screen && r.rotation === rotation).map((r) => r.runtime).sort(compareRuntimes),
    [d, screen, rotation],
  )
  const reading = pick(d, screen, rotation, build) ?? first

  // A change keeps the other pickers where it can: the same rotation and build if the new screen has them.
  function choose(next: { screen?: string; rotation?: number; build?: string }) {
    const s = next.screen ?? screen
    const forScreen = d.readings.filter((r) => r.screen === s)
    const rot = next.rotation ?? (forScreen.some((r) => r.rotation === rotation) ? rotation : Math.min(...forScreen.map((r) => r.rotation)))
    const forRot = forScreen.filter((r) => r.rotation === rot)
    const wanted = next.build ?? build
    const b = forRot.find((r) => r.runtime.build === wanted) ?? forRot.find((r) => r.runtime.build === d.current.build) ??
      forRot.sort((x, y) => compareRuntimes(y.runtime, x.runtime))[0]
    setScreen(s)
    setRotation(rot)
    setBuild(b.runtime.build)
    track('explorer_changed', { device: d.id, screen: s, orientation: b.orientation, runtime: b.runtime.build })
  }

  function goTo(id: string) {
    if (id && id !== d.id) location.assign(`/devices/${id}`)
  }

  const rows = rowsFor(d)
  return (
    <div class="explorer">
      <div class="pickers">
        <label>Platform
          <select value={platform} onChange={(e) => setPlatform((e.target as HTMLSelectElement).value as Device['platform'])}>
            {(['ios', 'android'] as const).map((p) => <option value={p}>{PLATFORM[p]}</option>)}
          </select>
        </label>
        <label>Device
          <select value={platform === d.platform ? d.id : ''} onChange={(e) => goTo((e.target as HTMLSelectElement).value)}>
            {platform !== d.platform && <option value="">Choose a device</option>}
            {devices.filter((x) => x.platform === platform).map((x) => <option value={x.id}>{x.name}</option>)}
          </select>
        </label>
        {screens.length > 1 && (
          <label>Screen
            <select value={screen} onChange={(e) => choose({ screen: (e.target as HTMLSelectElement).value })}>
              {screens.map((s) => <option value={s}>{SCREEN_LABEL[s]}</option>)}
            </select>
          </label>
        )}
        <label>Orientation
          <select value={String(rotation)} onChange={(e) => choose({ rotation: Number((e.target as HTMLSelectElement).value) })}>
            {rotations.map((r) => <option value={String(r.rotation)}>{rotationLabel(r)}</option>)}
          </select>
        </label>
        <label>Runtime
          <select value={build} onChange={(e) => choose({ build: (e.target as HTMLSelectElement).value })}>
            {builds.map((rt) => <option value={rt.build}>{`${runtimeLabel(rt)} (${rt.build})${rt.build === d.current.build ? ', current' : ''}`}</option>)}
          </select>
        </label>
      </div>
      <div class="explorer-body">
        <figure>
          <Drawing name={d.name} unit={d.unit} reading={reading} id={`explorer-${d.id}`} highlight={highlight} hidden={hidden} />
          <figcaption>{SCREEN_LABEL[reading.screen]}, {rotationLabel(reading)}, {runtimeLabel(reading.runtime)}</figcaption>
          <fieldset class="layers">
            <legend>Layers</legend>
            {LAYERS.map(([l, label]) => (
              <label class={`layer-${l}`}>
                <input
                  type="checkbox"
                  checked={!hidden.has(l)}
                  onChange={() => {
                    const next = new Set(hidden)
                    if (next.has(l)) next.delete(l)
                    else next.add(l)
                    setHidden(next)
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </figure>
        <div class="table-wrap">
          <table class="explorer-table">
            <thead><tr><th scope="col">Field</th><th scope="col">{`${runtimeLabel(reading.runtime)}, ${reading.orientation}`}</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const c = row.cell(reading, d)
                const layer = layerOf(row.path)
                return (
                  <tr
                    tabIndex={layer ? 0 : undefined}
                    class={layer && layer === highlight ? 'hl' : undefined}
                    onMouseEnter={() => setHighlight(layer)}
                    onMouseLeave={() => setHighlight(null)}
                    onFocus={() => setHighlight(layer)}
                    onBlur={() => setHighlight(null)}
                  >
                    <th scope="row">{row.label}</th>
                    <td class="num">
                      {c.text ?? '—'}
                      {c.reason && <span class="reason"> {c.reason}</span>}
                      {c.source && <span class="source">{c.source}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
