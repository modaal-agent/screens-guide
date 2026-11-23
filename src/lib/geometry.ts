// The arithmetic the playgrounds and the MCP server's check_layout share: pixel snapping, and
// the fit of a frame's corner against the display's rounded corner.

/** A length in pt or dp rounded to the nearest whole pixel at `scale` pixels per unit. */
export function snapToPixels(value: number, scale: number): number {
  return Math.round(value * scale) / scale
}

/** Whether `value` falls on a pixel boundary at `scale`, within `epsilon` pixels. */
export function onPixelGrid(value: number, scale: number, epsilon = 1e-6): boolean {
  const px = value * scale
  return Math.abs(px - Math.round(px)) <= epsilon
}

/**
 * How far a frame's square corner lies inside the display's rounded corner: positive inside,
 * negative when the display's curve cuts it off by that much. `dx` and `dy` are the corner's
 * distances from the two display edges that meet at the rounded corner, `radius` that corner's
 * radius. Beyond the curve (either distance at least the radius) the nearest boundary is a
 * straight edge, and the depth is the smaller distance.
 */
export function cornerDepth(radius: number, dx: number, dy: number): number {
  if (dx >= radius || dy >= radius) return Math.min(dx, dy)
  return radius - Math.hypot(radius - dx, radius - dy)
}

/**
 * The radius that keeps an even gap between a rectangle's corner and a container corner of
 * `radius`, for a rectangle `gx` and `gy` from that corner's two edges: SwiftUI's
 * concentricCornerRadii, R − max(gx, gy), never below 0 nor above half the rectangle's shorter
 * side. A rectangle reaching past an edge counts as on it, so the radius never exceeds R.
 */
export function concentricRadius(radius: number, gx: number, gy: number, width = Infinity, height = Infinity): number {
  return Math.min(Math.max(radius - Math.max(gx, gy, 0), 0), Math.min(width, height) / 2)
}

/** Rounds to 2 decimals, the precision the dataset keeps. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// ── check_layout's findings (spec 002 §2.3) ──────────────────────────────────────────────
// Every rectangle is in window coordinates, origin at the window's top left.

export interface Rect { x: number; y: number; width: number; height: number }
export interface Edges { top: number; bottom: number; left: number; right: number }
export type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'

/** The overlap of two rectangles, or null when they share no area. */
export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null
}

/** How far a frame reaches past each window edge; null when it lies inside. */
export function overhang(f: Rect, window: { width: number; height: number }): Edges | null {
  const e = {
    top: Math.max(0, -f.y),
    bottom: Math.max(0, f.y + f.height - window.height),
    left: Math.max(0, -f.x),
    right: Math.max(0, f.x + f.width - window.width),
  }
  return e.top || e.bottom || e.left || e.right ? e : null
}

/** How deep a frame reaches into each safe-area inset, by edge; only the edges it enters. */
export function insetDepths(f: Rect, insets: Edges, window: { width: number; height: number }): Partial<Edges> {
  const out: Partial<Edges> = {}
  const clip = (v: number, max: number) => Math.min(Math.max(v, 0), max)
  const top = clip(insets.top - f.y, f.height)
  const bottom = clip(f.y + f.height - (window.height - insets.bottom), f.height)
  const left = clip(insets.left - f.x, f.width)
  const right = clip(f.x + f.width - (window.width - insets.right), f.width)
  if (insets.top > 0 && top > 0) out.top = top
  if (insets.bottom > 0 && bottom > 0) out.bottom = bottom
  if (insets.left > 0 && left > 0) out.left = left
  if (insets.right > 0 && right > 0) out.right = right
  return out
}

/**
 * The depth of a frame's corner of radius `r` inside a display corner of radius `radius`, for a
 * frame `dx` and `dy` from the two edges that meet there: positive inside, negative by how much the
 * display's curve cuts it off. With `r` 0 it is cornerDepth.
 */
export function roundedCornerDepth(radius: number, dx: number, dy: number, r = 0): number {
  const cx = dx + r
  const cy = dy + r
  const curve = cx < radius && cy < radius ? radius - Math.hypot(radius - cx, radius - cy) - r : Infinity
  return Math.min(dx, dy, curve)
}

/** A frame's distances from the two window edges at each corner. */
export function cornerDistances(f: Rect, window: { width: number; height: number }): Record<Corner, [number, number]> {
  const right = window.width - (f.x + f.width)
  const bottom = window.height - (f.y + f.height)
  return { topLeft: [f.x, f.y], topRight: [right, f.y], bottomRight: [right, bottom], bottomLeft: [f.x, bottom] }
}

/** Whether a frame crosses a fold: a band with area, or a line of zero width or height. */
export function crossesFold(f: Rect, fold: Rect): boolean {
  if (fold.width > 0 && fold.height > 0) return intersection(f, fold) !== null
  if (fold.width === 0) {
    return f.x < fold.x && f.x + f.width > fold.x && f.y < fold.y + fold.height && f.y + f.height > fold.y
  }
  return f.y < fold.y && f.y + f.height > fold.y && f.x < fold.x + fold.width && f.x + f.width > fold.x
}
