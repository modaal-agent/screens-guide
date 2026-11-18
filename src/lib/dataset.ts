// The shape of data/devices.json. data/schema.json is the authority; these types follow it.

export interface Size { width: number; height: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Insets { top: number; bottom: number; left: number; right: number }
export interface Corners {
  topLeft: number; topRight: number; bottomRight: number; bottomLeft: number; source: string
}
export interface SizeClass { width: string; height: string }
export interface Bar { top: number; height: number }

export interface Runtime {
  os: 'iOS' | 'Android'
  version: string
  api?: number
  build: string
  prerelease: boolean
}

export interface Reading {
  runtime: Runtime
  measured: { on: 'simulator' | 'emulator'; date: string; runs: string[] }
  screen: 'main' | 'closed' | 'open' | 'half-open' | 'tent'
  orientation: 'portrait' | 'landscape'
  rotation: 0 | 90 | 180 | 270
  window: Size
  pixels: Size
  safeAreaInsets: Insets | null
  systemBarInsets?: Insets | null
  cutoutInsets?: Insets | null
  cornerRadii: { profile: Corners | null; measured: Corners | null }
  sizeClass: SizeClass | null
  sizeClassV2?: SizeClass | null
  statusBar: { placement: 'top' | 'hidden' | 'left' | 'right' | 'navigation-bar'; frame: Rect | null } | null
  navigationBar: { inline: Bar | null; large: Bar | null }
  tabBar: {
    style: 'capsule' | 'bar' | 'column'; frame: Rect; bottom: number; height: number; sideGap: number | null
  } | null
  contentMargin: number | null
  regions: { kind: 'occlusion' | 'cutout'; frame: Rect; active: boolean }[] | null
  fold: { axis: 'vertical' | 'horizontal'; frame: Rect; margin: number | null; separates: boolean } | null
  missing: Record<string, string>
}

export interface Display {
  width: number
  height: number
  pixels: Size
  scale?: number
  density?: number
  cutout: 'none' | 'notch' | 'island' | 'strip' | 'hole' | null
}

export interface Device {
  id: string
  name: string
  platform: 'ios' | 'android'
  kind: 'phone' | 'tablet' | 'foldable'
  unit: 'pt' | 'dp'
  displays: Record<string, Display>
  screens?: { id: Reading['screen']; display: 'cover' | 'inner' }[]
  current: { version: string; build: string }
  readings: Reading[]
}

export interface Run { date: string; on: 'simulator' | 'emulator'; what: string }

export interface Dataset {
  version: string
  updated: string
  license: 'CC-BY-4.0'
  units: Record<'pt' | 'dp' | 'px', string>
  runs: Record<string, Run>
  devices: Device[]
}

/** The display a reading's screen shows: `main`, or the pose's display on a foldable. */
export function displayOf(device: Device, screen: string): string {
  return device.screens?.find((s) => s.id === screen)?.display ?? 'main'
}
