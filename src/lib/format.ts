// Labels and number formats, with no data: the pages and the islands share them.

import type { Corners, Device, Insets, Runtime } from './dataset.ts'

function versionKey(rt: Runtime): number[] {
  return rt.version.split('.').map(Number)
}

/** Orders runtimes oldest first: by version, then by build. */
export function compareRuntimes(a: Runtime, b: Runtime): number {
  const va = versionKey(a)
  const vb = versionKey(b)
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (va[i] ?? 0) - (vb[i] ?? 0)
    if (d) return d
  }
  return a.build < b.build ? -1 : a.build > b.build ? 1 : 0
}

export function runtimeLabel(rt: Runtime): string {
  const os = rt.os === 'Android' ? `Android ${rt.version}${rt.api ? ` (API ${rt.api})` : ''}` : `iOS ${rt.version}`
  return `${os}${rt.prerelease ? ' beta' : ''}`
}

export const SCREEN_LABEL: Record<string, string> = {
  main: 'Screen',
  closed: 'Closed (cover screen)',
  open: 'Open flat (inner screen)',
  'half-open': 'Half open (inner screen)',
  tent: 'Tent (cover screen)',
}

export function rotationLabel(r: { orientation: string; rotation: number }): string {
  return `${r.orientation}, ${r.rotation}°`
}

// ── numbers ─────────────────────────────────────────────────────────────────────────────

export function num(v: number): string {
  const s = (Math.round(v * 100) / 100).toString()
  return s.replace('-', '−')
}

export function size(s: { width: number; height: number }): string {
  return `${num(s.width)} × ${num(s.height)}`
}

/** Insets as top / bottom / left / right. */
export function insets(i: Insets): string {
  return `${num(i.top)} / ${num(i.bottom)} / ${num(i.left)} / ${num(i.right)}`
}

/** One number when all four corners agree, else top left, top right, bottom right, bottom left. */
export function corners(c: Corners): string {
  const v = [c.topLeft, c.topRight, c.bottomRight, c.bottomLeft]
  return v.every((x) => x === v[0]) ? num(v[0]) : v.map(num).join(', ')
}

export function scaleLabel(d: Device): string {
  const disp = Object.values(d.displays)[0]
  return d.platform === 'ios' ? `@${num(disp.scale ?? 0)}x` : `${num((disp.density ?? 0) / 160)} (${disp.density} dpi)`
}

export function unitName(d: Device): string {
  return d.unit === 'pt' ? 'points (pt)' : 'density-independent pixels (dp)'
}
