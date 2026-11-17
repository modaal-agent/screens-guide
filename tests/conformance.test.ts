// The MCP endpoint under the official TypeScript SDK's client (spec 002 §6.1, phase 2), served by
// `wrangler dev` in workerd with the real rate limiting binding and Durable Object. Needs dist/:
// run `npm run build` first, as CI does.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')
const DAY_LIMIT = 30
const START_TIMEOUT = 60_000

/** A port the system reports free. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

const ping = (url: string) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'ping' }) })

let child: ChildProcess
let url: string
let persist: string
let log = ''
let requests = 0 // POSTs that passed the origin check, so each one counts against the day limit

beforeAll(async () => {
  if (!existsSync(join(ROOT, 'dist'))) throw new Error('dist/ is missing: run npm run build first')
  const [port, inspector] = [await freePort(), await freePort()]
  persist = mkdtempSync(join(tmpdir(), 'screens-guide-wrangler-'))
  child = spawn(join(ROOT, 'node_modules/.bin/wrangler'), [
    'dev', '--port', String(port), '--ip', '127.0.0.1', '--inspector-port', String(inspector),
    '--persist-to', persist, '--var', `MCP_DAY_LIMIT:${DAY_LIMIT}`,
  ], { cwd: ROOT, detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } })
  child.stdout!.on('data', (d) => { log += d })
  child.stderr!.on('data', (d) => { log += d })
  url = `http://127.0.0.1:${port}/mcp`
  const start = Date.now()
  for (;;) {
    if (child.exitCode !== null) throw new Error(`wrangler dev exited ${child.exitCode}:\n${log}`)
    try {
      requests++
      if ((await ping(url)).ok) break
    } catch {
      requests-- // nothing listened yet, so nothing was counted
    }
    if (Date.now() - start > START_TIMEOUT) throw new Error(`wrangler dev did not answer in ${START_TIMEOUT / 1000} s:\n${log}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}, START_TIMEOUT + 10_000)

afterAll(() => {
  if (child?.pid && child.exitCode === null) process.kill(-child.pid, 'SIGTERM')
  if (persist) rmSync(persist, { recursive: true, force: true })
})

describe('the MCP endpoint under the SDK client', () => {
  it('initializes, lists the five tools and calls each one with output its schema accepts', async () => {
    const client = new Client({ name: 'conformance', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url)))
    requests += 2 // initialize and notifications/initialized; the GET for a stream gets 405 before the limit
    expect(client.getServerVersion()).toMatchObject({ name: 'screens-guide', version: '1.0.0' })
    expect(client.getInstructions()).toContain('screens.guide')

    const { tools } = await client.listTools()
    requests++
    expect(tools.map((t) => t.name)).toEqual(['list_devices', 'get_device', 'compare_devices', 'check_layout', 'convert_units'])

    // callTool validates structuredContent against the tool's outputSchema and throws when it fails.
    const calls: [string, Record<string, unknown>][] = [
      ['list_devices', { platform: 'ios' }],
      ['get_device', { id: 'pixel-fold', screen: 'open' }],
      ['compare_devices', { ids: ['iphone-17', 'pixel-8', 'ipad-pro-13-m5'] }],
      ['check_layout', { device: 'iphone-17', frames: [{ name: 'card', x: 16, y: 700, width: 370, height: 158, cornerRadius: 46 }] }],
      ['convert_units', { device: 'pixel-8', values: [16], from: 'dp', to: 'px' }],
    ]
    for (const [name, args] of calls) {
      const result = await client.callTool({ name, arguments: args })
      requests++
      expect(result.isError, `${name}: ${JSON.stringify(result.content)}`).toBeFalsy()
      expect(result.structuredContent, name).toBeTruthy()
    }
    const failed = await client.callTool({ name: 'get_device', arguments: { id: 'iphone-99' } })
    requests++
    expect(failed.isError).toBe(true)
    await client.close()
  }, 30_000)

  it(`refuses request ${DAY_LIMIT + 1} of the UTC day with 429 and Retry-After`, async () => {
    expect(requests).toBeLessThanOrEqual(DAY_LIMIT)
    while (requests < DAY_LIMIT) {
      requests++
      expect((await ping(url)).status).toBe(200)
    }
    const refused = await ping(url)
    expect(refused.status, log).toBe(429)
    expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await refused.json()).error.message).toContain(`${DAY_LIMIT} requests a UTC day`)
  }, 30_000)
})
