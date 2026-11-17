// Checks on the built site in dist/. Run `npm run build` before `npm test`; CI's
// site job builds first.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../data/devices.json' with { type: 'json' }

const DIST = join(import.meta.dirname, '..', 'dist')

function page(path: string): string {
  const file = join(DIST, path)
  if (!existsSync(DIST)) throw new Error('dist/ is missing: run npm run build first')
  return readFileSync(file, 'utf8')
}

function htmlFiles(dir = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  )
}

// The page's visible text: no scripts, no styles, tags removed, entities for
// the characters the pages use decoded.
function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

describe('the built site', () => {
  it('lists every device in the home page table, one row each', () => {
    const html = page('index.html')
    const table = html.match(/<table[^>]*id="devices"[\s\S]*?<\/table>/)
    expect(table, 'a table with id="devices"').not.toBeNull()
    const body = table![0].match(/<tbody>([\s\S]*?)<\/tbody>/)![1]
    const rows = [...body.matchAll(/<tr[\s>]/g)]
    expect(rows).toHaveLength(data.devices.length)
    for (const d of data.devices) expect(body).toContain(`href="/devices/${d.id}"`)
  })

  it('has a page for every device, headed with its name', () => {
    for (const d of data.devices) {
      const html = page(`devices/${d.id}.html`)
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
      expect(h1?.[1].trim(), d.id).toBe(d.name.replace(/&/g, '&amp;'))
    }
  })

  // Astro drops the line break before a line that starts with an expression or
  // an element, which joins the word before it to the value: "is50.29 dp",
  // "SwiftUI's<code>". Keep the word and the expression on one line.
  it('joins no word to the value or element after it', () => {
    const joined: string[] = []
    for (const file of htmlFiles()) {
      const html = readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
      for (const m of html.matchAll(/[a-z][a-z'’]*<(code|a|strong|em)\b/g)) joined.push(`${relative(DIST, file)}: ${m[0]}`)
      for (const m of text(html).matchAll(/(?<=\s)(?:a|an|and|are|at|by|from|in|is|of|on|the|to|with)\d[\d.,]*/g)) {
        joined.push(`${relative(DIST, file)}: ${m[0]}`)
      }
    }
    expect(joined).toEqual([])
  })
})
