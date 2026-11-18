// A device's page: its facts, its current reading drawn, and a table per screen and rotation.

import type { Device } from '../dataset.ts'
import type { Doc, Table } from '../doc.ts'
import {
  SCREEN_LABEL, compareRuntimes, currentReadings, groups, insets, rotationLabel, runtimeLabel, runtimes, scaleLabel, size,
  unitName,
} from '../data.ts'
import { rowsFor } from '../rows.ts'

/** A row per field and a column per runtime build, oldest first. */
export function readingTable(d: Device, screen: string, rotation: number, builds?: string[]): Table {
  const readings = d.readings
    .filter((r) => r.screen === screen && r.rotation === rotation && (!builds || builds.includes(r.runtime.build)))
    .sort((a, b) => compareRuntimes(a.runtime, b.runtime))
  return {
    type: 'table',
    head: [
      'Field',
      ...readings.map((r) => ({
        text: runtimeLabel(r.runtime),
        note: `\`${r.runtime.build}\`${r.runtime.build === d.current.build ? ', current' : ''}`,
      })),
    ],
    rows: rowsFor(d).map((row) => ({
      cells: [
        row.label,
        ...readings.map((r) => {
          const c = row.cell(r, d)
          return { text: c.text ?? '—', reason: c.reason, note: c.source }
        }),
      ],
    })),
    numeric: readings.map((_, i) => i + 1),
    beta: readings.flatMap((r, i) => (r.runtime.prerelease ? [i + 1] : [])),
  }
}

export function deviceDoc(d: Device): Doc {
  const current = currentReadings(d)
  const head = current.find((r) => r.rotation === 0) ?? current[0]
  const builds = runtimes(d)
  const displays = Object.entries(d.displays).map(([id, disp]): [string, string] => [
    id === 'main' ? 'Display' : `Display, ${id}`,
    `${size(disp)} ${d.unit} in its natural orientation, ${size(disp.pixels)} px${disp.cutout ? `, cutout: ${disp.cutout}` : ''}`,
  ])
  return {
    path: `/devices/${d.id}`,
    title: `${d.name} screen size, safe area and corner radius`,
    description: `${d.name}: ${size(head.window)} ${d.unit}, ${size(head.pixels)} px${head.safeAreaInsets ? `, safe-area insets ${insets(head.safeAreaInsets)}` : ''}; ${d.readings.length} readings on ${builds.length} runtime builds, measured.`,
    h1: d.name,
    blocks: [
      {
        type: 'facts',
        items: [
          ['Platform', `${d.platform === 'ios' ? 'iOS' : 'Android'}, ${d.kind}`],
          ['Unit', `${unitName(d)}; scale ${scaleLabel(d)}`],
          ...displays,
          ['Current', `${runtimeLabel(current[0].runtime)} (\`${d.current.build}\`)`],
          ['Runtimes read', builds.map((rt) => `${runtimeLabel(rt)} (${rt.build})`).join(', ')],
          ['Id', `\`${d.id}\``],
        ],
      },
      { type: 'slot', name: 'drawings' },
      { type: 'h2', text: 'Readings by screen and orientation' },
      {
        type: 'p',
        text: `One column per runtime build, oldest first; a beta build's column is shaded. Positions are in window coordinates, from the window's top left, in ${d.unit}. A rotation of 90° puts the device's top edge on the window's left.`,
      },
      ...groups(d).flatMap((g) => [
        { type: 'h3' as const, text: `${SCREEN_LABEL[g.screen]}, ${rotationLabel(g)}` },
        readingTable(d, g.screen, g.rotation),
      ]),
      {
        type: 'p',
        text: `The same data: [${d.id}.json](/data/v1/devices/${d.id}.json), [this page in Markdown](/devices/${d.id}.md).`,
      },
    ],
  }
}
