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
 * side.
 */
export function concentricRadius(radius: number, gx: number, gy: number, width = Infinity, height = Infinity): number {
  return Math.min(Math.max(radius - Math.max(gx, gy), 0), Math.min(width, height) / 2)
}

/** Rounds to 2 decimals, the precision the dataset keeps. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
