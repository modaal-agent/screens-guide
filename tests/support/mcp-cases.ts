// The tool calls of the first live test of /mcp, 2026-11-23 (spec 002 §5.1), with the outcome each
// should have after the fixes of spec 002 D13 to D18. tests/mcp.test.ts replays them on the Worker;
// a later eval script can send the same calls to https://screens.guide/mcp. The file holds data and
// one matcher only, so a plain Node script can import it.

export interface ToolCase {
  tool: string
  args: Record<string, unknown>
  /** `ok`: a result without `isError`; `error`: a result with `isError`, its text holding `error`. */
  expect: 'ok' | 'error'
  error?: string
  /** A partial of `structuredContent`; see `matches`. */
  match?: Record<string, unknown>
}

const grid = (n: number) => Array.from({ length: n }, (_, i) => ({
  name: `f${i}`, x: 16 + (i % 10) * 37, y: 120 + Math.floor(i / 10) * 30, width: 30, height: 25,
}))

const PIXEL_BUILD = 'BE2A.250530.026.F3'

export const LIVE_CASES: ToolCase[] = [
  // list_devices
  { tool: 'list_devices', args: {}, expect: 'ok' },
  { tool: 'list_devices', args: { platform: 'ios' }, expect: 'ok' },
  { tool: 'list_devices', args: { platform: 'android' }, expect: 'ok' },
  { tool: 'list_devices', args: { kind: 'phone' }, expect: 'ok' },
  { tool: 'list_devices', args: { kind: 'tablet' }, expect: 'ok' },
  { tool: 'list_devices', args: { kind: 'foldable' }, expect: 'ok' },
  { tool: 'list_devices', args: { platform: 'android', kind: 'foldable' }, expect: 'ok', match: { devices: [{ id: 'pixel-fold' }, { id: 'pixel-9-pro-fold' }] } },
  { tool: 'list_devices', args: { platform: 'iOS' }, expect: 'error', error: 'arguments.platform must be one of "ios", "android"' },

  // get_device
  { tool: 'get_device', args: { id: 'iphone-17' }, expect: 'ok', match: { runtime: { build: '24A434' } } },
  {
    tool: 'get_device', args: { id: 'iphone-17', orientation: 'landscape' }, expect: 'ok',
    match: { readings: [{ orientation: 'landscape', cornerRadii: { measured: null }, missing: { 'cornerRadii.measured': 'not read in this orientation' } }] },
  },
  { tool: 'get_device', args: { id: 'ipad-pro-13-m5', orientation: 'landscape' }, expect: 'ok', match: { readings: [{ window: { width: 1376 } }] } },
  { tool: 'get_device', args: { id: 'pixel-8' }, expect: 'ok', match: { runtime: { build: PIXEL_BUILD } } },
  { tool: 'get_device', args: { id: 'pixel-8', rotation: 180 }, expect: 'ok', match: { readings: [{ rotation: 180, safeAreaInsets: { bottom: 50.29 } }] } },
  { tool: 'get_device', args: { id: 'pixel-fold', screen: 'closed' }, expect: 'ok', match: { readings: [{ screen: 'closed' }] } },
  { tool: 'get_device', args: { id: 'pixel-fold', screen: 'open', orientation: 'portrait' }, expect: 'ok', match: { readings: [{ screen: 'open', orientation: 'portrait' }] } },
  { tool: 'get_device', args: { id: 'pixel-fold', screen: 'half-open', rotation: 0 }, expect: 'ok', match: { readings: [{ screen: 'half-open', fold: { frame: { x: 420.57 } } }] } },
  { tool: 'get_device', args: { id: 'pixel-fold', screen: 'tent' }, expect: 'error', error: 'Its screens: closed, open, half-open' },
  { tool: 'get_device', args: { id: 'iphone-duo', screen: 'tent' }, expect: 'ok', match: { runtime: { build: '24A94232' }, readings: [{ screen: 'tent' }] } },
  { tool: 'get_device', args: { id: 'iphone-duo', screen: 'half-open', rotation: 180 }, expect: 'ok', match: { readings: [{ screen: 'half-open', rotation: 180 }] } },
  { tool: 'get_device', args: { id: 'iphone-duo', screen: 'closed', rotation: 180 }, expect: 'error', error: 'no reading on 24A94232 for screen closed at 180°' },
  // Live on 2026-11-23: 24A94425, a newer 27.1 build with 11 readings. Fixed by D14.
  { tool: 'get_device', args: { id: 'iphone-duo', runtime: '27.1' }, expect: 'ok', match: { runtime: { build: '24A94232' } } },
  { tool: 'get_device', args: { id: 'iphone-duo', runtime: '24A94425' }, expect: 'ok', match: { runtime: { build: '24A94425' } } },
  { tool: 'get_device', args: { id: 'iphone-16', runtime: '18.6' }, expect: 'ok', match: { runtime: { build: '22G86' } } },
  { tool: 'get_device', args: { id: 'iphone-16', runtime: '22G86' }, expect: 'ok', match: { runtime: { build: '22G86' } } },
  { tool: 'get_device', args: { id: 'iphone-16', runtime: '27.2' }, expect: 'ok', match: { runtime: { build: '24B8117' } } },
  { tool: 'get_device', args: { id: 'iphone-16', runtime: '24B5089g' }, expect: 'ok', match: { runtime: { build: '24B5089g', prerelease: true } } },
  { tool: 'get_device', args: { id: 'iphone-17', runtime: '18.6' }, expect: 'error', error: 'Its runtimes: 27.0 (24A434)' },
  { tool: 'get_device', args: { id: 'iphone-99' }, expect: 'error', error: 'The device ids: iphone-se-3' },
  // Live on 2026-11-23: "get_device failed on the server". Fixed by D13.
  { tool: 'get_device', args: { id: 'iphone-17', orientation: 'portrait', rotation: 90 }, expect: 'error', error: "Rotation 90 gives the iPhone 17's main screen a landscape window, not portrait" },
  { tool: 'get_device', args: { id: 'iphone-17', orientation: 'landscape', rotation: 90 }, expect: 'ok', match: { readings: [{ rotation: 90 }] } },
  { tool: 'get_device', args: { device: 'iphone-17' }, expect: 'error', error: 'arguments.device is not an argument of this tool; its arguments are id, screen' },
  { tool: 'get_device', args: { id: 'iphone-17', rotation: '90' }, expect: 'error', error: 'arguments.rotation must be integer, not string' },
  { tool: 'get_device', args: { id: 'iphone-17', rotation: 45 }, expect: 'error', error: 'arguments.rotation must be one of 0, 90, 180, 270' },
  { tool: 'get_device', args: { id: 'pixel-tablet', orientation: 'portrait' }, expect: 'ok', match: { readings: [{ orientation: 'portrait' }] } },
  { tool: 'get_device', args: { id: 'iphone-17', runtime: '27' }, expect: 'error', error: 'Its runtimes: 27.0 (24A434)' },
  { tool: 'get_device', args: { id: 'android-small-phone' }, expect: 'ok', match: { readings: [{ cornerRadii: { profile: null } }] } },
  { tool: 'get_device', args: { id: 'iphone-16-pro-max' }, expect: 'ok', match: { runtime: { build: '22G86' } } },

  // compare_devices
  // Live on 2026-11-23: pixelsPerUnit 2.63. Fixed by D15.
  { tool: 'compare_devices', args: { ids: ['iphone-17', 'pixel-8'] }, expect: 'ok', match: { rows: [{ id: 'iphone-17', pixelsPerUnit: 3 }, { id: 'pixel-8', pixelsPerUnit: 2.625 }], missing: [] } },
  {
    tool: 'compare_devices', args: { ids: ['iphone-se-3', 'iphone-16e', 'iphone-17-pro-max', 'ipad-a16', 'ipad-pro-13-m5', 'android-small-phone', 'pixel-tablet', 'pixel-9-pro-fold'] }, expect: 'ok',
    match: { rows: [{ id: 'iphone-se-3', pixelsPerUnit: 2 }, { id: 'pixel-tablet', pixelsPerUnit: 2 }, { id: 'pixel-9-pro-fold', screen: 'open', pixelsPerUnit: 2.4375 }, { id: 'android-small-phone', pixelsPerUnit: 3 }] },
  },
  { tool: 'compare_devices', args: { ids: ['iphone-17'] }, expect: 'error', error: 'arguments.ids must have at least 2 items' },
  { tool: 'compare_devices', args: { ids: ['iphone-se-3', 'iphone-16e', 'iphone-16', 'iphone-17', 'iphone-17-pro', 'iphone-air', 'pixel-8', 'pixel-fold', 'pixel-tablet'] }, expect: 'error', error: 'arguments.ids must have at most 8 items' },
  // Live on 2026-11-23: two identical rows. Fixed by D16.
  { tool: 'compare_devices', args: { ids: ['iphone-17', 'iphone-17'] }, expect: 'error', error: 'arguments.ids must not repeat an item: "iphone-17"' },
  { tool: 'compare_devices', args: { ids: ['iphone-17', 'iphone-17e'], orientation: 'landscape' }, expect: 'ok', match: { rows: [{ id: 'iphone-17', rotation: 90 }], missing: [{ id: 'iphone-17e' }] } },
  { tool: 'compare_devices', args: { ids: ['iphone-16', 'pixel-8'], runtime: '18.6' }, expect: 'ok', match: { rows: [{ id: 'iphone-16', runtime: { build: '22G86' } }], missing: [{ id: 'pixel-8' }] } },
  { tool: 'compare_devices', args: { ids: ['iphone-duo', 'pixel-fold'] }, expect: 'ok', match: { rows: [{ id: 'pixel-fold', screen: 'open', rotation: 0, orientation: 'landscape' }] } },
  { tool: 'compare_devices', args: { ids: ['iphone-duo', 'pixel-fold'], orientation: 'portrait' }, expect: 'ok', match: { rows: [{ id: 'pixel-fold', screen: 'open', rotation: 90 }], missing: [] } },
  { tool: 'compare_devices', args: { ids: ['iphone-17', 'nope'] }, expect: 'error', error: 'No device "nope"' },
  { tool: 'compare_devices', args: { ids: 'iphone-17,pixel-8' }, expect: 'error', error: 'arguments.ids must be array, not string' },

  // check_layout (the iPhone 17 in portrait: 402 × 874 pt, insets 62 and 34, corner radius 62)
  { tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'content', x: 16, y: 120, width: 370, height: 600 }] }, expect: 'ok', match: { frames: [{ name: 'content', findings: [] }] } },
  // Live on 2026-11-23: concentricRadius 62 for a frame 100 pt tall. Fixed by D17.
  {
    tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'header', x: 0, y: 0, width: 402, height: 100 }] }, expect: 'ok',
    match: {
      frames: [{
        name: 'header',
        findings: [
          { type: 'in-inset', edge: 'top', depth: 62 },
          { type: 'cut-by-corner', corner: 'topLeft', depth: 25.68, concentricRadius: 50 },
          { type: 'cut-by-corner', corner: 'topRight' },
          { type: 'under-system-bar', bar: 'status', depth: 54 },
          { type: 'under-system-bar', bar: 'navigation', overlap: { height: 38 } },
        ],
      }],
    },
  },
  // Live on 2026-11-23: concentricRadius 58 for a 20 × 20 frame. Fixed by D17.
  {
    tool: 'check_layout',
    args: {
      device: 'iphone-17',
      frames: [
        { name: 'card-r30', x: 20, y: 700, width: 362, height: 150, cornerRadius: 30 },
        { name: 'card-square', x: 20, y: 700, width: 362, height: 150 },
        { name: 'tiny', x: 4, y: 4, width: 20, height: 20 },
      ],
    },
    expect: 'ok',
    match: {
      frames: [
        { name: 'card-r30', findings: [{ type: 'near-corner', corner: 'bottomLeft', gap: 17.58, concentricRadius: 38 }, { type: 'in-inset', edge: 'bottom', depth: 10 }, { type: 'under-system-bar', bar: 'tab', depth: 59 }] },
        { name: 'card-square', findings: [{ type: 'near-corner', corner: 'bottomLeft', gap: 5.36 }] },
        { name: 'tiny', findings: [{ type: 'cut-by-corner', corner: 'topLeft', concentricRadius: 10 }] },
      ],
    },
  },
  {
    tool: 'check_layout', args: { device: 'iphone-17', orientation: 'landscape', frames: [{ name: 'side', x: 0, y: 150, width: 300, height: 100 }] }, expect: 'ok',
    match: { orientation: 'landscape', rotation: 90, window: { width: 874 }, frames: [{ findings: [{ type: 'in-inset', edge: 'left', depth: 62 }] }] },
  },
  {
    tool: 'check_layout',
    args: { device: 'iphone-duo', screen: 'half-open', frames: [{ name: 'list', x: 16, y: 100, width: 637, height: 700 }, { name: 'top-right button', x: 560, y: 20, width: 60, height: 44 }] },
    expect: 'ok',
    match: {
      frames: [
        { name: 'list', findings: [{ type: 'crosses-fold', axis: 'horizontal', separates: true }] },
        { name: 'top-right button', findings: [{ type: 'in-inset', edge: 'top', depth: 44 }, { type: 'in-occlusion-region', kind: 'occlusion', active: true, overlap: { width: 60, height: 44 } }, { type: 'near-corner', corner: 'topRight', gap: 19.49, concentricRadius: 6 }] },
      ],
    },
  },
  {
    tool: 'check_layout',
    args: { device: 'pixel-fold', screen: 'open', frames: [{ name: 'across', x: 400, y: 100, width: 50, height: 50 }, { name: 'left-half', x: 0, y: 100, width: 420.57, height: 50 }, { name: 'right-half', x: 420.57, y: 100, width: 100, height: 50 }] },
    expect: 'ok',
    match: {
      rotation: 0, orientation: 'landscape',
      frames: [{ name: 'across', findings: [{ type: 'crosses-fold', axis: 'vertical', separates: false }] }, { name: 'left-half', findings: [] }, { name: 'right-half', findings: [] }],
    },
  },
  {
    tool: 'check_layout', args: { device: 'pixel-8', frames: [{ name: 'chip', x: 150, y: 10, width: 100, height: 30 }] }, expect: 'ok',
    match: { frames: [{ findings: [{ type: 'in-inset', edge: 'top', depth: 30 }, { type: 'in-occlusion-region', kind: 'cutout', overlap: { height: 30 } }, { type: 'under-system-bar', bar: 'status', depth: 30 }] }] },
  },
  {
    tool: 'check_layout', args: { device: 'iphone-duo', screen: 'closed', frames: [{ name: 'cam', x: 300, y: 10, width: 120, height: 60 }] }, expect: 'ok',
    match: { frames: [{ findings: [{ type: 'in-inset', edge: 'right', depth: 38 }, { type: 'in-occlusion-region' }] }] },
  },
  { tool: 'check_layout', args: { device: 'iphone-17', frames: grid(200) }, expect: 'ok' },
  { tool: 'check_layout', args: { device: 'iphone-17', frames: grid(201) }, expect: 'error', error: 'arguments.frames must have at most 200 items' },
  { tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'neg', x: 10, y: 10, width: -10, height: 20 }] }, expect: 'error', error: 'arguments.frames[0].width must be at least 0' },
  { tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'dot', x: 100, y: 300, width: 0, height: 0 }, { name: 'corner-dot', x: 0, y: 0, width: 0, height: 0 }] }, expect: 'ok', match: { frames: [{ name: 'dot', findings: [] }] } },
  // Live on 2026-11-23: concentricRadius 72, past the display's 62. Fixed by D17.
  {
    tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'off', x: -10, y: -10, width: 50, height: 50 }] }, expect: 'ok',
    match: { frames: [{ findings: [{ type: 'outside-window', overhang: { top: 10, left: 10 } }, { type: 'cut-by-corner', corner: 'topLeft', concentricRadius: 25 }] }] },
  },
  { tool: 'check_layout', args: { id: 'iphone-17', frames: [{ name: 'a', x: 0, y: 0, w: 10, h: 10 }] }, expect: 'error', error: 'arguments.frames[0].w is not a key of arguments.frames[0]; its keys are name, x, y, width, height, cornerRadius' },
  // Live on 2026-11-23: a landscape result, the orientation ignored. Fixed by D13.
  { tool: 'check_layout', args: { device: 'iphone-17', orientation: 'portrait', rotation: 90, frames: [{ name: 'a', x: 16, y: 120, width: 100, height: 100 }] }, expect: 'error', error: 'Rotation 90 gives the iPhone 17' },
  { tool: 'check_layout', args: { device: 'pixel-8', rotation: 270, frames: [{ name: 'edge', x: 800, y: 100, width: 114.29, height: 50 }] }, expect: 'ok', match: { rotation: 270, frames: [{ findings: [{ type: 'in-inset', edge: 'right', depth: 50.29 }] }] } },
  { tool: 'check_layout', args: { device: 'iphone-17', screen: 'open', frames: [{ name: 'a', x: 0, y: 0, width: 1, height: 1 }] }, expect: 'error', error: 'Its screens: main' },
  { tool: 'check_layout', args: { device: 'iphone-17', frames: [{ name: 'far', x: 1e308, y: 0, width: 1, height: 1 }] }, expect: 'error', error: 'arguments.frames[0].x must be at most 1000000' },

  // convert_units
  { tool: 'convert_units', args: { device: 'iphone-17', values: [1, 0.5, 402, 874, 0.333], from: 'pt', to: 'px' }, expect: 'ok', match: { pixelsPerUnit: 3, values: [{ value: 402, result: 1206 }, { value: 0.333, result: 0.999 }] } },
  { tool: 'convert_units', args: { device: 'iphone-17', values: [1206, 1, 2], from: 'px', to: 'pt' }, expect: 'ok', match: { values: [{ value: 1206, result: 402 }, { value: 1, result: 0.3333 }, { value: 2, result: 0.6667 }] } },
  { tool: 'convert_units', args: { device: 'iphone-se-3', values: [375, 0.25], from: 'pt', to: 'px' }, expect: 'ok', match: { pixelsPerUnit: 2, values: [{ value: 375, result: 750 }] } },
  // Live on 2026-11-23: pixelsPerUnit 2.63. Fixed by D15.
  {
    tool: 'convert_units', args: { device: 'pixel-8', values: [1, 16, 24.5, 411.43, 0.2, -1.5], from: 'dp', to: 'px' }, expect: 'ok',
    match: { pixelsPerUnit: 2.625, values: [{ value: 1, result: 2.625, roundToPx: 3 }, { value: 16, result: 42, roundToPx: 42 }, { value: 24.5, result: 64.3125, roundToPx: 64 }, { value: 411.43, result: 1080.0038, roundToPx: 1080 }, { value: -1.5, result: -3.9375, roundToPx: -4 }] },
  },
  { tool: 'convert_units', args: { device: 'pixel-8', values: [1080, 2400, 1], from: 'px', to: 'dp' }, expect: 'ok', match: { pixelsPerUnit: 2.625, values: [{ value: 1080, result: 411.4286 }, { value: 2400, result: 914.2857 }] } },
  { tool: 'convert_units', args: { device: 'pixel-9-pro-fold', values: [1, 2, 10], from: 'dp', to: 'px' }, expect: 'ok', match: { pixelsPerUnit: 2.4375, values: [{ value: 1, result: 2.4375, roundToPx: 2 }, { value: 2, result: 4.875, roundToPx: 5 }, { value: 10, result: 24.375, roundToPx: 24 }] } },
  { tool: 'convert_units', args: { device: 'android-small-phone', values: [0.5, -0.5, 1.5], from: 'dp', to: 'px' }, expect: 'ok', match: { pixelsPerUnit: 3, values: [{ value: 0.5, roundToPx: 2 }, { value: -0.5, roundToPx: -1 }, { value: 1.5, roundToPx: 5 }] } },
  { tool: 'convert_units', args: { device: 'iphone-17', values: [1], from: 'dp', to: 'px' }, expect: 'error', error: 'The iPhone 17 lays out in pt, not dp' },
  { tool: 'convert_units', args: { device: 'pixel-8', values: [1], from: 'pt', to: 'px' }, expect: 'error', error: 'The Pixel 8 lays out in dp, not pt' },
  { tool: 'convert_units', args: { device: 'pixel-8', values: [5], from: 'px', to: 'px' }, expect: 'ok', match: { values: [{ value: 5, result: 5 }] } },
  // Live on 2026-11-23: null results, against the output schema. Fixed by D15.
  { tool: 'convert_units', args: { device: 'pixel-8', values: [1e39, 1e308], from: 'dp', to: 'px' }, expect: 'error', error: 'arguments.values[0] must be at most 1000000' },
  { tool: 'convert_units', args: { device: 'pixel-8', values: [], from: 'dp', to: 'px' }, expect: 'error', error: 'arguments.values must have at least 1 item' },
  { tool: 'convert_units', args: { device: 'pixel-8', values: ['16'], from: 'dp', to: 'px' }, expect: 'error', error: 'arguments.values[0] must be number, not string' },
  { tool: 'convert_units', args: { device: 'iphone-duo', values: [1], from: 'pt', to: 'px' }, expect: 'ok', match: { pixelsPerUnit: 3, values: [{ value: 1, result: 3 }] } },
]

/**
 * The ways `actual` differs from `partial`, each naming its path; empty when it matches. An object
 * in `partial` matches when each of its keys matches. An empty array matches an empty array only;
 * any other array matches when each of its items matches some item of the actual array, in any
 * order. Any other value matches an identical value.
 */
export function matches(actual: unknown, partial: unknown, path = '$'): string[] {
  if (Array.isArray(partial)) {
    if (!Array.isArray(actual)) return [`${path} is not an array`]
    if (partial.length === 0) return actual.length === 0 ? [] : [`${path} has ${actual.length} items, not 0`]
    return partial.flatMap((want, i) => actual.some((item) => matches(item, want).length === 0)
      ? []
      : [`${path} has no item matching ${path}[${i}] = ${JSON.stringify(want)}`])
  }
  if (partial !== null && typeof partial === 'object') {
    if (actual === null || typeof actual !== 'object') return [`${path} is not an object`]
    return Object.entries(partial).flatMap(([k, v]) => matches((actual as Record<string, unknown>)[k], v, `${path}.${k}`))
  }
  return Object.is(actual, partial) ? [] : [`${path} is ${JSON.stringify(actual)}, not ${JSON.stringify(partial)}`]
}
