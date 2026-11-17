// What changed between runtime builds: for each device, screen and rotation, the table rows
// whose value differs between two builds that both read it.

import type { Device, Runtime } from './dataset.ts'
import { DEVICES, compareRuntimes, groups } from './data.ts'
import { rowsFor } from './rows.ts'

export interface Change {
  device: Device
  screen: string
  rotation: number
  orientation: string
  label: string
  values: { runtime: Runtime; text: string }[]
}

const SKIP = new Set(['measured', 'cornerRadii.profile', 'pixels'])

export function changes(devices: Device[] = DEVICES): Change[] {
  const out: Change[] = []
  for (const d of devices) {
    for (const g of groups(d)) {
      const readings = d.readings
        .filter((r) => r.screen === g.screen && r.rotation === g.rotation)
        .sort((a, b) => compareRuntimes(a.runtime, b.runtime))
      if (readings.length < 2) continue
      for (const row of rowsFor(d)) {
        if (SKIP.has(row.path)) continue
        const values = readings
          .map((r) => ({ runtime: r.runtime, text: row.cell(r, d).text }))
          .filter((v): v is { runtime: Runtime; text: string } => v.text !== null)
        if (new Set(values.map((v) => v.text)).size > 1) {
          out.push({ device: d, screen: g.screen, rotation: g.rotation, orientation: g.orientation, label: row.label, values })
        }
      }
    }
  }
  return out
}
