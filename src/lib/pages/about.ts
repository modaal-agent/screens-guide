// The pages about the data rather than the devices: for agents, the method, the changelog and
// privacy.

import type { Block, Doc } from '../doc.ts'
import { DATA, DEVICES, readingCount } from '../data.ts'
import { DATA_LICENSE, SITE } from '../site.ts'

/** The data files and text files the site serves, in the order /agents and llms.txt list them. */
export const FILES: { path: string; name: string; what: string }[] = [
  { path: '/data/v1/devices.json', name: 'devices.json', what: 'the whole dataset: every device and every reading' },
  { path: '/data/v1/devices/<id>.json', name: 'devices/<id>.json', what: "one device, with the dataset's version and the runs its readings name; for example /data/v1/devices/iphone-17.json" },
  { path: '/data/v1/devices.csv', name: 'devices.csv', what: 'one row per device, screen, orientation and runtime; nested fields joined with _, lists and `missing` as JSON text' },
  { path: '/data/v1/schema.json', name: 'schema.json', what: "the JSON Schema (draft 2020-12) of devices.json; a device file's `device` follows its `$defs/device`" },
  { path: '/data/v1/version.json', name: 'version.json', what: 'the dataset version, its date, and the counts of devices, runtimes and readings' },
  { path: '/llms.txt', name: 'llms.txt', what: 'an index of the site for language models' },
  { path: '/llms-full.txt', name: 'llms-full.txt', what: "every device's current reading as Markdown tables, and the guide" },
]

export function agentsDoc(): Doc {
  return {
    path: '/agents',
    title: 'screens.guide for coding agents',
    description: 'The dataset as JSON, CSV and Markdown, its schema and license, and how to cite it.',
    h1: 'For coding agents',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: `The site's numbers are a dataset first: ${DEVICES.length} devices and ${readingCount()} readings, version ${DATA.version} of ${DATA.updated}. Fetch the files below, or a Markdown copy of any page.`,
      },
      { type: 'h2', text: 'Files' },
      {
        type: 'table',
        head: ['URL', 'What'],
        rows: FILES.map((f) => ({ cells: [f.path.includes('<') ? `\`${f.path}\`` : `[\`${f.path}\`](${f.path})`, f.what] })),
      },
      {
        type: 'p',
        text: 'Every page has a Markdown copy at its path plus `.md`: [/devices/iphone-17.md](/devices/iphone-17.md) for [/devices/iphone-17](/devices/iphone-17), and [/index.md](/index.md) for the home page. The files allow requests from any origin.',
      },
      { type: 'h2', text: 'Reading the data' },
      {
        type: 'list',
        items: [
          "One reading per device, runtime build, screen and rotation. A device's `current` names the build to show first: the newest release build with a reading in each screen and rotation.",
          "Lengths are in the device's `unit`: points on iOS, dp on Android. Positions are window coordinates from the top left, already rotated for the reading's orientation.",
          "A value no run measured is `null`, and the reading's `missing` gives the reason for that field. Never fill it from another device.",
          'A reading on a beta build has `runtime.prerelease` true; its values can change by the release.',
          '`cornerRadii` has two sets, `profile` and `measured`, each with its `source`. On the iPads on iOS 27.2 and 27.3 they differ.',
        ],
      },
      { type: 'h2', text: 'License and citation' },
      {
        type: 'p',
        text: `The dataset is licensed under [Creative Commons Attribution 4.0](${DATA_LICENSE}): copy, change and redistribute it, commercially too, with credit. Credit it as "screens.guide, measured by Modaal" with a link to [${SITE}](${SITE}), and name the version you used, ${DATA.version}. The code and pages are MIT-licensed.`,
      },
    ],
  }
}

const FIELDS: [string, string, string][] = [
  ['Window', 'UIWindow.bounds, read by a probe app', 'the window size of a Compose probe, from the display pixels and density (wm size, wm density)'],
  ['Pixels', 'the window times the screen scale (UIScreen.scale), equal to the display profile', 'wm size, rotated to the reading'],
  ['Safe-area insets', 'UIWindow.safeAreaInsets', 'WindowInsets.safeDrawing; WindowInsets.systemBars and displayCutout apart'],
  ['Corner radii, display profile', "the simulator's device profile, capabilities.plist", "dumpsys display, the display's RoundedCorner entries"],
  ['Corner radii, measured', "SwiftUI's concentricCornerRadii of a view that fills the window; on iOS 18.6 the corners of the view behind a full-screen sheet", 'not read'],
  ['Size classes', "the trait collection's horizontal and vertical size classes", 'currentWindowAdaptiveInfo and currentWindowAdaptiveInfoV2'],
  ['Status bar', 'UIWindowScene.statusBarManager: statusBarFrame and isStatusBarHidden', 'dumpsys window, the statusBars inset source'],
  ['Navigation bar', "a UINavigationBar's frame in the window, with an inline and with a large title", "Material 3's TopAppBar inside the safe area"],
  ['Tab bar', "a UITabBarController's tab bar; the capsule is the depth-0 view whose class ends in PlatterView", "Material 3's NavigationBar, edge to edge"],
  ['Content margin', "SwiftUI's contentMargins(for: .container)", 'not read'],
  ['Reserved regions', 'UIView.reservedRegions(kind: .occlusion), active and inactive', "dumpsys display, the cutout's bounding rectangle"],
  ['Fold', "the .division reserved region and the hinge's status", "WindowInfoTracker's FoldingFeature"],
]

export function methodDoc(): Doc {
  const runs = Object.entries(DATA.runs).sort(([, a], [, b]) => a.date.localeCompare(b.date))
  return {
    path: '/method',
    title: 'How each value is read',
    description: 'The runs behind the dataset, and the API or command that reads each value on iOS and Android.',
    h1: 'How each value is read',
    blocks: [
      {
        type: 'p',
        lede: true,
        text: 'Every value comes from a probe app or a command run on an Xcode simulator or an Android emulator. Nothing is copied from a specification sheet. The probe apps are not published; the table names the API or command behind each value, so it can be read again with your own code.',
      },
      { type: 'h2', text: 'Fields' },
      { type: 'table', head: ['Field', 'iOS', 'Android'], rows: FIELDS.map((cells) => ({ cells })) },
      { type: 'h2', text: 'Runs' },
      {
        type: 'p',
        text: "A reading's `measured.runs` names the runs its values come from. Two runs that read the same value on the same build must agree within 0.01, or the export stops.",
      },
      {
        type: 'table',
        head: ['Run', 'Date', 'On', 'What it reads'],
        rows: runs.map(([id, run]) => ({ cells: [`\`${id}\``, run.date, run.on, run.what] })),
      },
      { type: 'h2', text: 'What no run measured' },
      {
        type: 'list',
        items: [
          'Keyboard heights.',
          'Display Zoom on iPhone, and iPad Split View and Stage Manager windows.',
          'Android at a font scale other than the default.',
          'The corner radii of the Pixel Fold and the small Android phone, whose emulators report none, and of the Pixel Tablet.',
          'Landscape on the devices whose pages show portrait only.',
          'Physical size, weight and pixel density per inch: spec sheets publish them, and no run reads them.',
        ],
      },
    ],
  }
}

export function privacyDoc(): Doc {
  return {
    path: '/privacy',
    title: 'Privacy',
    description: 'What screens.guide collects: no cookies, and the requests Cloudflare logs.',
    h1: 'Privacy',
    blocks: [
      {
        type: 'p',
        text: "screens.guide sets no cookie and writes nothing to your browser's local or session storage. Its pages load scripts and styles from screens.guide only.",
      },
      {
        type: 'p',
        text: "Cloudflare serves the site and keeps its own logs of the requests it serves, under [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/).",
      },
    ],
  }
}

/**
 * data/CHANGELOG.md as blocks: `## ` headings, `- ` lists and paragraphs, each wrapped over lines.
 * Its first line, `# Dataset changelog`, is the page's heading.
 */
export function changelogBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of markdown.split(/\n\s*\n/)) {
    const text = chunk.trim()
    if (!text || text.startsWith('# ')) continue
    if (text.startsWith('## ')) blocks.push({ type: 'h2', text: text.slice(3) })
    else if (text.startsWith('- ')) {
      blocks.push({ type: 'list', items: text.split(/\n- /).map((i) => i.replace(/^- /, '').replace(/\s*\n\s*/g, ' ')) })
    } else blocks.push({ type: 'p', text: text.replace(/\s*\n\s*/g, ' ') })
  }
  return blocks
}

export function changelogDoc(markdown: string): Doc {
  return {
    path: '/changelog',
    title: 'Dataset changelog',
    description: 'Each version of the dataset: the devices and runtimes it added and the values it corrected.',
    h1: 'Dataset changelog',
    blocks: changelogBlocks(markdown),
  }
}
