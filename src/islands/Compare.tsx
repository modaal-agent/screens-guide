// The comparison: the chosen devices' windows to scale on top of each other, one point to one dp,
// aligned at the top left or the centre, each with its safe area dashed. Reads and writes
// `?ids=` once it hydrates; the server renders the default set.

import { useEffect, useState } from 'preact/hooks'
import { track } from '../lib/analytics.ts'
import { cornerTuple, roundedRectPath } from '../lib/drawing.ts'
import type { Corners, Insets, Size } from '../lib/dataset.ts'
import { insets as fmtInsets, size } from '../lib/format.ts'

export interface CompareEntry {
  id: string
  name: string
  unit: string
  window: Size
  insets: Insets | null
  corners: Corners | null
}

interface Props {
  entries: CompareEntry[]
  defaults: string[]
  max: number
}

/** The ids of `?ids=` that name a device, each once, at most `max`; the defaults when fewer than two remain. */
export function parseIds(search: string, known: string[], defaults: string[], max: number): string[] {
  const raw = new URLSearchParams(search).get('ids') ?? ''
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => known.includes(s)))].slice(0, max)
  return ids.length >= 2 ? ids : defaults
}

export default function Compare({ entries, defaults, max }: Props) {
  const [ids, setIds] = useState(defaults)
  const [align, setAlign] = useState<'top-left' | 'centre'>('top-left')
  const known = entries.map((e) => e.id)

  useEffect(() => {
    setIds(parseIds(location.search, known, defaults, max))
  }, [])

  function update(next: string[]) {
    setIds(next)
    history.replaceState(null, '', `?ids=${next.join(',')}`)
    track('compare_changed', { ids: next.join(',') })
  }

  const shown = ids.map((id) => entries.find((e) => e.id === id)!).filter(Boolean)
  const width = Math.max(...shown.map((s) => s.window.width))
  const height = Math.max(...shown.map((s) => s.window.height))
  const pad = Math.max(width, height) * 0.02
  const offset = (s: CompareEntry) =>
    align === 'centre' ? [(width - s.window.width) / 2, (height - s.window.height) / 2] : [0, 0]

  return (
    <div class="compare">
      <figure>
        <svg class="device" viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${height + 2 * pad}`} role="img" aria-label="Device outlines to scale">
          {shown.map((s, n) => {
            const [x, y] = offset(s)
            const i = s.insets
            return (
              <g class={`compare-${n + 1}`} transform={`translate(${x} ${y})`}>
                <path class="d-outline" d={roundedRectPath(0, 0, s.window.width, s.window.height, cornerTuple(s.corners))} stroke-width="2" vector-effect="non-scaling-stroke" />
                {i && <rect class="d-outline" x={i.left} y={i.top} width={s.window.width - i.left - i.right} height={s.window.height - i.top - i.bottom} stroke-dasharray="6 4" stroke-width="1" vector-effect="non-scaling-stroke" />}
              </g>
            )
          })}
        </svg>
      </figure>
      <ul class="legend">
        {shown.map((s, n) => (
          <li><i class={`swatch-${n + 1}`}></i><a href={`/devices/${s.id}`}>{s.name}</a>: {size(s.window)} {s.unit}{s.insets ? `, insets ${fmtInsets(s.insets)}` : ''}</li>
        ))}
      </ul>
      <fieldset class="compare-controls">
        <legend>Align</legend>
        <label><input type="radio" name="align" checked={align === 'top-left'} onChange={() => setAlign('top-left')} /> top left</label>
        <label><input type="radio" name="align" checked={align === 'centre'} onChange={() => setAlign('centre')} /> centre</label>
      </fieldset>
      <fieldset class="compare-controls">
        <legend>Devices, two to eight</legend>
        <div class="compare-picks">
          {entries.map((e) => {
            const on = ids.includes(e.id)
            return (
              <label>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={on ? ids.length <= 2 : ids.length >= max}
                  onChange={() => update(on ? ids.filter((x) => x !== e.id) : [...ids, e.id])}
                />
                {e.name}
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
