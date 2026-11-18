// Every page of the site as a Doc, in the order the sitemap and llms.txt list them, and the
// Markdown copy each one gets.

import changelog from '../../../data/CHANGELOG.md?raw'
import type { Doc } from '../doc.ts'
import { toMarkdown } from '../doc.ts'
import { DATA, DEVICES } from '../data.ts'
import { DATA_LICENSE, MAKER, SITE } from '../site.ts'
import { agentsDoc, changelogDoc, methodDoc, privacyDoc } from './about.ts'
import { compareDoc } from './compare.ts'
import { deviceDoc } from './device.ts'
import { guideDoc } from './guide.ts'
import { homeDoc } from './home.ts'
import { playgroundDoc } from './playground.ts'
import { runtimesDoc } from './runtimes.ts'

export { changelog as CHANGELOG }

/** The pages that are not a device's, keyed by the name of their Markdown copy. */
export function sitePages(): Doc[] {
  return [
    homeDoc(), compareDoc(), runtimesDoc(), guideDoc(), playgroundDoc(), agentsDoc(), methodDoc(),
    changelogDoc(changelog), privacyDoc(),
  ]
}

export function devicePages(): Doc[] {
  return DEVICES.map(deviceDoc)
}

export function allPages(): Doc[] {
  const [home, ...rest] = sitePages()
  return [home, ...devicePages(), ...rest]
}

export function markdownCopy(doc: Doc): string {
  const url = `${SITE}${doc.path === '/' ? '/' : doc.path}`
  return toMarkdown(
    doc,
    `Dataset ${DATA.version}, ${DATA.updated}. Measured by [${MAKER.name}](${MAKER.url}); the data is licensed [CC BY 4.0](${DATA_LICENSE}). This page as HTML: [${url}](${url}).`,
  )
}
