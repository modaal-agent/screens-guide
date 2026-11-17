// Checks on the built site in dist/. Run `npm run build` before `npm test`; CI's
// site job builds first.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../data/devices.json' with { type: 'json' }
import { markdownPath } from '../src/lib/doc.ts'
import { allPages } from '../src/lib/pages/index.ts'

const DIST = join(import.meta.dirname, '..', 'dist')
const SITE = 'https://screens.guide'

function file(path: string): string {
  if (!existsSync(DIST)) throw new Error('dist/ is missing: run npm run build first')
  return readFileSync(join(DIST, path), 'utf8')
}

function files(ext: string, dir = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(ext, join(dir, e.name)) : e.name.endsWith(ext) ? [join(dir, e.name)] : [],
  )
}

/** The file in dist/ a site path is served from: `/` → index.html, `/x` → x.html, `/x.md` → x.md. */
function served(path: string): string {
  const p = decodeURI(path.replace(/[?#].*$/, ''))
  if (p === '/' || p === '') return 'index.html'
  return /\.[a-z]+$/.test(p) ? p.slice(1) : `${p.slice(1)}.html`
}

// The page's visible text: no scripts, no styles, tags removed, the entities the pages use decoded.
function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

describe('the pages', () => {
  it('lists every device in the home page table, one row each', () => {
    const html = file('index.html')
    const table = html.match(/<table[^>]*id="devices"[\s\S]*?<\/table>/)
    expect(table, 'a table with id="devices"').not.toBeNull()
    const body = table![0].match(/<tbody>([\s\S]*?)<\/tbody>/)![1]
    expect([...body.matchAll(/<tr[\s>]/g)]).toHaveLength(data.devices.length)
    for (const d of data.devices) expect(body).toContain(`href="/devices/${d.id}"`)
  })

  it('has a page for every device, headed with its name', () => {
    for (const d of data.devices) {
      const h1 = file(`devices/${d.id}.html`).match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
      expect(h1?.[1].trim(), d.id).toBe(d.name.replace(/&/g, '&amp;'))
    }
  })

  it('has every page of the site, and a Markdown copy of each', () => {
    for (const p of allPages()) {
      expect(existsSync(join(DIST, served(p.path))), p.path).toBe(true)
      const md = file(markdownPath(p.path).slice(1))
      expect(md.startsWith(`# ${p.h1}\n`), markdownPath(p.path)).toBe(true)
      expect(md).toContain(`This page as HTML: [${SITE}${p.path}]`)
    }
  })

  // Astro drops the line break before a line that starts with an expression or
  // an element, which joins the word before it to the value: "is50.29 dp",
  // "SwiftUI's<code>". Keep the word and the expression on one line.
  it('joins no word to the value or element after it', () => {
    const joined: string[] = []
    for (const f of files('.html')) {
      const html = readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
      for (const m of html.matchAll(/[a-z][a-z'’]*<(code|a|strong|em)\b/g)) joined.push(`${relative(DIST, f)}: ${m[0]}`)
      for (const m of text(html).matchAll(/(?<=\s)(?:a|an|and|are|at|by|from|in|is|of|on|the|to|with)\d[\d.,]*/g)) {
        joined.push(`${relative(DIST, f)}: ${m[0]}`)
      }
    }
    expect(joined).toEqual([])
  })

  it('links only to files the site has', () => {
    const broken: string[] = []
    for (const f of files('.html')) {
      for (const m of readFileSync(f, 'utf8').matchAll(/href="(\/[^"]*)"/g)) {
        if (!existsSync(join(DIST, served(m[1])))) broken.push(`${relative(DIST, f)} → ${m[1]}`)
      }
    }
    for (const f of [...files('.md'), ...files('.txt')]) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\]\(https:\/\/screens\.guide(\/[^)\s]*)\)/g)) {
        if (!existsSync(join(DIST, served(m[1])))) broken.push(`${relative(DIST, f)} → ${m[1]}`)
      }
    }
    expect(broken).toEqual([])
  })
})

describe('the content security policy', () => {
  const sha256 = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`
  const policy = (html: string) => {
    const m = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/)
    if (!m) return null
    return Object.fromEntries(m[1].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/)
      return [name, values]
    })) as Record<string, string[]>
  }

  it('is on every page, with the PostHog EU host the only other origin', () => {
    for (const f of files('.html')) {
      const p = policy(readFileSync(f, 'utf8'))
      expect(p, relative(DIST, f)).not.toBeNull()
      expect(p!['default-src']).toEqual(["'self'"])
      expect(p!['connect-src']).toEqual(["'self'", 'https://eu.i.posthog.com'])
      expect(p!['script-src'][0]).toBe("'self'")
      expect(p!['script-src'].slice(1).every((s) => s.startsWith("'sha256-"))).toBe(true)
      expect(p!['style-src'][0]).toBe("'self'")
    }
  })

  it("allows each page's inline scripts and styles by hash, and no style attribute", () => {
    for (const f of files('.html')) {
      const html = readFileSync(f, 'utf8')
      const p = policy(html)!
      for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (m[1].includes('application/ld+json')) continue
        expect(p['script-src'], `${relative(DIST, f)}: inline script`).toContain(sha256(m[2]))
      }
      for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        expect(p['style-src'], `${relative(DIST, f)}: inline style`).toContain(sha256(m[1]))
      }
      expect(html, relative(DIST, f)).not.toMatch(/\sstyle="/)
      expect(html, relative(DIST, f)).not.toMatch(/<script[^>]*\bsrc="https?:/)
    }
  })

  // An island that imports src/lib/data.ts ships all of data/devices.json to the browser.
  it('ships no copy of the dataset in a script', () => {
    const runIds = Object.keys(data.runs)
    for (const f of files('.js', join(DIST, '_astro'))) {
      const js = readFileSync(f, 'utf8')
      expect(runIds.filter((id) => js.includes(id)), relative(DIST, f)).toEqual([])
    }
  })

  it('loads PostHog only by dynamic import, never from a page', () => {
    for (const f of files('.html')) expect(readFileSync(f, 'utf8'), relative(DIST, f)).not.toContain('module.slim.no-external')
  })
})

describe('the files for agents', () => {
  it('serves data/devices.json and data/schema.json as they are', () => {
    const root = join(import.meta.dirname, '..')
    expect(file('data/v1/devices.json')).toBe(readFileSync(join(root, 'data/devices.json'), 'utf8'))
    expect(file('data/v1/schema.json')).toBe(readFileSync(join(root, 'data/schema.json'), 'utf8'))
  })

  it('has a JSON file for every device, holding that device and the runs it names', () => {
    for (const d of data.devices) {
      const doc = JSON.parse(file(`data/v1/devices/${d.id}.json`))
      expect(doc.device).toEqual(d)
      expect(doc.version).toBe(data.version)
      const named = new Set(d.readings.flatMap((r) => r.measured.runs))
      expect(new Set(Object.keys(doc.runs))).toEqual(named)
    }
  })

  it('counts the devices, runtimes and readings in version.json', () => {
    const v = JSON.parse(file('data/v1/version.json'))
    const builds = new Set(data.devices.flatMap((d) => d.readings.map((r) => `${r.runtime.os} ${r.runtime.build}`)))
    expect(v).toMatchObject({
      version: data.version,
      updated: data.updated,
      devices: data.devices.length,
      runtimes: builds.size,
      readings: data.devices.reduce((n, d) => n + d.readings.length, 0),
    })
  })

  it('lists every page and every data file in llms.txt', () => {
    const llms = file('llms.txt')
    expect(llms.startsWith('# screens.guide\n\n> ')).toBe(true)
    for (const p of allPages()) expect(llms, p.path).toContain(`](${SITE}${markdownPath(p.path)})`)
    for (const f of ['devices.json', 'devices.csv', 'schema.json', 'version.json']) expect(llms).toContain(`${SITE}/data/v1/${f}`)
    expect(llms).toContain('## Optional')
  })

  it("has every device's current reading in llms-full.txt", () => {
    const full = file('llms-full.txt')
    for (const d of data.devices) expect(full, d.id).toContain(`\n### ${d.name}\n`)
    expect(full.match(/^# /gm)).toHaveLength(1)
  })

  it('lists every page in the sitemap, and names the sitemap in robots.txt', () => {
    const sitemap = file('sitemap.xml')
    for (const p of allPages()) expect(sitemap, p.path).toContain(`<loc>${SITE}${p.path}</loc>`)
    expect(file('robots.txt')).toMatch(/^User-agent: \*\nAllow: \/$/m)
    expect(file('robots.txt')).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  it('describes the dataset in JSON-LD on / and /agents, with a download per data file', () => {
    for (const page of ['index.html', 'agents.html']) {
      const m = file(page).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
      expect(m, page).not.toBeNull()
      const ld = JSON.parse(m![1])
      expect(ld['@type']).toBe('Dataset')
      expect(ld.license).toBe('https://creativecommons.org/licenses/by/4.0/')
      expect(ld.dateModified).toBe(data.updated)
      for (const dist of ld.distribution) {
        expect(dist.contentUrl.startsWith(SITE)).toBe(true)
        expect(existsSync(join(DIST, served(dist.contentUrl.slice(SITE.length)))), dist.contentUrl).toBe(true)
      }
    }
  })
})
