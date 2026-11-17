// The rows of a device's reading tables, shared by the HTML pages and their Markdown copies.

import type { Device, Reading, Rect } from './dataset.ts'
import { corners, insets, num, size } from './format.ts'

export interface Cell {
  text: string | null
  reason?: string
  source?: string
}

export interface Row {
  label: string
  /** The field path whose `missing` reason a null value shows. */
  path: string
  only?: 'ios' | 'android' | 'foldable'
  cell: (r: Reading, d: Device) => Cell
}

function rect(f: Rect): string {
  return `${size(f)} at ${num(f.x)}, ${num(f.y)}`
}

function reasonOf(r: Reading, ...paths: string[]): string | undefined {
  for (const p of paths) if (r.missing[p]) return r.missing[p]
  return undefined
}

function value(r: Reading, path: string, text: string | null | undefined, source?: string): Cell {
  if (text === null || text === undefined) return { text: null, reason: reasonOf(r, path) }
  return source ? { text, source } : { text }
}

export const ROWS: Row[] = [
  { label: 'Window', path: 'window', cell: (r, d) => ({ text: `${size(r.window)} ${d.unit}` }) },
  { label: 'Pixels', path: 'pixels', cell: (r) => ({ text: `${size(r.pixels)} px` }) },
  {
    label: 'Safe-area insets (top / bottom / left / right)', path: 'safeAreaInsets',
    cell: (r) => value(r, 'safeAreaInsets', r.safeAreaInsets && insets(r.safeAreaInsets)),
  },
  {
    label: 'System bar insets', path: 'systemBarInsets', only: 'android',
    cell: (r) => value(r, 'systemBarInsets', r.systemBarInsets && insets(r.systemBarInsets)),
  },
  {
    label: 'Display cutout insets', path: 'cutoutInsets', only: 'android',
    cell: (r) => value(r, 'cutoutInsets', r.cutoutInsets && insets(r.cutoutInsets)),
  },
  {
    label: 'Corner radii, display profile', path: 'cornerRadii.profile',
    cell: (r) => value(r, 'cornerRadii.profile', r.cornerRadii.profile && corners(r.cornerRadii.profile), r.cornerRadii.profile?.source),
  },
  {
    label: 'Corner radii, measured', path: 'cornerRadii.measured',
    cell: (r) => value(r, 'cornerRadii.measured', r.cornerRadii.measured && corners(r.cornerRadii.measured), r.cornerRadii.measured?.source),
  },
  {
    label: 'Size classes (width × height)', path: 'sizeClass',
    cell: (r) => value(r, 'sizeClass', r.sizeClass && `${r.sizeClass.width} × ${r.sizeClass.height}`),
  },
  {
    label: 'Window size classes V2', path: 'sizeClassV2', only: 'android',
    cell: (r) => value(r, 'sizeClassV2', r.sizeClassV2 && `${r.sizeClassV2.width} × ${r.sizeClassV2.height}`),
  },
  {
    label: 'Status bar', path: 'statusBar',
    cell: (r) => {
      const s = r.statusBar
      if (!s) return value(r, 'statusBar', null)
      if (s.frame) return { text: `${s.placement}, ${rect(s.frame)}` }
      const why = reasonOf(r, 'statusBar.frame')
      return why ? { text: s.placement, reason: why } : { text: s.placement }
    },
  },
  {
    label: 'Navigation bar, inline title (top, height)', path: 'navigationBar.inline',
    cell: (r) => value(r, 'navigationBar.inline', r.navigationBar.inline && `${num(r.navigationBar.inline.top)}, ${num(r.navigationBar.inline.height)}`),
  },
  {
    label: 'Navigation bar, large title (top, height)', path: 'navigationBar.large', only: 'ios',
    cell: (r) => value(r, 'navigationBar.large', r.navigationBar.large && `${num(r.navigationBar.large.top)}, ${num(r.navigationBar.large.height)}`),
  },
  {
    label: 'Tab bar', path: 'tabBar',
    cell: (r) => {
      const t = r.tabBar
      if (!t) return value(r, 'tabBar', null)
      const side = t.sideGap === null ? '' : `, ${num(t.sideGap)} from the sides with five tabs`
      return { text: `${t.style}, ${rect(t.frame)}, ${num(t.bottom)} above the bottom edge${side}` }
    },
  },
  {
    label: 'Content margin', path: 'contentMargin', only: 'ios',
    cell: (r) => value(r, 'contentMargin', r.contentMargin === null ? null : num(r.contentMargin)),
  },
  {
    label: 'Reserved regions', path: 'regions',
    cell: (r) => {
      if (!r.regions) return value(r, 'regions', null)
      if (!r.regions.length) return { text: 'none' }
      return { text: r.regions.map((g) => `${g.kind} ${rect(g.frame)}${g.active ? '' : ' (inactive)'}`).join('; ') }
    },
  },
  {
    label: 'Fold', path: 'fold', only: 'foldable',
    cell: (r) => {
      const f = r.fold
      if (!f) {
        const why = reasonOf(r, 'fold')
        return why ? { text: null, reason: why } : { text: 'none' }
      }
      const margin = f.margin === null ? '' : `, ${num(f.margin)} margins`
      return { text: `${f.axis}, ${rect(f.frame)}${margin}, ${f.separates ? 'separates the halves' : 'does not separate'}` }
    },
  },
  {
    label: 'Measured', path: 'measured',
    cell: (r) => ({ text: `${r.measured.date} on the ${r.measured.on}; runs ${r.measured.runs.join(', ')}` }),
  },
]

export function rowsFor(d: Device): Row[] {
  return ROWS.filter((row) => !row.only || row.only === d.platform || (row.only === 'foldable' && d.kind === 'foldable'))
}
