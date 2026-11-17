// The Worker's configuration and the response headers (spec 001 §4.4, §5.1). `npx wrangler dev`
// serves them; these checks read the files, so they run without it.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')

/** wrangler.jsonc without its comments. */
function wrangler(): Record<string, any> {
  const text = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8')
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''))
}

/** public/_headers as path → header → value. */
function headers(): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>()
  let current: Map<string, string> | null = null
  for (const line of readFileSync(join(ROOT, 'public/_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = new Map()
      rules.set(line.trim(), current)
    } else {
      const [name, ...value] = line.trim().split(':')
      current!.set(name.toLowerCase(), value.join(':').trim())
    }
  }
  return rules
}

describe('the Worker', () => {
  it('serves dist/ as static assets at screens.guide, with no script', () => {
    const w = wrangler()
    expect(w.name).toBe('screens-guide')
    expect(w.main).toBeUndefined()
    expect(w.assets).toEqual({ directory: './dist', not_found_handling: '404-page', html_handling: 'auto-trailing-slash' })
    expect(w.routes).toEqual([{ pattern: 'screens.guide', custom_domain: true }])
    expect(w.send_metrics).toBe(false)
  })
})

describe('the response headers', () => {
  const rules = headers()

  it('send nosniff, the referrer policy and frame-ancestors on every path', () => {
    const all = rules.get('/*')!
    expect(all.get('x-content-type-options')).toBe('nosniff')
    expect(all.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(all.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  it('let any origin fetch the data files, the text files and the Markdown copies', () => {
    for (const path of ['/data/*', '/llms.txt', '/llms-full.txt', '/*.md']) {
      expect(rules.get(path)?.get('access-control-allow-origin'), path).toBe('*')
    }
    expect(rules.get('/data/*')!.get('cache-control')).toBe('public, max-age=3600')
  })

  it('restrict nothing the pages load: no script-src, style-src or connect-src beside the <meta> policy', () => {
    const csp = rules.get('/*')!.get('content-security-policy')!
    for (const d of ['default-src', 'script-src', 'style-src', 'connect-src']) expect(csp).not.toContain(d)
  })
})
