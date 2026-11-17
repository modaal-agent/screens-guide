// The pages and the counted files (spec 002 §3, §2.5). A page answers with its HTML, or with its
// .md copy when the request's Accept prefers Markdown; both come from the assets, so the Markdown is
// the copy the build writes from the dataset (D4). A counted file is the asset, unchanged.

import { markdownPath } from '../src/lib/doc.ts'
import type { Env } from './types.ts'

/** The quality an Accept header gives a media type it names exactly, or null when it does not name it. */
export function acceptQuality(accept: string, type: string): number | null {
  let quality: number | null = null
  for (const part of accept.split(',')) {
    const [media, ...params] = part.split(';').map((s) => s.trim().toLowerCase())
    if (media !== type) continue
    let q = 1
    for (const param of params) {
      const m = /^q\s*=\s*([0-9.]+)$/.exec(param)
      if (m) q = Number(m[1])
    }
    if (Number.isFinite(q)) quality = Math.max(quality ?? 0, Math.min(q, 1))
  }
  return quality
}

/** True when Accept names text/markdown with a quality above 0 and at least text/html's, or names it and not text/html. */
export function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false
  const markdown = acceptQuality(accept, 'text/markdown')
  if (!markdown) return false
  const html = acceptQuality(accept, 'text/html')
  return html === null || markdown >= html
}

/** The path an event records: a page or file that exists, else null, so no text a client made up reaches PostHog. */
function eventPath(url: URL, status: number): string | null {
  return (status >= 200 && status < 300) || status === 304 ? url.pathname : null
}

export interface Served {
  response: Response
  event: Record<string, unknown>
}

/** A page route: the HTML with a Link to its copy, or the copy itself; both vary on Accept. */
export async function servePage(request: Request, env: Env, url: URL): Promise<Served> {
  const negotiated = request.method === 'GET' || request.method === 'HEAD'
  const copy = markdownPath(url.pathname)
  if (negotiated && wantsMarkdown(request.headers.get('Accept'))) {
    const md = await env.ASSETS.fetch(new Request(new URL(copy, url), request))
    // No copy at that path (an unknown device, a trailing slash): the HTML answers, with its 404 page or redirect.
    if (md.status !== 404) {
      const response = new Response(md.body, md)
      if (md.status === 200) response.headers.set('Content-Type', 'text/markdown; charset=utf-8')
      response.headers.append('Vary', 'Accept')
      return { response, event: { path: eventPath(url, md.status), format: 'markdown', status: md.status } }
    }
  }
  const html = await env.ASSETS.fetch(request)
  const response = new Response(html.body, html)
  if (negotiated) response.headers.append('Vary', 'Accept')
  if (html.status === 200 && response.headers.get('Content-Type')?.startsWith('text/html')) {
    response.headers.set('Link', `<${copy}>; rel="alternate"; type="text/markdown"`)
  }
  return { response, event: { path: eventPath(url, html.status), format: 'html', status: html.status } }
}

/** A counted file: the asset as Cloudflare would serve it. */
export async function serveFile(request: Request, env: Env, url: URL): Promise<Served> {
  const response = await env.ASSETS.fetch(request)
  return { response, event: { path: eventPath(url, response.status), status: response.status } }
}
