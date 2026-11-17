// The text files for agents and crawlers: llms.txt, llms-full.txt, robots.txt, sitemap.xml, the
// per-device JSON, version.json and the schema.org Dataset.

import type { Device } from './dataset.ts'
import type { Table } from './doc.ts'
import { absoluteLinks, blocksMarkdown, markdownPath, tableMarkdown } from './doc.ts'
import {
  DATA, DEVICES, SCREEN_LABEL, currentReadings, groups, headlineReading, insets, readingCount, rotationLabel,
  runtimeCount, runtimeLabel, scaleLabel, size,
} from './data.ts'
import { FILES } from './pages/about.ts'
import { deviceDoc } from './pages/device.ts'
import { guideDoc } from './pages/guide.ts'
import { HOME_SUMMARY, HOME_TITLE } from './pages/home.ts'
import { allPages, sitePages } from './pages/index.ts'
import { rowsFor } from './rows.ts'
import { DATA_LICENSE, MAKER, SITE } from './site.ts'

const md = (path: string) => `${SITE}${markdownPath(path)}`

function intro(): string {
  return `Dataset ${DATA.version} of ${DATA.updated}: ${DEVICES.length} devices, ${runtimeCount()} runtime builds, ${readingCount()} readings. Licensed CC BY 4.0; credit "screens.guide, measured by ${MAKER.name}" with a link to ${SITE}. iOS lengths are points (pt), Android lengths density-independent pixels (dp). A value no run measured is null, with its reason in the reading's \`missing\`. Every page has a Markdown copy at its path plus \`.md\`.`
}

function deviceLine(d: Device): string {
  const r = headlineReading(d)
  return `- [${d.name}](${md(`/devices/${d.id}`)}): ${size(r.window)} ${d.unit}, ${scaleLabel(d)}${r.safeAreaInsets ? `, safe-area insets ${insets(r.safeAreaInsets)}` : ''}; ${runtimeLabel(r.runtime)}`
}

export function llmsTxt(): string {
  const pages = new Map(sitePages().map((p) => [p.path, p]))
  const line = (path: string) => `- [${pages.get(path)!.h1}](${md(path)}): ${pages.get(path)!.description}`
  return [
    '# screens.guide',
    `> ${HOME_SUMMARY}`,
    intro(),
    '## Data files',
    FILES.filter((f) => f.path.startsWith('/data/'))
      .map((f) => (f.path.includes('<') ? `- \`${SITE}${f.path}\`: ${f.what}` : `- [${f.name}](${SITE}${f.path}): ${f.what}`))
      .join('\n'),
    '## Devices',
    DEVICES.map(deviceLine).join('\n'),
    '## Pages',
    ['/', '/guide', '/compare', '/runtimes', '/playground', '/agents'].map(line).join('\n'),
    '## Optional',
    [
      ...['/method', '/changelog', '/privacy'].map(line),
      `- [llms-full.txt](${SITE}/llms-full.txt): every device's current reading as Markdown tables, and the guide, in one file`,
    ].join('\n'),
  ].join('\n\n') + '\n'
}

/** One table per device: a row per field, a column per screen and rotation of the current build. */
export function currentTable(d: Device): Table {
  const current = currentReadings(d)
  const cols = groups(d).flatMap((g) => {
    const r = current.find((x) => x.screen === g.screen && x.rotation === g.rotation)
    return r ? [r] : []
  })
  return {
    type: 'table',
    head: ['Field', ...cols.map((r) => `${SCREEN_LABEL[r.screen]}, ${rotationLabel(r)}`)],
    rows: rowsFor(d).map((row) => ({
      cells: [row.label, ...cols.map((r) => {
        const c = row.cell(r, d)
        return { text: c.text ?? '—', reason: c.reason }
      })],
    })),
  }
}

export function llmsFullTxt(): string {
  const devices = DEVICES.map((d) => {
    const facts = deviceDoc(d).blocks.find((b) => b.type === 'facts')!
    return [`### ${d.name}`, blocksMarkdown([facts]), `Current build ${runtimeLabel(currentReadings(d)[0].runtime)} (\`${d.current.build}\`). Every build: ${md(`/devices/${d.id}`)}`, tableMarkdown(currentTable(d))].join('\n\n')
  })
  const guide = guideDoc()
  const guideMd = blocksMarkdown(guide.blocks).replace(/^(#{2,}) /gm, '#$1 ')
  return [
    '# screens.guide',
    `> ${HOME_SUMMARY}`,
    intro(),
    '## Devices: the current reading of each',
    ...devices,
    `## ${guide.h1}`,
    absoluteLinks(guideMd),
  ].join('\n\n') + '\n'
}

export function robotsTxt(): string {
  return `# Every crawler, AI crawlers included, may read every page and data file.\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
}

export function sitemapXml(): string {
  const urls = allPages().map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${DATA.updated}</lastmod></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function versionJson() {
  return {
    version: DATA.version,
    updated: DATA.updated,
    devices: DEVICES.length,
    runtimes: runtimeCount(),
    readings: readingCount(),
    schema: `${SITE}/data/v1/schema.json`,
  }
}

/** One device with the dataset's version, license and units, and the runs its readings name. */
export function deviceJson(d: Device) {
  const runIds = new Set(d.readings.flatMap((r) => r.measured.runs))
  return {
    version: DATA.version,
    updated: DATA.updated,
    license: DATA.license,
    units: DATA.units,
    runs: Object.fromEntries(Object.entries(DATA.runs).filter(([id]) => runIds.has(id))),
    device: d,
  }
}

export function datasetJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: HOME_TITLE,
    description: `${HOME_SUMMARY} One reading per device, runtime build, screen and rotation: the window, pixels, safe-area insets, corner radii, size classes, status, navigation and tab bars, content margins, reserved regions and folds. A value no run measured is null, with the reason.`,
    url: `${SITE}/`,
    version: DATA.version,
    dateModified: DATA.updated,
    license: DATA_LICENSE,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: MAKER.name, url: MAKER.url },
    keywords: ['screen size', 'safe area', 'safe-area insets', 'corner radius', 'iPhone', 'iPad', 'Android', 'points', 'dp', 'status bar', 'tab bar', 'foldable'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/data/v1/devices.json` },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE}/data/v1/devices.csv` },
      { '@type': 'DataDownload', encodingFormat: 'application/schema+json', contentUrl: `${SITE}/data/v1/schema.json` },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/data/v1/version.json` },
    ],
  }
}

