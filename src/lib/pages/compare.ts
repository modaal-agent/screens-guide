// The comparison: the chosen devices' current readings drawn to scale on top of each other.

import type { Device, Reading } from '../dataset.ts'
import type { Doc } from '../doc.ts'
import { COMPARE_DEFAULT, DEVICES, device, headlineReading, insets, size } from '../data.ts'

export const COMPARE_MAX = 8

export function compared(ids: string[] = COMPARE_DEFAULT): { d: Device; r: Reading }[] {
  return ids.map((id) => {
    const d = device(id)
    return { d, r: headlineReading(d) }
  })
}

export function compareDoc(): Doc {
  return {
    path: '/compare',
    title: 'Compare screen sizes to scale',
    description: 'iPhones, iPads and Android devices drawn on top of each other to scale, in points and dp, with their safe areas.',
    h1: 'Compare devices to scale',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: 'The windows of each device\'s current reading, drawn on top of each other from the top left, one point to one dp, with the safe area dashed.',
      },
      {
        type: 'slot',
        name: 'drawing',
        markdown: [
          {
            type: 'table',
            head: ['Device', 'Window', 'Safe-area insets (top / bottom / left / right)'],
            rows: compared().map(({ d, r }) => ({
              cells: [`[${d.name}](/devices/${d.id})`, `${size(r.window)} ${d.unit}`, r.safeAreaInsets ? insets(r.safeAreaInsets) : '—'],
            })),
          },
        ],
      },
      { type: 'h2', text: 'All devices' },
      {
        type: 'p',
        text: "Open a comparison of two to eight devices with `/compare?ids=` and their ids, separated by commas: [/compare?ids=iphone-17,pixel-8](/compare?ids=iphone-17,pixel-8).",
      },
      { type: 'cards', items: DEVICES.map((d) => `[${d.name}](/devices/${d.id}) \`${d.id}\``) },
    ],
  }
}
