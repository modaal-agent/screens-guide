// SVG geometry for the device drawings: everything in the reading's window coordinates.

import type { Corners, Rect } from './dataset.ts'

/** A rectangle's outline with its own radius per corner, as circular arcs. */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: [number, number, number, number]): string {
  const max = Math.min(w, h) / 2
  const [tl, tr, br, bl] = r.map((v) => Math.max(0, Math.min(v, max)))
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : '',
    'Z',
  ].filter(Boolean).join(' ')
}

export function cornerTuple(c: Corners | null): [number, number, number, number] {
  return c ? [c.topLeft, c.topRight, c.bottomRight, c.bottomLeft] : [0, 0, 0, 0]
}

/** A capsule's corner radius: half its shorter side. */
export function capsuleRadius(f: Rect): number {
  return Math.min(f.width, f.height) / 2
}
