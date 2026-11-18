// A Worker env with the rate limiting binding and the Durable Object stubbed in memory, the assets
// served from dist/, and a request helper for /mcp.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { countRequest } from '../../worker/ratelimit.ts'
import type { Env } from '../../worker/types.ts'

const DIST = join(import.meta.dirname, '..', '..', 'dist')
const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  json: 'application/json',
  csv: 'text/csv; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
}

/**
 * The assets binding over dist/, as wrangler.jsonc configures it: `/x` serves x.html, `/x/` redirects
 * to `/x`, a path with no file serves 404.html with status 404. It answers a matching If-None-Match
 * with 304, and records each path it was asked for.
 */
export function distAssets() {
  const asked: string[] = []
  const file = (path: string) => {
    const f = join(DIST, path)
    return existsSync(f) && statSync(f).isFile() ? f : null
  }
  const assets = {
    asked,
    fetch: async (input: Request | string) => {
      const request = typeof input === 'string' ? new Request(input) : input
      const { pathname } = new URL(request.url)
      asked.push(pathname)
      if (pathname.length > 1 && pathname.endsWith('/') && file(`${pathname.slice(0, -1)}.html`)) {
        return new Response(null, { status: 307, headers: { Location: pathname.slice(0, -1) } })
      }
      const found = pathname === '/' ? file('index.html') : /\.[a-z]+$/.test(pathname) ? file(pathname) : file(`${pathname}.html`)
      const path = found ?? join(DIST, '404.html')
      const body = readFileSync(path)
      const etag = `"${body.length}-${path.length}"`
      const headers = { 'Content-Type': TYPES[path.split('.').pop()!] ?? 'application/octet-stream', ETag: etag }
      if (found && request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers })
      return new Response(request.method === 'HEAD' ? null : body, { status: found ? 200 : 404, headers })
    },
  }
  return assets
}

export function stubEnv(opts: { minute?: number; day?: number } = {}) {
  const minute = new Map<string, number>()
  const rows = new Map<string, { row: { day: string; n: number } | null; writes: number }>()
  const assets = distAssets()
  const env: Env = {
    ASSETS: assets,
    MCP_MINUTE: {
      limit: async ({ key }) => {
        const n = (minute.get(key) ?? 0) + 1
        minute.set(key, n)
        return { success: n <= (opts.minute ?? 100) }
      },
    },
    DAILY_COUNT: {
      idFromName: (name) => name,
      get: (id) => ({
        fetch: async (input) => {
          const url = new URL(typeof input === 'string' ? input : input.url)
          const s = rows.get(id as string) ?? { row: null, writes: 0 }
          rows.set(id as string, s)
          const store = { read: () => s.row, write: (day: string, n: number) => { s.row = { day, n }; s.writes++ } }
          return Response.json(countRequest(store, url.searchParams.get('day')!, Number(url.searchParams.get('limit'))))
        },
      }),
    },
    MCP_DAY_LIMIT: opts.day === undefined ? undefined : String(opts.day),
  }
  const waits: Promise<unknown>[] = []
  const ctx = { waitUntil: (p: Promise<unknown>) => { waits.push(p) } }
  return { env, ctx, waits, rows, assets }
}

export function post(body: unknown, headers: Record<string, string> = {}, host = 'http://localhost'): Request {
  return new Request(`${host}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

export const call = (id: number, name: string, args: Record<string, unknown>) =>
  ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } })
