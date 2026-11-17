// Pixel snapping and corner fit, worked out on the measured devices.

import type { PlayDevice } from '../../islands/Playgrounds.tsx'
import type { Doc } from '../doc.ts'
import { DEVICES, compareRuntimes, headlineReading, num, runtimeLabel } from '../data.ts'
import { concentricRadius, cornerDepth } from '../geometry.ts'

/** What the playground islands need of each device: its scale, display, corner radius, margin and bottom inset. */
export function playDevices(): PlayDevice[] {
  return DEVICES.map((d) => {
    const head = headlineReading(d)
    const disp = Object.values(d.displays)[0]
    const margin = [...d.readings].sort((a, b) => compareRuntimes(b.runtime, a.runtime))
      .find((r) => r.contentMargin !== null && r.screen === head.screen && r.rotation === head.rotation)
    return {
      id: d.id,
      name: d.name,
      unit: d.unit,
      perUnit: d.platform === 'ios' ? disp.scale ?? 1 : (disp.density ?? 160) / 160,
      display: { width: disp.width, height: disp.height },
      radius: head.cornerRadii.profile?.bottomLeft || null,
      margin: margin?.contentMargin ?? null,
      bottom: head.safeAreaInsets?.bottom ?? null,
    }
  })
}

/** Every pixels-per-unit the dataset's devices have, with the devices that have it. */
export function pixelScales(): { perUnit: number; unit: string; names: string[] }[] {
  const scales = new Map<string, { perUnit: number; unit: string; names: string[] }>()
  for (const d of DEVICES) {
    const disp = Object.values(d.displays)[0]
    const perUnit = d.platform === 'ios' ? disp.scale ?? 1 : (disp.density ?? 160) / 160
    const key = `${d.unit} ${perUnit}`
    const entry = scales.get(key) ?? { perUnit, unit: d.unit, names: [] }
    entry.names.push(d.name)
    scales.set(key, entry)
  }
  return [...scales.values()]
}

/**
 * The corner fit on each device with a rounded display and a content margin: a square corner at the
 * margin from the side, once resting on the safe area's bottom edge and once as far from the
 * bottom as from the side.
 */
export function cornerFits() {
  return DEVICES.flatMap((d) => {
    const head = headlineReading(d)
    const radius = head.cornerRadii.profile?.bottomLeft ?? 0
    const marginReading = [...d.readings].reverse()
      .find((r) => r.contentMargin !== null && r.screen === head.screen && r.rotation === head.rotation)
    if (!radius || !marginReading || !head.safeAreaInsets) return []
    const margin = marginReading.contentMargin as number
    const bottom = head.safeAreaInsets.bottom
    return [{
      d, radius, margin, marginRuntime: marginReading.runtime, bottom,
      onSafe: cornerDepth(radius, margin, bottom),
      square: cornerDepth(radius, margin, margin),
      concentric: concentricRadius(radius, margin, margin),
    }]
  })
}

const depth = (v: number) => (v >= 0 ? `${num(v)} inside` : `cut off by ${num(-v)}`)

export function playgroundDoc(): Doc {
  return {
    path: '/playground',
    title: 'Pixel snapping and corner fit',
    description: "Where a thin line falls between pixels, and whether a frame's corner clears the display's rounded corner, worked out on the measured devices.",
    h1: 'Pixel snapping and corner fit',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: "Two calculations a layout needs the measurements for: where a line falls on the pixel grid, and how close a frame's corner may come to the display's rounded corner.",
      },
      { type: 'slot', name: 'this-device' },
      { type: 'h2', id: 'pixel-snapping', text: 'Pixel snapping' },
      {
        type: 'p',
        text: 'A line whose edges fall between pixels lights the pixels it partly covers in a blended colour, and looks soft. Put thin lines and edges on multiples of one pixel: one pixel is 1 ÷ scale in points, and 160 ÷ dpi in dp.',
      },
      { type: 'slot', name: 'pixel-snapping' },
      {
        type: 'table',
        head: ['Pixels per unit', 'One pixel', 'Devices'],
        rows: pixelScales().map((s) => ({
          cells: [`${num(s.perUnit)} px per ${s.unit}`, `${(1 / s.perUnit).toFixed(3)} ${s.unit}`, s.names.join(', ')],
        })),
        numeric: [0, 1],
      },
      { type: 'h2', id: 'corner-fit', text: 'Corner fit' },
      {
        type: 'p',
        text: "The display's rounded corner clips anything drawn under it. For a square corner at distances dx and dy from the two edges that meet at a corner of radius R, the corner lies R − √((R − dx)² + (R − dy)²) inside the curve; a negative value is how much the curve cuts off. A frame near a corner keeps an even gap to the curve when its own radius is the concentric radius, R minus its distance from the edges. Below, the frame stands at the system's content margin from the side, on each device's bottom-left corner.",
      },
      { type: 'slot', name: 'corner-fit' },
      {
        type: 'table',
        head: [
          'Device', 'Corner radius', 'Content margin', 'Bottom inset', "Corner on the safe area's bottom edge",
          'Corner at the margin from both edges', 'Concentric radius',
        ],
        rows: cornerFits().map((f) => ({
          cells: [
            `[${f.d.name}](/devices/${f.d.id})`,
            num(f.radius),
            { text: num(f.margin), note: runtimeLabel(f.marginRuntime) },
            num(f.bottom),
            depth(f.onSafe),
            depth(f.square),
            num(f.concentric),
          ],
        })),
        numeric: [1, 2, 3, 4, 5, 6],
      },
      {
        type: 'p',
        text: "Lengths are in each device's unit. The radius is the display profile's; the margin is SwiftUI's `contentMargins(for: .container)` as read on the runtime named.",
      },
    ],
  }
}
