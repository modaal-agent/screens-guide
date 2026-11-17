// /mcp's rate limit (spec 002 §2.6): 100 requests a minute through the rate limiting binding, and
// 1,000 a UTC day counted by a Durable Object per client address. The object's name is the
// SHA-256 of the address, so no address is stored.

import type { Env } from './types.ts'

export const MINUTE_LIMIT = 100
export const DAY_LIMIT = 1000

export type Refusal = { window: 'minute' | 'day'; retryAfter: number; message: string }

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The UTC date of `now`, and the seconds left until the next UTC midnight. */
export function utcDay(now: Date): { day: string; secondsLeft: number } {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return { day: now.toISOString().slice(0, 10), secondsLeft: Math.max(1, Math.ceil((next - now.getTime()) / 1000)) }
}

/** The minute window, then the day window; null when the request may go on. */
export async function checkRateLimit(env: Env, address: string, now = new Date()): Promise<Refusal | null> {
  if (env.MCP_MINUTE) {
    const { success } = await env.MCP_MINUTE.limit({ key: address })
    if (!success) {
      return { window: 'minute', retryAfter: 60, message: `Rate limit: ${MINUTE_LIMIT} requests a minute per client address. Try again in 60 s.` }
    }
  }
  const limit = Number(env.MCP_DAY_LIMIT ?? DAY_LIMIT) || DAY_LIMIT
  const { day, secondsLeft } = utcDay(now)
  const stub = env.DAILY_COUNT.get(env.DAILY_COUNT.idFromName(await sha256Hex(address)))
  const res = await stub.fetch(`https://daily-count/?day=${day}&limit=${limit}`)
  const { allowed } = (await res.json()) as { allowed: boolean }
  if (allowed) return null
  return {
    window: 'day', retryAfter: secondsLeft,
    message: `Rate limit: ${limit.toLocaleString('en-US')} requests a UTC day per client address. It resets at 00:00 UTC, in ${secondsLeft} s.`,
  }
}

export interface DayStore {
  read(): { day: string; n: number } | null
  write(day: string, n: number): void
}

/** One address's count for the current UTC day. A request on a new date replaces the row; a refused one writes nothing. */
export function countRequest(store: DayStore, day: string, limit: number): { allowed: boolean; count: number } {
  const row = store.read()
  if (!row || row.day !== day) {
    store.write(day, 1)
    return { allowed: true, count: 1 }
  }
  if (row.n >= limit) return { allowed: false, count: row.n }
  store.write(day, row.n + 1)
  return { allowed: true, count: row.n + 1 }
}

interface SqlStorage {
  exec(query: string, ...bindings: unknown[]): { toArray(): Record<string, unknown>[] }
}

/** The Durable Object: one SQLite row, the UTC date and the count. */
export class DailyCount {
  private sql: SqlStorage

  constructor(state: { storage: { sql: SqlStorage } }) {
    this.sql = state.storage.sql
    this.sql.exec('CREATE TABLE IF NOT EXISTS daily (id INTEGER PRIMARY KEY CHECK (id = 1), day TEXT NOT NULL, n INTEGER NOT NULL)')
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const store: DayStore = {
      read: () => {
        const row = this.sql.exec('SELECT day, n FROM daily WHERE id = 1').toArray()[0]
        return row ? { day: String(row.day), n: Number(row.n) } : null
      },
      write: (day, n) => {
        this.sql.exec('INSERT OR REPLACE INTO daily (id, day, n) VALUES (1, ?, ?)', day, n)
      },
    }
    return Response.json(countRequest(store, url.searchParams.get('day') ?? '', Number(url.searchParams.get('limit')) || DAY_LIMIT))
  }
}
