// The home page: what the site is, the device table and the files for agents.

import type { Doc } from '../doc.ts'
import {
  DATA, DEVICES, corners, headlineReading, insets, readingCount, runtimeCount, runtimeLabel, scaleLabel, size,
} from '../data.ts'

export const HOME_TITLE = 'screens.guide: measured screen sizes, safe areas and corner radii'
export const HOME_SUMMARY = `Measured screen sizes, safe-area insets, corner radii and system bars of ${DEVICES.length} iPhones, iPads and Android devices, read on Xcode simulators and Android emulators.`

export function homeDoc(): Doc {
  return {
    path: '/',
    title: HOME_TITLE,
    description: `${HOME_SUMMARY} JSON, CSV and Markdown for coding agents.`,
    h1: 'Screen sizes, safe areas and corner radii, as measured',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: `Every number on this site was read on an Xcode simulator or an Android emulator: the window, the pixels, the safe-area insets, the display's corner radii, the status, navigation and tab bars, the content margins and the folds. ${DEVICES.length} devices, ${runtimeCount()} OS runtime builds, ${readingCount()} readings. A value no run measured is left empty with the reason.`,
      },
      {
        type: 'p',
        text: 'For coding agents: [devices.json](/data/v1/devices.json), [devices.csv](/data/v1/devices.csv), [its schema](/data/v1/schema.json), [llms.txt](/llms.txt), and a Markdown copy of every page. [How to use them](/agents).',
      },
      { type: 'h2', text: 'Devices' },
      {
        type: 'p',
        text: 'Each row is the device\'s current reading: the newest release runtime, on the first screen, in its natural orientation.',
      },
      {
        type: 'table',
        id: 'devices',
        head: ['Device', 'Runtime', 'Window', 'Pixels', 'Scale', 'Safe-area insets (top / bottom / left / right)', 'Corner radius'],
        rows: DEVICES.map((d) => {
          const r = headlineReading(d)
          const radius = r.cornerRadii.profile ?? r.cornerRadii.measured
          return {
            cells: [
              `[${d.name}](/devices/${d.id})`,
              runtimeLabel(r.runtime),
              `${size(r.window)} ${d.unit}`,
              size(r.pixels),
              scaleLabel(d),
              r.safeAreaInsets ? insets(r.safeAreaInsets) : '—',
              radius ? corners(radius) : '—',
            ],
          }
        }),
        numeric: [2, 3, 4, 5, 6],
      },
      {
        type: 'p',
        text: `Dataset ${DATA.version}, exported ${DATA.updated}. iOS lengths are points (pt), Android lengths density-independent pixels (dp). [Compare devices to scale](/compare), see [what changed between OS versions](/runtimes), or read [how each value is read](/method).`,
      },
    ],
  }
}
