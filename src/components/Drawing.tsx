// One reading drawn to scale in its window coordinates: the display's outline with its corners,
// the safe-area insets, the status, navigation and tab bars, the reserved regions, the fold and
// the content margins. The explorer passes the layer to highlight and the layers to hide.

import type { Reading } from '../lib/dataset.ts'
import { capsuleRadius, cornerTuple, roundedRectPath } from '../lib/drawing.ts'
import { insets as fmtInsets, runtimeLabel, size } from '../lib/format.ts'

export type Layer = 'window' | 'insets' | 'status' | 'nav' | 'tab' | 'regions' | 'fold' | 'margins'

/** The drawing layer a table row's field shows. */
export function layerOf(path: string): Layer | null {
  if (path === 'window' || path === 'pixels' || path.startsWith('cornerRadii')) return 'window'
  if (path.endsWith('Insets')) return 'insets'
  if (path === 'statusBar') return 'status'
  if (path.startsWith('navigationBar')) return 'nav'
  if (path === 'tabBar') return 'tab'
  if (path === 'regions') return 'regions'
  if (path === 'fold') return 'fold'
  if (path === 'contentMargin') return 'margins'
  return null
}

interface Props {
  name: string
  unit: string
  reading: Reading
  /** Unique on the page: the clip path's id. */
  id: string
  highlight?: Layer | null
  hidden?: ReadonlySet<Layer>
}

export default function Drawing({ name, unit, reading: r, id, highlight = null, hidden }: Props) {
  const w = r.window.width
  const h = r.window.height
  const pad = Math.max(w, h) * 0.02
  const clip = `clip-${id}`.replace(/[^a-zA-Z0-9-]/g, '-')
  const outline = roundedRectPath(0, 0, w, h, cornerTuple(r.cornerRadii.profile ?? r.cornerRadii.measured))
  const i = r.safeAreaInsets
  const nav = r.navigationBar.inline
  const tab = r.tabBar
  const margin = r.contentMargin
  const fold = r.fold
  const shown = (l: Layer) => !hidden?.has(l)
  const hl = (l: Layer, cls: string) => (highlight === l ? `${cls} hl` : cls)
  const title = `${name}, ${runtimeLabel(r.runtime)}, ${r.orientation}: ${size(r.window)} ${unit}${i ? `, insets ${fmtInsets(i)}` : ''}`
  return (
    <svg class="device" viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <clipPath id={clip}><path d={outline} /></clipPath>
      </defs>
      <path class={hl('window', 'd-display')} d={outline} stroke-width="1.5" vector-effect="non-scaling-stroke" />
      <g clip-path={`url(#${clip})`}>
        {i && shown('insets') && (
          <path class={hl('insets', 'd-inset')} d={`M0,0 H${w} V${h} H0 Z M${i.left},${i.top} V${h - i.bottom} H${w - i.right} V${i.top} Z`} fill-rule="evenodd" />
        )}
        {r.statusBar?.frame && shown('status') && (
          <rect class={hl('status', 'd-bar')} x={r.statusBar.frame.x} y={r.statusBar.frame.y} width={r.statusBar.frame.width} height={r.statusBar.frame.height} vector-effect="non-scaling-stroke" />
        )}
        {nav && shown('nav') && <rect class={hl('nav', 'd-bar')} x="0" y={nav.top} width={w} height={nav.height} vector-effect="non-scaling-stroke" />}
        {tab && shown('tab') && (
          <rect class={hl('tab', 'd-bar')} x={tab.frame.x} y={tab.frame.y} width={tab.frame.width} height={tab.frame.height}
            rx={tab.style === 'capsule' ? capsuleRadius(tab.frame) : 0} vector-effect="non-scaling-stroke" />
        )}
        {shown('regions') && (r.regions ?? []).map((g, n) => (
          <rect key={n} class={hl('regions', 'd-region')} x={g.frame.x} y={g.frame.y} width={g.frame.width} height={g.frame.height} opacity={g.active ? 1 : 0.45} />
        ))}
        {fold && shown('fold') && (fold.frame.width > 0 && fold.frame.height > 0
          ? <rect class={hl('fold', 'd-fold')} x={fold.frame.x} y={fold.frame.y} width={fold.frame.width} height={fold.frame.height} />
          : <line class={hl('fold', 'd-fold')} x1={fold.frame.x} y1={fold.frame.y} x2={fold.frame.x + fold.frame.width} y2={fold.frame.y + fold.frame.height} stroke-width="3" vector-effect="non-scaling-stroke" />)}
        {i && margin !== null && margin > 0 && shown('margins') && (
          <g class={hl('margins', 'd-margin')} stroke-width="1">
            <line x1={i.left + margin} y1={i.top} x2={i.left + margin} y2={h - i.bottom} vector-effect="non-scaling-stroke" />
            <line x1={w - i.right - margin} y1={i.top} x2={w - i.right - margin} y2={h - i.bottom} vector-effect="non-scaling-stroke" />
          </g>
        )}
        {i && shown('insets') && (
          <rect class={hl('insets', 'd-safe')} x={i.left} y={i.top} width={w - i.left - i.right} height={h - i.top - i.bottom} stroke-width="1.5" vector-effect="non-scaling-stroke" />
        )}
      </g>
    </svg>
  )
}
