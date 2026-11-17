// skills/screens-guide/references/devices.md, written from the dataset by `npm run gen:skill`
// (spec 002 §4.1). The skill carries it so an agent without network access still has the numbers;
// tests/skill.test.ts fails when the committed file differs from what this returns.

import type { Dataset, Device, Reading } from './dataset.ts'
import { corners, insets, num, runtimeLabel, size } from './format.ts'

const SCREEN: Record<string, string> = { main: 'main', closed: 'closed', open: 'open', 'half-open': 'half-open', tent: 'tent' }

function current(d: Device): Reading[] {
  const order = d.screens ? d.screens.map((s) => s.id as string) : ['main']
  return d.readings
    .filter((r) => r.runtime.build === d.current.build)
    .sort((a, b) => order.indexOf(a.screen) - order.indexOf(b.screen) || a.rotation - b.rotation)
}

const cell = (v: string | null | undefined) => (v === null || v === undefined || v === '' ? '—' : v)

function corner(r: Reading): string | null {
  const c = r.cornerRadii.profile ?? r.cornerRadii.measured
  return c ? corners(c) : null
}

function statusBar(r: Reading): string | null {
  if (!r.statusBar) return null
  if (r.statusBar.placement === 'hidden') return 'hidden'
  return r.statusBar.frame ? `${r.statusBar.placement} ${num(r.statusBar.frame.height)}` : r.statusBar.placement
}

function topBar(r: Reading): string | null {
  const b = r.navigationBar.inline
  return b ? `${num(b.top)} + ${num(b.height)}` : null
}

function bottomBar(r: Reading): string | null {
  const t = r.tabBar
  if (!t) return null
  return `${t.style} ${num(t.height)}, ${num(t.bottom)} above bottom`
}

function sizeClass(r: Reading): string | null {
  return r.sizeClass ? `${r.sizeClass.width} / ${r.sizeClass.height}` : null
}

function deviceTable(devices: Device[]): string[] {
  const lines = [
    '| device | screen | rotation | window | insets t / b / l / r | corner | status bar | top bar | bottom bar | size class w / h |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const d of devices) {
    for (const r of current(d)) {
      lines.push(`| \`${d.id}\` | ${SCREEN[r.screen]} | ${r.rotation} | ${size(r.window)} | ${cell(r.safeAreaInsets && insets(r.safeAreaInsets))} | ${cell(corner(r))} | ${cell(statusBar(r))} | ${cell(topBar(r))} | ${cell(bottomBar(r))} | ${cell(sizeClass(r))} |`)
    }
  }
  return lines
}

function deviceList(devices: Device[]): string[] {
  const lines = ['| device | id | runtime | build | scale |', '| --- | --- | --- | --- | --- |']
  for (const d of devices) {
    const rt = current(d)[0].runtime
    const disp = Object.values(d.displays)[0]
    const scale = d.platform === 'ios' ? `${num(disp.scale ?? 0)} px per pt` : `${(disp.density ?? 0) / 160} px per dp (${disp.density} dpi)`
    lines.push(`| ${d.name} | \`${d.id}\` | ${runtimeLabel(rt)} | \`${rt.build}\` | ${scale} |`)
  }
  return lines
}

function foldTable(devices: Device[]): string[] {
  const lines = ['| device | screen | rotation | fold axis | fold band x, y, width, height | separates | reserved regions |', '| --- | --- | --- | --- | --- | --- | --- |']
  for (const d of devices) {
    for (const r of current(d)) {
      if (!r.fold && !r.regions?.length) continue
      const f = r.fold
      const band = f ? `${num(f.frame.x)}, ${num(f.frame.y)}, ${num(f.frame.width)}, ${num(f.frame.height)}` : null
      const regions = r.regions?.map((g) => `${g.kind}${g.active ? '' : ' (inactive)'} ${num(g.frame.x)}, ${num(g.frame.y)}, ${num(g.frame.width)}, ${num(g.frame.height)}`).join('; ')
      lines.push(`| \`${d.id}\` | ${SCREEN[r.screen]} | ${r.rotation} | ${cell(f?.axis)} | ${cell(band)} | ${f ? (f.separates ? 'yes' : 'no') : '—'} | ${cell(regions)} |`)
    }
  }
  return lines
}

export function skillReference(data: Dataset): string {
  const ios = data.devices.filter((d) => d.platform === 'ios')
  const android = data.devices.filter((d) => d.platform === 'android')
  const out = [
    '# Device readings',
    '',
    `Dataset ${data.version} of ${data.updated} from https://screens.guide, licensed CC BY 4.0: credit "screens.guide, measured by Modaal". This file is a snapshot of that date. When the MCP server or the network is available, \`get_device\` or https://screens.guide/data/v1/devices/<id>.json gives the same readings, every runtime, and the values listed here as missing.`,
    '',
    "Each row is one device's current runtime, one screen and one rotation. Lengths are in the device's unit, pt on iOS and dp on Android; px are physical pixels. Positions are window coordinates from the window's top left. A dash is a value no run measured; the online data gives the reason.",
    '',
    '- **insets**: the safe-area insets.',
    "- **corner**: the display's corner radius; four values run top left, top right, bottom right, bottom left.",
    '- **status bar**: its placement and height.',
    '- **top bar**: the navigation bar (iOS, inline title) or Material 3 top app bar (Android): its top edge + its height.',
    "- **bottom bar**: the tab bar (iOS) or Material 3 navigation bar (Android): its style and height, and its gap to the window's bottom edge. A height includes the bottom inset when the gap is 0.",
    '- **size class**: iOS horizontal / vertical size class; Android window width / height size class.',
    '',
    '## Devices',
    '',
    ...deviceList(data.devices),
    '',
    '## iOS',
    '',
    ...deviceTable(ios),
    '',
    '## Android',
    '',
    ...deviceTable(android),
    '',
    '## Folds and reserved regions',
    '',
    'A fold band of width or height 0 is a line. `separates` is yes when the hinge splits the screen into two halves, as when half open. A reserved region is an area the system reports occluded, such as a camera.',
    '',
    ...foldTable(data.devices),
    '',
  ]
  return out.join('\n')
}
