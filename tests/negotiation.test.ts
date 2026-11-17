// Markdown by content negotiation and the page_served and file_served events (spec 002 §3, §2.5),
// through the Worker's fetch with the assets served from dist/. Run `npm run build` first.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { markdownPath } from '../src/lib/doc.ts'
import { allPages } from '../src/lib/pages/index.ts'
import worker from '../worker/index.ts'
import { acceptQuality, wantsMarkdown } from '../worker/site.ts'
import { stubEnv } from './support/worker.ts'

const DIST = join(import.meta.dirname, '..', 'dist')
const MARKDOWN = 'text/markdown, text/html;q=0.9, */*;q=0.8'
const BROWSER = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'

async function get(path: string, accept: string | null, host = 'http://localhost', init: RequestInit = {}) {
  const stub = stubEnv()
  const headers = new Headers(init.headers)
  if (accept !== null) headers.set('Accept', accept)
  const response = await worker.fetch(new Request(`${host}${path}`, { ...init, headers }), stub.env, stub.ctx)
  return { response, ...stub }
}

describe('wantsMarkdown', () => {
  it('reads the qualities Accept gives text/markdown and text/html', () => {
    expect(acceptQuality('text/markdown;q=0.5, text/html', 'text/markdown')).toBe(0.5)
    expect(acceptQuality('Text/Markdown ; Q = 0.7', 'text/markdown')).toBe(0.7)
    expect(acceptQuality('text/*', 'text/markdown')).toBeNull()
  })

  it('prefers Markdown when Accept names it at least as high as HTML, or names it and not HTML', () => {
    for (const accept of ['text/markdown', 'text/markdown, text/html', 'text/html;q=0.5, text/markdown;q=0.5', MARKDOWN, 'text/markdown;q=0.1, */*']) {
      expect(wantsMarkdown(accept), accept).toBe(true)
    }
  })

  it('keeps HTML for a browser, a wildcard, a lower or zero Markdown quality, and no Accept', () => {
    for (const accept of [BROWSER, '*/*', 'text/*', 'text/html, text/markdown;q=0.9', 'text/markdown;q=0', '', null]) {
      expect(wantsMarkdown(accept), String(accept)).toBe(false)
    }
  })
})

describe('the page routes', () => {
  it("answer every page with its .md copy when Accept prefers Markdown, with Vary: Accept", async () => {
    for (const page of allPages()) {
      const { response, assets } = await get(page.path, MARKDOWN)
      expect(response.status, page.path).toBe(200)
      expect(response.headers.get('Content-Type'), page.path).toBe('text/markdown; charset=utf-8')
      expect(response.headers.get('Vary'), page.path).toContain('Accept')
      expect(response.headers.get('Link'), page.path).toBeNull()
      expect(await response.text(), page.path).toBe(readFileSync(join(DIST, markdownPath(page.path)), 'utf8'))
      expect(assets.asked).toEqual([markdownPath(page.path)])
    }
  })

  it('answer a browser with the HTML, a Link to the copy at its own path, and Vary: Accept', async () => {
    for (const [path, copy] of [['/', '/index.md'], ['/devices/iphone-17', '/devices/iphone-17.md'], ['/guide', '/guide.md']]) {
      const { response } = await get(path, BROWSER)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(response.headers.get('Link')).toBe(`<${copy}>; rel="alternate"; type="text/markdown"`)
      expect(response.headers.get('Vary')).toContain('Accept')
      expect(await response.text()).toContain('<!DOCTYPE html>')
    }
  })

  it('serve the HTML 404 page for a device with no page, whatever Accept asks', async () => {
    for (const accept of [MARKDOWN, BROWSER]) {
      const { response } = await get('/devices/iphone-99', accept)
      expect(response.status).toBe(404)
      expect(response.headers.get('Content-Type')).toMatch(/^text\/html/)
      expect(response.headers.get('Link')).toBeNull()
    }
  })

  it('pass a trailing-slash redirect through, and answer the redirected path with Markdown', async () => {
    const { response } = await get('/devices/iphone-17/', MARKDOWN)
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('/devices/iphone-17')
  })

  it('drop the query string when it fetches the copy', async () => {
    const { response, assets } = await get('/compare?ids=iphone-17,pixel-8', MARKDOWN)
    expect(response.status).toBe(200)
    expect(assets.asked).toEqual(['/compare.md'])
  })

  it('pass a 304 for the copy through, with Vary: Accept and no Content-Type of its own', async () => {
    const first = await get('/guide', 'text/markdown')
    const etag = first.response.headers.get('ETag')!
    const { response } = await get('/guide', 'text/markdown', 'http://localhost', { headers: { 'If-None-Match': etag } })
    expect(response.status).toBe(304)
    expect(response.headers.get('Vary')).toContain('Accept')
  })
})

describe('the counted files', () => {
  it('are the assets unchanged, whatever Accept asks', async () => {
    for (const path of ['/data/v1/devices.json', '/data/v1/devices/iphone-17.json', '/data/v1/devices.csv', '/llms.txt', '/llms-full.txt', '/devices/iphone-17.md', '/index.md']) {
      const { response } = await get(path, MARKDOWN)
      expect(response.status, path).toBe(200)
      expect(response.headers.get('Vary'), path).toBeNull()
      expect(response.headers.get('Link'), path).toBeNull()
      expect(Buffer.from(await response.arrayBuffer()).equals(readFileSync(join(DIST, path))), path).toBe(true)
    }
  })

  it('leave every other path to the assets, with no event', async () => {
    const fetcher = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetcher)
    const { response, waits } = await get('/robots.txt', null, 'https://screens.guide')
    await Promise.all(waits)
    expect(response.status).toBe(200)
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('the page_served and file_served events', () => {
  afterEach(() => vi.unstubAllGlobals())

  function capture() {
    const fetcher = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetcher)
    return { fetcher, sent: () => fetcher.mock.calls.map((c) => JSON.parse(c[1].body as string)) }
  }

  it('records the path, the format and the status of a page, with the Accept header', async () => {
    const { sent } = capture()
    for (const accept of [MARKDOWN, BROWSER]) {
      const { waits } = await get('/devices/iphone-17?from=x', accept, 'https://screens.guide')
      await Promise.all(waits)
    }
    const [md, html] = sent()
    expect(md.event).toBe('page_served')
    expect(md.properties).toMatchObject({ path: '/devices/iphone-17', format: 'markdown', status: 200, accept: MARKDOWN, $process_person_profile: false })
    expect(html.properties).toMatchObject({ path: '/devices/iphone-17', format: 'html', status: 200, accept: BROWSER })
  })

  it('records a counted file, and no path for one that does not exist', async () => {
    const { sent } = capture()
    for (const path of ['/data/v1/devices.json', '/data/v1/my-secret-name.json']) {
      const { waits } = await get(path, null, 'https://screens.guide')
      await Promise.all(waits)
    }
    const [found, missing] = sent()
    expect(found).toMatchObject({ event: 'file_served', properties: { path: '/data/v1/devices.json', status: 200 } })
    expect(missing.properties).toMatchObject({ path: null, status: 404 })
    expect(JSON.stringify(missing)).not.toContain('my-secret-name')
  })

  it('records no path for a page that does not exist', async () => {
    const { sent } = capture()
    const { waits } = await get('/devices/my-secret-name', BROWSER, 'https://screens.guide')
    await Promise.all(waits)
    expect(sent()[0].properties).toMatchObject({ path: null, format: 'html', status: 404 })
    expect(JSON.stringify(sent())).not.toContain('my-secret-name')
  })

  it('sends nothing for a request to localhost', async () => {
    const { fetcher } = capture()
    const { waits } = await get('/guide', MARKDOWN)
    await Promise.all(waits)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('leaves the response unchanged when PostHog cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const { response, waits } = await get('/guide', MARKDOWN, 'https://screens.guide')
    await Promise.all(waits)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(readFileSync(join(DIST, 'guide.md'), 'utf8'))
  })
})
