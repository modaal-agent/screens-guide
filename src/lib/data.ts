// The dataset as the pages read it, and the labels and number formats every page shares.

import raw from '../../data/devices.json'
import { displayOf, type Corners, type Dataset, type Device, type Insets, type Reading, type Runtime } from './dataset.ts'

export const DATA = raw as unknown as Dataset
export const DEVICES: Device[] = DATA.devices
export const SITE = 'https://screens.guide'
export const REPOSITORY = 'https://github.com/modaal-agent/screens-guide'
/** The devices /compare draws when the URL names none. */
export const COMPARE_DEFAULT = ['iphone-se-3', 'iphone-17', 'iphone-17-pro-max', 'pixel-8']

export function device(id: string): Device {
  const d = DEVICES.find((x) => x.id === id)
  if (!d) throw new Error(`no device ${id} in data/devices.json`)
  return d
}

export function readingCount(): number {
  return DEVICES.reduce((n, d) => n + d.readings.length, 0)
}

export function runtimeCount(): number {
  return new Set(DEVICES.flatMap((d) => d.readings.map((r) => `${r.runtime.os} ${r.runtime.build}`))).size
}

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

/** The device's runtime builds, oldest first. */
export function runtimes(d: Device): Runtime[] {
  const seen = new Map<string, Runtime>()
  for (const r of d.readings) seen.set(r.runtime.build, r.runtime)
  return [...seen.values()].sort(compareRuntimes)
}

export function runtimeLabel(rt: Runtime): string {
  const os = rt.os === 'Android' ? `Android ${rt.version}${rt.api ? ` (API ${rt.api})` : ''}` : `iOS ${rt.version}`
  return `${os}${rt.prerelease ? ' beta' : ''}`
}

export function currentReadings(d: Device): Reading[] {
  return d.readings.filter((r) => r.runtime.build === d.current.build)
}

/** The reading a summary shows: the current build's, on the first screen, at rotation 0. */
export function headlineReading(d: Device): Reading {
  const current = currentReadings(d)
  const firstScreen = d.screens?.[0]?.id ?? 'main'
  return (
    current.find((r) => r.screen === firstScreen && r.rotation === 0) ??
    current.find((r) => r.rotation === 0) ??
    current[0]
  )
}

/** The reading of the current build in the other orientation of `r`'s screen, if any. */
export function otherOrientation(d: Device, r: Reading): Reading | undefined {
  return currentReadings(d).find((x) => x.screen === r.screen && x.orientation !== r.orientation)
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

/** "Screen, orientation" groups: one table per screen and rotation on a device page. */
export function groups(d: Device): { screen: string; rotation: number; orientation: string }[] {
  const order = d.screens ? d.screens.map((s) => s.id) : ['main']
  const seen = new Map<string, { screen: string; rotation: number; orientation: string }>()
  for (const r of d.readings) seen.set(`${r.screen} ${r.rotation}`, { screen: r.screen, rotation: r.rotation, orientation: r.orientation })
  return [...seen.values()].sort((a, b) => order.indexOf(a.screen) - order.indexOf(b.screen) || a.rotation - b.rotation)
}

export function displayFor(d: Device, r: Reading) {
  return d.displays[displayOf(d, r.screen)]
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
