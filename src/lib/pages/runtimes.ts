// What changed between OS versions, from the readings.

import { changes } from '../changes.ts'
import type { Doc } from '../doc.ts'
import { SCREEN_LABEL, rotationLabel, runtimeLabel } from '../data.ts'

export function runtimesDoc(): Doc {
  const list = changes()
  const devices = [...new Set(list.map((c) => c.device))]
  return {
    path: '/runtimes',
    title: 'What changed between iOS versions',
    description: 'The bar heights, insets, corner radii and margins that differ between the runtime builds each device was read on.',
    h1: 'What changed between OS versions',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: 'Each row is one value that two runtime builds of the same device read differently, on the same screen in the same orientation. Builds that were not read on a device are not compared. A beta build is marked; its value can change by the release.',
      },
      ...devices.flatMap((d) => [
        { type: 'h2' as const, text: `[${d.name}](/devices/${d.id})` },
        {
          type: 'table' as const,
          head: ['Field', 'Screen', 'Values by runtime'],
          rows: list.filter((c) => c.device === d).map((c) => ({
            cells: [
              c.label,
              `${SCREEN_LABEL[c.screen]}, ${rotationLabel(c)}`,
              { text: '', lines: c.values.map((v) => `${runtimeLabel(v.runtime)} \`${v.runtime.build}\`: ${v.text}`) },
            ],
          })),
          numeric: [2],
        },
      ]),
    ],
  }
}
