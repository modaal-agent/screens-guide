// The Worker's configuration and the response headers (spec 001 §4.4, §5.1). `npx wrangler dev`
// serves them; these checks read the files, so they run without it.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MINUTE_LIMIT } from '../worker/ratelimit.ts'
import { COUNTED_FILES, PAGE_ROUTES, RUN_WORKER_FIRST, matchesRoute, routeKind } from '../worker/routes.ts'

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

/** Every file in dist/, as the site path it is served at. */
function distPaths(dir = join(ROOT, 'dist'), base = ''): string[] {
  if (!existsSync(dir)) throw new Error('dist/ is missing: run npm run build first')
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? distPaths(join(dir, e.name), `${base}/${e.name}`) : [`${base}/${e.name}`],
  )
}

describe('the Worker', () => {
  it('serves dist/ as static assets at screens.guide, and runs the script for the routes of worker/routes.ts', () => {
    const w = wrangler()
    expect(w.name).toBe('screens-guide')
    expect(w.main).toBe('./worker/index.ts')
    expect(w.assets).toMatchObject({ directory: './dist', binding: 'ASSETS', not_found_handling: '404-page', html_handling: 'auto-trailing-slash' })
    expect(w.assets.run_worker_first).toEqual(RUN_WORKER_FIRST)
    expect(w.routes).toEqual([{ pattern: 'screens.guide', custom_domain: true }])
    expect(w.send_metrics).toBe(false)
  })

  it("binds /mcp's rate limit: MINUTE_LIMIT a minute, and the DailyCount Durable Object", () => {
    const w = wrangler()
    expect(w.ratelimits).toEqual([{ name: 'MCP_MINUTE', namespace_id: '1001', simple: { limit: MINUTE_LIMIT, period: 60 } }])
    expect(w.durable_objects.bindings).toEqual([{ name: 'DAILY_COUNT', class_name: 'DailyCount' }])
    expect(w.migrations).toEqual([{ tag: 'v1', new_sqlite_classes: ['DailyCount'] }])
  })

  it('turns on Workers Logs, which /privacy describes', () => {
    expect(wrangler().observability).toEqual({ enabled: true })
  })
})

describe('the routes the Worker runs for', () => {
  const paths = distPaths()
  const pages = paths.filter((p) => p.endsWith('.html') && p !== '/404.html').map((p) => (p === '/index.html' ? '/' : p.slice(0, -'.html'.length)))
  const counted = paths.filter((p) => p.endsWith('.md') || p.startsWith('/data/') || p.startsWith('/skills/') || p === '/llms.txt' || p === '/llms-full.txt')

  it('include every page the build writes, so each one is negotiated and counted', () => {
    expect(pages.length).toBeGreaterThan(20)
    for (const p of pages) expect(routeKind(p), p).toBe('page')
  })

  it('include every data file, text file and Markdown copy, as counted files', () => {
    expect(counted.length).toBeGreaterThan(40)
    for (const p of counted) expect(routeKind(p), p).toBe('file')
  })

  it('leave the scripts, robots.txt, the sitemap, the 404 page and the headers file to the assets', () => {
    const others = paths.filter((p) => !pages.includes(p.replace(/\.html$/, '')) && !counted.includes(p))
    expect(others.some((p) => p.startsWith('/_astro/'))).toBe(true)
    for (const p of others) {
      expect([...PAGE_ROUTES, ...COUNTED_FILES].some((r) => matchesRoute(r, p)), p).toBe(false)
    }
    for (const p of ['/robots.txt', '/sitemap.xml', '/404.html', '/_headers']) expect(routeKind(p), p).toBe('other')
  })

  it("match a pattern as Cloudflare's router does: * spans slashes, and the pattern spans the path", () => {
    expect(matchesRoute('/*.md', '/devices/iphone-17.md')).toBe(true)
    expect(matchesRoute('/devices/*', '/devices/iphone-17')).toBe(true)
    expect(matchesRoute('/', '/guide')).toBe(false)
    expect(matchesRoute('/guide', '/guide/x')).toBe(false)
    expect(routeKind('/devices/iphone-17.md')).toBe('file')
    expect(routeKind('/mcp')).toBe('mcp')
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
    for (const path of ['/data/*', '/llms.txt', '/llms-full.txt', '/*.md', '/skills/*']) {
      expect(rules.get(path)?.get('access-control-allow-origin'), path).toBe('*')
    }
    expect(rules.get('/data/*')!.get('cache-control')).toBe('public, max-age=3600')
  })

  it('restrict nothing the pages load: no script-src, style-src or connect-src beside the <meta> policy', () => {
    const csp = rules.get('/*')!.get('content-security-policy')!
    for (const d of ['default-src', 'script-src', 'style-src', 'connect-src']) expect(csp).not.toContain(d)
  })
})

describe('the MCP Registry workflow', () => {
  const workflow = readFileSync(join(ROOT, '.github/workflows/mcp-registry.yml'), 'utf8')
  const server = JSON.parse(readFileSync(join(ROOT, 'server.json'), 'utf8'))

  it('publishes on an mcp-v tag, in the mcp-registry environment, with OIDC', () => {
    expect(workflow).toMatch(/tags: \['mcp-v\*'\]/)
    expect(workflow).toMatch(/^\s+environment: mcp-registry$/m)
    expect(workflow).toMatch(/^\s+id-token: write/m)
    expect(workflow).toContain('./mcp-publisher login github-oidc')
    expect(workflow).toContain('./mcp-publisher publish')
  })

  it('pins mcp-publisher to a release tag and verifies its Sigstore bundle before extracting it', () => {
    expect(workflow).toMatch(/MCP_PUBLISHER_VERSION: v\d+\.\d+\.\d+$/m)
    expect(workflow).not.toContain('releases/latest')
    expect(workflow.indexOf('cosign verify-blob')).toBeLessThan(workflow.indexOf('tar xzf'))
    expect(workflow).toContain('release.yml@refs/tags/${MCP_PUBLISHER_VERSION}')
    expect(workflow).toMatch(/sigstore\/cosign-installer@[0-9a-f]{40}/)
  })

  it("stops when the tag's version is not server.json's", () => {
    expect(workflow).toContain('tag="${GITHUB_REF_NAME#mcp-v}"')
    expect(workflow).toContain("jq -r .version server.json")
    expect(server.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
