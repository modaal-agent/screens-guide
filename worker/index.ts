// The Worker in front of the site's static assets. `run_worker_first` in wrangler.jsonc sends the
// routes of worker/routes.ts here: /mcp, the page routes and the counted files. Every other request
// is an asset, served by Cloudflare without this script, or reaches it only when no asset matches.

import { sendEvents, shouldSend } from './analytics.ts'
import { type EventProperties, SECURITY_HEADERS, handlePost, jsonResponse } from './mcp.ts'
import { DailyCount, checkRateLimit } from './ratelimit.ts'
import { routeKind } from './routes.ts'
import { serveFile, servePage } from './site.ts'
import type { Env, ExecutionContext } from './types.ts'

export { DailyCount }

/** Origins allowed to call /mcp from a browser; a request without an Origin is served (D3). */
export const ALLOWED_ORIGINS = ['https://screens.guide']

async function mcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('The MCP endpoint takes POST only: one JSON-RPC message or an array of them.\n', {
      status: 405, headers: { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS },
    })
  }
  const origin = request.headers.get('Origin')
  if (origin !== null && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Requests from this origin are not served.' } }, 403)
  }
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const refusal = await checkRateLimit(env, address)
  let response: Response
  let events: EventProperties[]
  if (refusal) {
    response = jsonResponse(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: refusal.message } },
      429,
      { 'Retry-After': String(refusal.retryAfter) },
    )
    events = [{ rate_limited: refusal.window, status: 429 }]
  } else {
    ({ response, events } = await handlePost(request))
  }
  if (shouldSend(new URL(request.url))) ctx.waitUntil(sendEvents('mcp_request', events, request))
  return response
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const kind = routeKind(url.pathname)
    if (kind === 'mcp') return mcp(request, env, ctx)
    if (kind === 'other') return env.ASSETS.fetch(request) // a path with no asset: the 404 page, uncounted
    const { response, event } = kind === 'page' ? await servePage(request, env, url) : await serveFile(request, env, url)
    if (shouldSend(url)) ctx.waitUntil(sendEvents(kind === 'page' ? 'page_served' : 'file_served', [event], request))
    return response
  },
}
