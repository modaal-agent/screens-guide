// The guide: what each measurement means and how a layout uses it, with the dataset's numbers.

import type { Device, Reading } from '../dataset.ts'
import type { Doc } from '../doc.ts'
import {
  DEVICES, SCREEN_LABEL, compareRuntimes, corners, currentReadings, device, headlineReading, insets, num,
  otherOrientation, runtimeLabel, scaleLabel, size,
} from '../data.ts'

const link = (d: Device) => `[${d.name}](/devices/${d.id})`

function latest(d: Device, pick: (r: Reading) => unknown): Reading | undefined {
  return [...d.readings].sort((a, b) => compareRuntimes(b.runtime, a.runtime)).find((r) => pick(r) !== null && pick(r) !== undefined)
}

export function guideDoc(): Doc {
  const iphone17 = headlineReading(device('iphone-17'))
  const iphone17Scale = device('iphone-17').displays.main.scale ?? 1
  const pixel8 = headlineReading(device('pixel-8'))
  const pixel8Density = device('pixel-8').displays.main.density ?? 160
  const pixel8StatusPx = Math.round((pixel8.safeAreaInsets?.top ?? 0) * pixel8Density / 160)

  // The readings where the display profile's corner radius and the measured one differ, one per runtime version.
  const cornerPairs = DEVICES.flatMap((d) => {
    const seen = new Set<string>()
    return d.readings
      .filter((r) => r.rotation === 0 && r.cornerRadii.profile && r.cornerRadii.measured)
      .filter((r) => corners(r.cornerRadii.profile!) !== corners(r.cornerRadii.measured!))
      .filter((r) => !seen.has(r.runtime.version) && !!seen.add(r.runtime.version))
      .map((r) => ({ d, r }))
  })

  // The bars on the device read on every runtime, in portrait.
  const barDevice = device('iphone-16')
  const barRows = barDevice.readings
    .filter((r) => r.screen === 'main' && r.rotation === 0)
    .sort((a, b) => compareRuntimes(a.runtime, b.runtime))

  const foldables = DEVICES.filter((d) => d.kind === 'foldable')
  const bar = (b: { top: number; height: number } | null) => (b ? `${num(b.top)}, ${num(b.height)}` : '—')
  const sizeClass = (x?: Reading) => (x?.sizeClass ? `${x.sizeClass.width} × ${x.sizeClass.height}` : '—')

  return {
    path: '/guide',
    title: 'Points, pixels, safe areas and corner radii: a guide',
    description: 'How screen sizes, pixel scales, corner radii, safe-area insets, system bars, margins, size classes and folds work on iOS and Android, with the measured numbers.',
    h1: 'A guide to the numbers',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: 'What each measurement means and how a layout uses it, on iOS and Android. Every number here is a reading from the dataset; the device pages have every runtime.',
      },
      {
        type: 'toc',
        links: [
          ['Points, pixels and dp', '#units'], ['Corner radii', '#corners'], ['Safe areas', '#safe-area'],
          ['System bars', '#bars'], ['Margins', '#margins'], ['Size classes', '#size-classes'], ['Foldables', '#foldables'],
        ],
      },

      { type: 'h2', id: 'units', text: 'Points, pixels and dp' },
      {
        type: 'p',
        text: `iOS lays out in points. The iPhone 17's window is ${size(iphone17.window)} pt and ${size(iphone17.pixels)} px: ${num(iphone17Scale)} pixels per point. Android lays out in dp, and one dp is dpi ÷ 160 pixels. The Pixel 8 has ${pixel8Density} dpi, so its ${size(pixel8.pixels)} px window is ${size(pixel8.window)} dp, and its ${pixel8StatusPx} px status bar inset is ${num(pixel8.safeAreaInsets?.top ?? 0)} dp. Android sizes are rarely whole dp; the dataset keeps two decimals.`,
      },
      {
        type: 'table',
        head: ['Device', 'Window', 'Pixels', 'Scale'],
        rows: DEVICES.map((d) => {
          const r = headlineReading(d)
          return { cells: [link(d), `${size(r.window)} ${d.unit}`, size(r.pixels), scaleLabel(d)] }
        }),
        numeric: [1, 2, 3],
      },

      { type: 'h2', id: 'corners', text: 'Corner radii' },
      {
        type: 'p',
        text: "The display's rounded corners clip what is drawn under them. Two readings give a radius: the display profile the simulator or emulator draws the display from, and, on iOS, SwiftUI's `concentricCornerRadii` for a view that fills the window (on iOS 18.6, the corners of the view behind a full-screen sheet). They agree on the iPhones; where they differ, both are below. The [corner fit](/playground#corner-fit) works out how close a frame's corner can come.",
      },
      {
        type: 'table',
        head: ['Device', 'Runtime', 'Display profile', 'Measured'],
        rows: cornerPairs.map(({ d, r }) => ({
          cells: [link(d), runtimeLabel(r.runtime), corners(r.cornerRadii.profile!), corners(r.cornerRadii.measured!)],
        })),
        numeric: [2, 3],
      },

      { type: 'h2', id: 'safe-area', text: 'Safe areas' },
      {
        type: 'p',
        text: "The safe-area insets are where the system draws the status bar, the home indicator or gesture bar, the cutout and side columns. Lay text, controls and tap targets inside the safe area, and let backgrounds run to the window's edges. On Android the safe area is `WindowInsets.safeDrawing`: per side, the larger of the system bars and the cutout. Insets are top / bottom / left / right, from each device's current reading.",
      },
      {
        type: 'table',
        head: ['Device', 'Screen', 'Natural orientation', 'Turned'],
        rows: DEVICES.flatMap((d) => (d.screens ? d.screens.map((s) => s.id) : ['main']).flatMap((screen) => {
          const first = currentReadings(d).filter((r) => r.screen === screen).sort((a, b) => a.rotation - b.rotation)[0]
          if (!first) return []
          const turned = otherOrientation(d, first)
          return [{
            cells: [
              link(d), SCREEN_LABEL[screen],
              first.safeAreaInsets ? insets(first.safeAreaInsets) : '—',
              turned?.safeAreaInsets ? insets(turned.safeAreaInsets) : '—',
            ],
          }]
        })),
        numeric: [2, 3],
      },

      { type: 'h2', id: 'bars', text: 'System bars' },
      {
        type: 'p',
        text: `iOS's navigation bar and tab bar changed shape between iOS 18 and iOS 26. The ${barDevice.name}, read on every runtime from iOS 18.6, in portrait (top edge and height; the tab bar's gap to the window's bottom edge):`,
      },
      {
        type: 'table',
        head: ['Runtime', 'Inline title bar', 'Large title bar', 'Tab bar'],
        rows: barRows.map((r) => ({
          beta: r.runtime.prerelease,
          cells: [
            `${runtimeLabel(r.runtime)} \`${r.runtime.build}\``,
            bar(r.navigationBar.inline),
            bar(r.navigationBar.large),
            r.tabBar ? `${r.tabBar.style}, ${num(r.tabBar.height)} tall, ${num(r.tabBar.bottom)} above the bottom edge` : '—',
          ],
        })),
        numeric: [1, 2, 3],
      },
      {
        type: 'p',
        text: `On Android, Material 3's top app bar sits below the status bar inset, and its colour runs up under the status bar; the navigation bar's background runs to the bottom edge. On the Pixel 8 in portrait the top app bar is ${num(pixel8.navigationBar.inline?.height ?? 0)} dp below a ${num(pixel8.navigationBar.inline?.top ?? 0)} dp inset, and the navigation bar is ${num(pixel8.tabBar?.height ?? 0)} dp tall including the ${num(pixel8.safeAreaInsets?.bottom ?? 0)} dp bottom inset.`,
      },

      { type: 'h2', id: 'margins', text: 'Margins' },
      {
        type: 'p',
        text: "SwiftUI's `contentMargins(for: .container)` is the system's margin between a view that spans the window and its content, on iOS 27.1 and later. Per device, from its newest reading in its natural orientation:",
      },
      {
        type: 'table',
        head: ['Device', 'Content margin', 'Runtime'],
        rows: DEVICES.filter((d) => d.platform === 'ios').flatMap((d) => {
          const r = latest(d, (x) => (x.rotation === 0 ? x.contentMargin : null))
          return r ? [{ cells: [link(d), `${num(r.contentMargin ?? 0)} pt`, runtimeLabel(r.runtime)] }] : []
        }),
        numeric: [1],
      },

      { type: 'h2', id: 'size-classes', text: 'Size classes' },
      {
        type: 'p',
        text: "iOS reports a horizontal and a vertical size class, each compact or regular. Android's window size classes come from the window's size, not the device: compact, medium and expanded, and in their V2 form large and extra-large widths too. Width × height, from each device's current reading:",
      },
      {
        type: 'table',
        head: ['Device', 'Natural orientation', 'Turned'],
        rows: DEVICES.map((d) => {
          const r = headlineReading(d)
          return { cells: [link(d), sizeClass(r), sizeClass(otherOrientation(d, r))] }
        }),
      },

      { type: 'h2', id: 'foldables', text: 'Foldables' },
      {
        type: 'p',
        text: 'A foldable shows its cover screen closed and its inner screen open. The fold is reported only on the inner screen: on the iPhone Duo as a band with margins either side, on Android as a line. It separates the content into two halves only when the device is half open.',
      },
      {
        type: 'table',
        head: ['Device', 'Screen', 'Window', 'Fold'],
        rows: foldables.flatMap((d) => (d.screens ?? []).flatMap((s) => {
          const r = currentReadings(d).filter((x) => x.screen === s.id).sort((a, b) => a.rotation - b.rotation)[0]
          if (!r) return []
          const f = r.fold
          const fold = f
            ? `${f.axis}, ${size(f.frame)} at ${num(f.frame.x)}, ${num(f.frame.y)}${f.margin !== null ? `, ${num(f.margin)} margins` : ''}; ${f.separates ? 'separates' : 'does not separate'}`
            : '—'
          return [{ cells: [link(d), SCREEN_LABEL[s.id], `${size(r.window)} ${d.unit}`, fold] }]
        })),
        numeric: [2, 3],
      },
    ],
  }
}
