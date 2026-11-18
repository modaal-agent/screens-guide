// The dataset as the pages read it, and the labels and number formats every page shares.

import raw from '../../data/devices.json'
import { displayOf, type Dataset, type Device, type Reading, type Runtime } from './dataset.ts'
import { compareRuntimes } from './format.ts'

export {
  SCREEN_LABEL, compareRuntimes, corners, insets, num, rotationLabel, runtimeLabel, scaleLabel, size, unitName,
} from './format.ts'

export const DATA = raw as unknown as Dataset
export const DEVICES: Device[] = DATA.devices
export { REPOSITORY, SITE } from './site.ts'
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

/** The device's runtime builds, oldest first. */
export function runtimes(d: Device): Runtime[] {
  const seen = new Map<string, Runtime>()
  for (const r of d.readings) seen.set(r.runtime.build, r.runtime)
  return [...seen.values()].sort(compareRuntimes)
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

