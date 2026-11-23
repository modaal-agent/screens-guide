// The five tools of spec 002 §2.2. Each reads the dataset of data/devices.json; every length is in
// the device's unit (pt on iOS, dp on Android) and every position in window coordinates, origin at
// the window's top left.

import datasetSchema from '../data/schema.json' with { type: 'json' }
import type { Corners, Device, Reading, Runtime } from '../src/lib/dataset.ts'
import { DATA, DEVICES, compareRuntimes, currentReadings } from '../src/lib/data.ts'
import {
  type Corner, type Rect, concentricRadius, cornerDistances, crossesFold, insetDepths, intersection, overhang, round2,
  roundedCornerDepth,
} from '../src/lib/geometry.ts'
import type { Schema } from './types.ts'

/** A tool that cannot answer: the result carries `isError` and this text. */
export class ToolError extends Error {}

export interface Tool {
  name: string
  title: string
  description: string
  inputSchema: Schema
  outputSchema: Schema
  annotations: { readOnlyHint: true; idempotentHint: true; openWorldHint: false }
  run(args: Record<string, unknown>): Record<string, unknown>
}

export const MAX_FRAMES = 200
/** The largest request body /mcp reads (spec 002 §2.1). */
export const MAX_BODY = 64 * 1024
/** The largest length or position a tool takes, either sign, so no result overflows to Infinity. */
export const MAX_MAGNITUDE = 1_000_000
const DEFS = datasetSchema.$defs as Record<string, Schema>
const ANNOTATIONS = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const

/** An output schema with the dataset schema's `$defs` it references, and no others. */
function withDefs(schema: Schema): Schema {
  const used = new Set<string>()
  const walk = (s: unknown) => {
    if (!s || typeof s !== 'object') return
    for (const [k, v] of Object.entries(s)) {
      if (k === '$ref' && typeof v === 'string' && v.startsWith('#/$defs/')) {
        const name = v.slice('#/$defs/'.length)
        if (!used.has(name)) {
          used.add(name)
          walk(DEFS[name])
        }
      } else walk(v)
    }
  }
  walk(schema)
  return { ...schema, $defs: Object.fromEntries([...used].sort().map((n) => [n, DEFS[n]])) }
}

const ref = (name: string): Schema => ({ $ref: `#/$defs/${name}` })
const nullable = (name: string): Schema => ({ anyOf: [ref(name), { type: 'null' }] })
const DATASET: Schema = {
  type: 'object',
  required: ['version', 'updated'],
  properties: { version: { type: 'string' }, updated: { type: 'string' } },
}
const dataset = () => ({ version: DATA.version, updated: DATA.updated })

const PLATFORM: Schema = { type: 'string', enum: ['ios', 'android'] }
const KIND: Schema = { type: 'string', enum: ['phone', 'tablet', 'foldable'] }
const SCREEN: Schema = {
  type: 'string', enum: ['main', 'closed', 'open', 'half-open', 'tent'],
  description: "A foldable's pose: closed, open, half-open or tent; every other device has main only.",
}
const ORIENTATION: Schema = { type: 'string', enum: ['portrait', 'landscape'] }
const ROTATION: Schema = {
  type: 'integer', enum: [0, 90, 180, 270],
  description: "The device's rotation; 90 puts its top edge on the window's left.",
}
const RUNTIME: Schema = {
  type: 'string', minLength: 1,
  description: "A runtime build such as 24A434, or a version such as 27.2 or 16, written exactly as list_devices gives it (27.0, not 27). A version names the device's current build when it is the current version, else that version's newest release build. The device's current build when omitted.",
}
const DEVICE_ID: Schema = { type: 'string', minLength: 1, description: 'A device id from list_devices, such as iphone-17 or pixel-8.' }
const LENGTH: Schema = { type: 'number', minimum: -MAX_MAGNITUDE, maximum: MAX_MAGNITUDE }
const SIZE: Schema = { type: 'number', minimum: 0, maximum: MAX_MAGNITUDE }
const PIXELS_PER_UNIT: Schema = { type: 'number', description: 'Physical pixels per pt or dp: the scale on iOS, the density divided by 160 on Android, unrounded.' }

// ── reading the dataset ─────────────────────────────────────────────────────────────────

function findDevice(id: string): Device {
  const d = DEVICES.find((x) => x.id === id)
  if (!d) throw new ToolError(`No device "${id}". The device ids: ${DEVICES.map((x) => x.id).join(', ')}.`)
  return d
}

function builds(d: Device): Runtime[] {
  return [...new Map(d.readings.map((r) => [r.runtime.build, r.runtime])).values()].sort(compareRuntimes)
}

/**
 * The build a `runtime` argument names: a build; for a version, the device's current build when it
 * is the current version, else the version's newest release build. `current` is the newest release
 * build with a reading in each screen and rotation, so a newer build of the same version can hold
 * fewer readings (spec 002 D14).
 */
function pickBuild(d: Device, runtime?: string): string {
  if (!runtime || runtime === d.current.version) return d.current.build
  const all = builds(d)
  if (all.some((rt) => rt.build === runtime)) return runtime
  const ofVersion = all.filter((rt) => rt.version === runtime).sort((a, b) => Number(a.prerelease) - Number(b.prerelease) || compareRuntimes(b, a))
  if (ofVersion.length) return ofVersion[0].build
  throw new ToolError(`The ${d.name} has no reading on runtime "${runtime}". Its runtimes: ${all.map((rt) => `${rt.version} (${rt.build}${rt.prerelease ? ', beta' : ''})`).join(', ')}.`)
}

function screensOf(d: Device): string[] {
  return d.screens ? d.screens.map((s) => s.id) : ['main']
}

/** One reading: a screen (the first by default), and a rotation, an orientation or rotation 0. */
function pickReading(d: Device, build: string, screen?: string, orientation?: string, rotation?: number): Reading {
  const screens = screensOf(d)
  const s = screen ?? screens[0]
  if (!screens.includes(s)) throw new ToolError(`The ${d.name} has no screen "${s}". Its screens: ${screens.join(', ')}.`)
  const own = d.readings.filter((r) => r.runtime.build === build && r.screen === s).sort((a, b) => a.rotation - b.rotation)
  const r = rotation !== undefined
    ? own.find((x) => x.rotation === rotation)
    : orientation ? own.find((x) => x.orientation === orientation) : own.find((x) => x.rotation === 0) ?? own[0]
  if (!r) {
    const have = own.map((x) => `${x.orientation} ${x.rotation}°`).join(', ') || 'none'
    throw new ToolError(`The ${d.name} has no reading on ${build} for screen ${s}${rotation !== undefined ? ` at ${rotation}°` : orientation ? ` in ${orientation}` : ''}. Its readings there: ${have}.`)
  }
  if (rotation !== undefined && orientation && r.orientation !== orientation) throw rotationConflict(d, s, r, orientation)
  return r
}

/** Orientation and rotation that disagree: rotation 90 on a phone is landscape, not portrait. */
function rotationConflict(d: Device, screen: string, r: Reading, orientation: string): ToolError {
  return new ToolError(`Rotation ${r.rotation} gives the ${d.name}'s ${screen} screen a ${r.orientation} window, not ${orientation}. Give orientation or rotation, or a pair that agrees.`)
}

function pixelsPerUnit(d: Device, r?: Reading): number {
  const disp = r && d.screens ? d.displays[d.screens.find((s) => s.id === r.screen)?.display ?? 'main'] : Object.values(d.displays)[0]
  return d.platform === 'ios' ? disp.scale ?? 1 : (disp.density ?? 160) / 160
}

function safeArea(r: Reading): Rect | null {
  const i = r.safeAreaInsets
  return i ? { x: i.left, y: i.top, width: r.window.width - i.left - i.right, height: r.window.height - i.top - i.bottom } : null
}

// ── list_devices ────────────────────────────────────────────────────────────────────────

const listDevices: Tool = {
  name: 'list_devices',
  title: 'List the measured devices',
  description: 'Lists every device screens.guide measured: iPhones, iPads and Android phones, tablets and foldables. Each row gives the id the other tools take, the unit (pt or dp), each screen with its portrait window size, the runtime builds read, and the current one. Filter by platform or kind.',
  inputSchema: { type: 'object', additionalProperties: false, properties: { platform: PLATFORM, kind: KIND } },
  outputSchema: withDefs({
    type: 'object',
    required: ['dataset', 'devices'],
    properties: {
      dataset: DATASET,
      devices: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'platform', 'kind', 'unit', 'screens', 'runtimes', 'current'],
          properties: {
            id: { type: 'string' }, name: { type: 'string' }, platform: PLATFORM, kind: KIND, unit: { type: 'string', enum: ['pt', 'dp'] },
            screens: { type: 'array', items: { type: 'object', required: ['id', 'window'], properties: { id: SCREEN, window: ref('size') } } },
            runtimes: { type: 'array', items: ref('runtime') },
            current: { type: 'object', required: ['version', 'build'], properties: { version: { type: 'string' }, build: { type: 'string' } } },
          },
        },
      },
    },
  }),
  annotations: ANNOTATIONS,
  run(args) {
    const devices = DEVICES
      .filter((d) => (!args.platform || d.platform === args.platform) && (!args.kind || d.kind === args.kind))
      .map((d) => ({
        id: d.id, name: d.name, platform: d.platform, kind: d.kind, unit: d.unit,
        screens: screensOf(d).map((s) => {
          const r = currentReadings(d).find((x) => x.screen === s) ?? d.readings.find((x) => x.screen === s)!
          const [a, b] = [r.window.width, r.window.height]
          return { id: s, window: { width: Math.min(a, b), height: Math.max(a, b) } }
        }),
        runtimes: builds(d),
        current: d.current,
      }))
    return { dataset: dataset(), devices }
  },
}

// ── get_device ──────────────────────────────────────────────────────────────────────────

const getDevice: Tool = {
  name: 'get_device',
  title: "Get a device's readings",
  description: "Returns a device's measured readings: window, pixels, safe-area insets, corner radii, size classes, the status bar, the app's top bar (navigationBar: UINavigationBar, or Material 3's TopAppBar), the bottom tab bar (tabBar: UITabBar, or Material 3's NavigationBar), content margin, reserved regions and fold, one reading per screen and rotation. Gives the current runtime's readings unless a runtime is named; narrow them by screen, orientation or rotation, which must agree when both are given (rotation 90 on a phone is landscape). A null value has its reason in the reading's `missing`, keyed by the field's dotted path, such as cornerRadii.measured.",
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['id'],
    properties: { id: DEVICE_ID, screen: SCREEN, orientation: ORIENTATION, rotation: ROTATION, runtime: RUNTIME },
  },
  outputSchema: withDefs({
    type: 'object',
    required: ['dataset', 'device', 'runtime', 'readings'],
    properties: {
      dataset: DATASET,
      device: {
        type: 'object',
        required: ['id', 'name', 'platform', 'kind', 'unit', 'displays', 'current'],
        properties: {
          id: { type: 'string' }, name: { type: 'string' }, platform: PLATFORM, kind: KIND, unit: { type: 'string' },
          displays: { type: 'object', additionalProperties: ref('display') },
          screens: { type: 'array' },
          current: { type: 'object' },
        },
      },
      runtime: ref('runtime'),
      readings: { type: 'array', items: ref('reading') },
    },
  }),
  annotations: ANNOTATIONS,
  run(args) {
    const d = findDevice(args.id as string)
    const build = pickBuild(d, args.runtime as string | undefined)
    if (args.screen && !screensOf(d).includes(args.screen as string)) pickReading(d, build, args.screen as string)
    const readings = d.readings.filter((r) =>
      r.runtime.build === build &&
      (!args.screen || r.screen === args.screen) &&
      (!args.orientation || r.orientation === args.orientation) &&
      (args.rotation === undefined || r.rotation === args.rotation))
    if (!readings.length) {
      // Throws the reason: a screen, rotation or orientation with no reading, or a pair that disagrees.
      pickReading(d, build, args.screen as string | undefined, args.orientation as string | undefined, args.rotation as number | undefined)
      const conflict = args.rotation !== undefined && args.orientation
        ? d.readings.find((r) => r.runtime.build === build && r.rotation === args.rotation && (!args.screen || r.screen === args.screen))
        : undefined
      if (conflict) throw rotationConflict(d, conflict.screen, conflict, args.orientation as string)
      throw new ToolError(`The ${d.name} has no reading on ${build} that matches these arguments.`)
    }
    const { readings: _, ...device } = d
    return { dataset: dataset(), device, runtime: readings[0].runtime, readings }
  },
}

// ── compare_devices ─────────────────────────────────────────────────────────────────────

const compareDevices: Tool = {
  name: 'compare_devices',
  title: 'Compare devices',
  description: "Compares 2 to 8 different devices side by side, one row per device and screen: window size, pixels, pixels per unit, safe-area insets, the safe area's rectangle and corner radii. Uses each device's current runtime and its reading at rotation 0 unless an orientation or runtime is named. At rotation 0 a foldable's open screen can be landscape, as the Pixel Fold's open and half-open screens are; name an orientation to compare like with like.",
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['ids'],
    properties: {
      ids: { type: 'array', minItems: 2, maxItems: 8, uniqueItems: true, items: DEVICE_ID },
      orientation: ORIENTATION,
      runtime: RUNTIME,
    },
  },
  outputSchema: withDefs({
    type: 'object',
    required: ['dataset', 'rows', 'missing'],
    properties: {
      dataset: DATASET,
      rows: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'unit', 'screen', 'orientation', 'rotation', 'runtime', 'window', 'pixels', 'pixelsPerUnit', 'safeAreaInsets', 'safeArea', 'cornerRadii'],
          properties: {
            id: { type: 'string' }, name: { type: 'string' }, unit: { type: 'string' }, screen: SCREEN, orientation: ORIENTATION,
            rotation: { type: 'integer' }, runtime: ref('runtime'), window: ref('size'), pixels: ref('pixels'),
            pixelsPerUnit: PIXELS_PER_UNIT, safeAreaInsets: nullable('insets'), safeArea: nullable('rect'),
            cornerRadii: { type: 'object', properties: { profile: nullable('corners'), measured: nullable('corners') } },
          },
        },
      },
      missing: {
        type: 'array',
        description: 'Devices or screens with no reading for the runtime or orientation asked, and why.',
        items: { type: 'object', required: ['id', 'reason'], properties: { id: { type: 'string' }, reason: { type: 'string' } } },
      },
    },
  }),
  annotations: ANNOTATIONS,
  run(args) {
    const ids = args.ids as string[]
    const devices = ids.map(findDevice)
    const rows: Record<string, unknown>[] = []
    const missing: { id: string; reason: string }[] = []
    for (const d of devices) {
      let build: string
      try {
        build = pickBuild(d, args.runtime as string | undefined)
      } catch (e) {
        missing.push({ id: d.id, reason: (e as Error).message })
        continue
      }
      for (const s of screensOf(d)) {
        try {
          const r = pickReading(d, build, s, args.orientation as string | undefined)
          rows.push({
            id: d.id, name: d.name, unit: d.unit, screen: s, orientation: r.orientation, rotation: r.rotation, runtime: r.runtime,
            window: r.window, pixels: r.pixels, pixelsPerUnit: pixelsPerUnit(d, r),
            safeAreaInsets: r.safeAreaInsets, safeArea: safeArea(r), cornerRadii: r.cornerRadii,
          })
        } catch (e) {
          missing.push({ id: d.id, reason: (e as Error).message })
        }
      }
    }
    return { dataset: dataset(), rows, missing }
  },
}

// ── check_layout ────────────────────────────────────────────────────────────────────────

const EDGES: Schema = {
  type: 'object',
  properties: { top: { type: 'number' }, bottom: { type: 'number' }, left: { type: 'number' }, right: { type: 'number' } },
}

const FINDING: Schema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ['outside-window', 'in-inset', 'cut-by-corner', 'near-corner', 'under-system-bar', 'crosses-fold', 'in-occlusion-region'] },
    overhang: EDGES,
    edge: { type: 'string', enum: ['top', 'bottom', 'left', 'right'] },
    corner: { type: 'string', enum: ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] },
    depth: { type: 'number', description: 'How far the frame reaches into the inset, past the curve, or under the bar.' },
    gap: { type: 'number', description: "The frame corner's distance inside the display's curve." },
    concentricRadius: { type: 'number', description: "The corner radius that keeps an even gap to the display's corner: its radius minus the frame's larger distance from the two edges, at most half the frame's shorter side." },
    bar: {
      type: 'string', enum: ['status', 'navigation', 'tab'],
      description: "status: the system status bar. navigation: the app's top bar, UINavigationBar with an inline title or Material 3's TopAppBar. tab: the app's bottom tab bar, UITabBar or Material 3's NavigationBar.",
    },
    axis: { type: 'string', enum: ['vertical', 'horizontal'] },
    separates: { type: 'boolean' },
    kind: { type: 'string' },
    active: { type: 'boolean' },
    overlap: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' } } },
  },
}

export type Finding = Record<string, unknown> & { type: string }

/** The findings of spec 002 §2.3 for one frame against one reading. */
export function findings(r: Reading, f: Rect & { cornerRadius?: number }): Finding[] {
  const out: Finding[] = []
  const w = r.window
  const over = overhang(f, w)
  if (over) out.push({ type: 'outside-window', overhang: map(over, round2) })
  if (r.safeAreaInsets) {
    for (const [edge, depth] of Object.entries(insetDepths(f, r.safeAreaInsets, w))) out.push({ type: 'in-inset', edge, depth: round2(depth) })
  }
  const radii: Corners | null = r.cornerRadii.profile ?? r.cornerRadii.measured
  if (radii) {
    for (const [corner, [dx, dy]] of Object.entries(cornerDistances(f, w)) as [Corner, [number, number]][]) {
      const R = radii[corner]
      if (!R || dx >= R || dy >= R) continue
      const depth = roundedCornerDepth(R, dx, dy, f.cornerRadius ?? 0)
      const concentric = round2(concentricRadius(R, dx, dy, f.width, f.height))
      if (depth < 0) out.push({ type: 'cut-by-corner', corner, depth: round2(-depth), concentricRadius: concentric })
      else out.push({ type: 'near-corner', corner, gap: round2(depth), concentricRadius: concentric })
    }
  }
  const bars: [string, Rect | null][] = [
    ['status', r.statusBar?.frame ?? null],
    ['navigation', r.navigationBar.inline ? { x: 0, y: r.navigationBar.inline.top, width: w.width, height: r.navigationBar.inline.height } : null],
    ['tab', r.tabBar?.frame ?? null],
  ]
  for (const [bar, rect] of bars) {
    const o = rect && intersection(f, rect)
    if (o) out.push({ type: 'under-system-bar', bar, depth: round2(Math.min(o.width, o.height)), overlap: { width: round2(o.width), height: round2(o.height) } })
  }
  if (r.fold && crossesFold(f, r.fold.frame)) out.push({ type: 'crosses-fold', axis: r.fold.axis, separates: r.fold.separates })
  for (const g of r.regions ?? []) {
    const o = intersection(f, g.frame)
    if (o) out.push({ type: 'in-occlusion-region', kind: g.kind, active: g.active, overlap: { width: round2(o.width), height: round2(o.height) } })
  }
  return out
}

function map<T extends object>(o: T, fn: (v: number) => number): T {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v as number)])) as T
}

const checkLayout: Tool = {
  name: 'check_layout',
  title: 'Check a layout against a device',
  description: `Checks up to ${MAX_FRAMES} frames of a screen's layout against a device's measured window: whether each frame reaches outside the window, into a safe-area inset, past the display's rounded corner, under the status bar or the app's top or bottom tab bar, across a foldable's fold, or into a reserved region such as a camera. Each finding gives its numbers; a frame near a rounded corner gets the concentric radius. Frames are in the device's unit, in window coordinates from the top left. Without screen, a foldable is checked on its first screen, closed (the cover display). Orientation and rotation must agree when both are given. The request body is at most ${MAX_BODY / 1024} KiB, so keep frame names short.`,
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['device', 'frames'],
    properties: {
      device: DEVICE_ID,
      screen: { ...SCREEN, description: `${SCREEN.description} A foldable's first screen, closed, when omitted.` },
      runtime: RUNTIME,
      orientation: { ...ORIENTATION, description: 'The window shape; the reading at rotation 0 when neither this nor rotation is given.' },
      rotation: ROTATION,
      frames: {
        type: 'array', minItems: 1, maxItems: MAX_FRAMES,
        items: {
          type: 'object', additionalProperties: false, required: ['name', 'x', 'y', 'width', 'height'],
          properties: {
            name: { type: 'string', maxLength: 200 },
            x: LENGTH, y: LENGTH, width: SIZE, height: SIZE, cornerRadius: SIZE,
          },
        },
      },
    },
  },
  outputSchema: withDefs({
    type: 'object',
    required: ['dataset', 'device', 'screen', 'orientation', 'rotation', 'runtime', 'window', 'safeAreaInsets', 'frames'],
    properties: {
      dataset: DATASET,
      device: { type: 'string' }, screen: SCREEN, orientation: ORIENTATION, rotation: { type: 'integer' }, runtime: ref('runtime'),
      window: ref('size'), safeAreaInsets: nullable('insets'), cornerRadii: nullable('corners'),
      frames: {
        type: 'array',
        items: { type: 'object', required: ['name', 'findings'], properties: { name: { type: 'string' }, findings: { type: 'array', items: FINDING } } },
      },
    },
  }),
  annotations: ANNOTATIONS,
  run(args) {
    const d = findDevice(args.device as string)
    const r = pickReading(d, pickBuild(d, args.runtime as string | undefined), args.screen as string | undefined, args.orientation as string | undefined, args.rotation as number | undefined)
    const frames = (args.frames as (Rect & { name: string; cornerRadius?: number })[]).map((f) => ({ name: f.name, findings: findings(r, f) }))
    return {
      dataset: dataset(), device: d.id, screen: r.screen, orientation: r.orientation, rotation: r.rotation, runtime: r.runtime,
      window: r.window, safeAreaInsets: r.safeAreaInsets, cornerRadii: r.cornerRadii.profile ?? r.cornerRadii.measured, frames,
    }
  },
}

// ── convert_units ───────────────────────────────────────────────────────────────────────

/** Compose's Dp.roundToPx(): the Float product of dp and density, rounded half up. */
export function composeRoundToPx(dp: number, density: number): number {
  return Math.round(Math.fround(Math.fround(dp) * Math.fround(density)))
}

const convertUnits: Tool = {
  name: 'convert_units',
  title: 'Convert between pt, dp and px',
  description: `Converts lengths on one device between its layout unit (pt on iOS, dp on Android) and physical pixels (px), at the device's measured scale or density. For dp to px on Android it also gives the whole pixel Compose's Dp.roundToPx() returns. Each value is between -${MAX_MAGNITUDE.toLocaleString('en-US')} and ${MAX_MAGNITUDE.toLocaleString('en-US')}.`,
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['device', 'values', 'from', 'to'],
    properties: {
      device: DEVICE_ID,
      values: { type: 'array', minItems: 1, maxItems: 1000, items: LENGTH },
      from: { type: 'string', enum: ['pt', 'dp', 'px'] },
      to: { type: 'string', enum: ['pt', 'dp', 'px'] },
    },
  },
  outputSchema: {
    type: 'object',
    required: ['dataset', 'device', 'unit', 'pixelsPerUnit', 'values'],
    properties: {
      dataset: DATASET,
      device: { type: 'string' }, unit: { type: 'string' }, pixelsPerUnit: PIXELS_PER_UNIT,
      values: {
        type: 'array',
        items: {
          type: 'object', required: ['value', 'result'],
          properties: { value: { type: 'number' }, result: { type: 'number' }, roundToPx: { type: 'integer' } },
        },
      },
    },
  },
  annotations: ANNOTATIONS,
  run(args) {
    const d = findDevice(args.device as string)
    const from = args.from as string
    const to = args.to as string
    for (const u of [from, to]) {
      if (u !== 'px' && u !== d.unit) throw new ToolError(`The ${d.name} lays out in ${d.unit}, not ${u}: convert between ${d.unit} and px.`)
    }
    const scale = pixelsPerUnit(d)
    const density = Object.values(d.displays)[0].density
    const values = (args.values as number[]).map((value) => {
      const px = from === 'px' ? value : value * scale
      const result = to === 'px' ? px : px / scale
      const row: Record<string, number> = { value, result: Math.round(result * 1e4) / 1e4 }
      if (d.platform === 'android' && from === 'dp' && to === 'px' && density) row.roundToPx = composeRoundToPx(value, density / 160)
      return row
    })
    return { dataset: dataset(), device: d.id, unit: d.unit, pixelsPerUnit: scale, values }
  },
}

export const TOOLS: Tool[] = [listDevices, getDevice, compareDevices, checkLayout, convertUnits]

/** The tool's arguments named in its usage event: device ids, screen, orientation, runtime and the frame count. */
export function toolEventProperties(name: string, args: Record<string, unknown>): Record<string, unknown> {
  const p: Record<string, unknown> = { tool: name }
  const ids = [args.id, args.device, ...(Array.isArray(args.ids) ? args.ids : [])].filter((x) => typeof x === 'string' && DEVICES.some((d) => d.id === x))
  if (ids.length) p.devices = ids
  // Only values the schema or the dataset knows: no text a client made up reaches an event.
  const known: Record<string, unknown[]> = {
    screen: SCREEN.enum!, orientation: ORIENTATION.enum!, platform: PLATFORM.enum!, kind: KIND.enum!,
    from: ['pt', 'dp', 'px'], to: ['pt', 'dp', 'px'], rotation: ROTATION.enum!,
    runtime: [...new Set(DEVICES.flatMap((d) => d.readings.flatMap((r) => [r.runtime.build, r.runtime.version])))],
  }
  for (const [k, values] of Object.entries(known)) if (values.includes(args[k])) p[k] = args[k]
  if (Array.isArray(args.frames)) p.frames = args.frames.length
  return p
}

