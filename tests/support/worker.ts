// A Worker env with the rate limiting binding and the Durable Object stubbed in memory, and a
// request helper for /mcp.
import { countRequest } from '../../worker/ratelimit.ts'
import type { Env } from '../../worker/types.ts'

export function stubEnv(opts: { minute?: number; day?: number } = {}) {
  const minute = new Map<string, number>()
  const rows = new Map<string, { row: { day: string; n: number } | null; writes: number }>()
  const env: Env = {
    ASSETS: { fetch: async () => new Response('asset') },
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
  return { env, ctx, waits, rows }
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
