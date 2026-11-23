// The MCP endpoint of spec 002 §2, driven through the Worker's fetch with its bindings stubbed.
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it, vi } from 'vitest'
import worker from '../worker/index.ts'
import { MAX_BODY, SUPPORTED_VERSIONS } from '../worker/mcp.ts'
import { DailyCount, checkRateLimit } from '../worker/ratelimit.ts'
import { MAX_MAGNITUDE, TOOLS } from '../worker/tools.ts'
import { LIVE_CASES, matches } from './support/mcp-cases.ts'
import { call, post, stubEnv } from './support/worker.ts'

const Ajv = ((Ajv2020 as any).default ?? Ajv2020) as typeof Ajv2020

async function send(body: unknown, headers: Record<string, string> = {}) {
  const { env, ctx } = stubEnv()
  const res = await worker.fetch(post(body, headers), env, ctx)
  const text = await res.text()
  return { res, json: text ? JSON.parse(text) : null }
}

const from = (address: string) => ({ 'CF-Connecting-IP': address })

async function tool(name: string, args: Record<string, unknown>) {
  const { json } = await send(call(1, name, args))
  return json.result as { structuredContent?: any; content: { type: string; text: string }[]; isError?: boolean }
}

describe('the protocol', () => {
  it('answers initialize with the version the client asks for when supported, else 2025-11-25', async () => {
    for (const v of SUPPORTED_VERSIONS) {
      const { json } = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: v, capabilities: {}, clientInfo: { name: 't', version: '1' } } })
      expect(json.result.protocolVersion).toBe(v)
    }
    const { json } = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2099-01-01', capabilities: {} } })
    expect(json.result).toMatchObject({
      protocolVersion: '2025-11-25',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'screens-guide', version: '1.0.0' },
    })
    expect(json.result.instructions).toMatch(/points \(pt\) on iOS, density-independent pixels \(dp\) on Android/)
  })

  it('refuses an unsupported MCP-Protocol-Version header with 400', async () => {
    const { res } = await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'MCP-Protocol-Version': '2099-01-01' })
    expect(res.status).toBe(400)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'MCP-Protocol-Version': '2025-06-18' })).res.status).toBe(200)
  })

  it('serves no Origin and the site\'s own, and refuses any other with 403', async () => {
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, { Origin: 'https://screens.guide' })).res.status).toBe(200)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, { Origin: 'https://example.com' })).res.status).toBe(403)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, { Origin: 'null' })).res.status).toBe(403)
  })

  it('answers GET and DELETE with 405 and Allow: POST', async () => {
    const { env, ctx } = stubEnv()
    for (const method of ['GET', 'DELETE']) {
      const res = await worker.fetch(new Request('http://localhost/mcp', { method }), env, ctx)
      expect(res.status).toBe(405)
      expect(res.headers.get('Allow')).toBe('POST')
    }
  })

  it('answers a notification with 202 and no body', async () => {
    const { res, json } = await send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(res.status).toBe(202)
    expect(json).toBeNull()
  })

  it('returns -32601 for an unknown method, -32700 for malformed JSON and -32602 for bad params', async () => {
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'resources/list' })).json.error.code).toBe(-32601)
    const bad = await send('{"jsonrpc":')
    expect(bad.res.status).toBe(400)
    expect(bad.json.error.code).toBe(-32700)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nope' } })).json.error.code).toBe(-32602)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: 'x' })).json.error.code).toBe(-32602)
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_device', arguments: [] } })).json.error.code).toBe(-32602)
  })

  it('refuses a body over 64 KiB with 413', async () => {
    const { res } = await send({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(MAX_BODY) } })
    expect(res.status).toBe(413)
  })

  it('answers an array of messages with an array of responses, notifications left out', async () => {
    const { json } = await send([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 'b', method: 'tools/list' },
    ])
    expect(json.map((r: { id: unknown }) => r.id)).toEqual([1, 'b'])
    expect(json[1].result.tools.map((t: { name: string }) => t.name)).toEqual(['list_devices', 'get_device', 'compare_devices', 'check_layout', 'convert_units'])
  })

  it('declares each tool read-only, idempotent and closed-world', async () => {
    const { json } = await send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    for (const t of json.result.tools) {
      expect(t.annotations, t.name).toEqual({ readOnlyHint: true, idempotentHint: true, openWorldHint: false })
      expect(t.outputSchema.type, t.name).toBe('object')
      expect(t.inputSchema.type, t.name).toBe('object')
    }
  })
})

describe('the tools', () => {
  it('declare input schemas in the keywords worker/arguments.ts checks, and no other', () => {
    const CHECKED = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems'])
    const NOTES = new Set(['description', 'title', 'default', 'examples'])
    const walk = (schema: Record<string, unknown>, path: string) => {
      for (const [key, value] of Object.entries(schema)) {
        expect(CHECKED.has(key) || NOTES.has(key), `${path}: ${key}`).toBe(true)
        if (key === 'properties') for (const [name, sub] of Object.entries(value as object)) walk(sub, `${path}.${name}`)
        if (key === 'items') walk(value as Record<string, unknown>, `${path}[]`)
      }
    }
    for (const t of TOOLS) walk(t.inputSchema as Record<string, unknown>, t.name)
  })

  const ajv = new Ajv({ strict: false, allErrors: true })
  const validators = new Map(TOOLS.map((t) => [t.name, ajv.compile(t.outputSchema)]))

  async function ok(name: string, args: Record<string, unknown>) {
    const r = await tool(name, args)
    expect(r.isError, r.content[0].text).toBeUndefined()
    const valid = validators.get(name)!
    expect(valid(r.structuredContent), JSON.stringify(valid.errors)).toBe(true)
    expect(JSON.parse(r.content[0].text)).toEqual(r.structuredContent)
    return r.structuredContent
  }

  it('lists the devices, filtered by platform and kind', async () => {
    expect((await ok('list_devices', {})).devices).toHaveLength(22)
    const foldables = (await ok('list_devices', { platform: 'android', kind: 'foldable' })).devices
    expect(foldables.map((d: { id: string }) => d.id)).toEqual(['pixel-fold', 'pixel-9-pro-fold'])
    const fold = foldables[0]
    expect(fold.screens.map((s: { id: string }) => s.id)).toEqual(['closed', 'open', 'half-open'])
    for (const s of fold.screens) expect(s.window.width).toBeLessThanOrEqual(s.window.height)
  })

  it("gets a device's current readings, or a runtime's, narrowed by screen and orientation", async () => {
    const cur = await ok('get_device', { id: 'iphone-17' })
    expect(cur.runtime.build).toBe('24A434')
    expect(cur.readings.every((r: { runtime: { build: string } }) => r.runtime.build === '24A434')).toBe(true)
    const v272 = await ok('get_device', { id: 'iphone-17', runtime: '27.2', orientation: 'portrait' })
    expect(v272.runtime.build).toBe('24B8117')
    expect(v272.readings.map((r: { orientation: string }) => r.orientation)).toEqual(['portrait'])
    const open = await ok('get_device', { id: 'pixel-fold', screen: 'open', rotation: 90 })
    expect(open.readings).toHaveLength(1)
    expect(open.readings[0]).toMatchObject({ screen: 'open', rotation: 90 })
  })

  it('names the valid ids, runtimes and screens when an argument names none', async () => {
    const unknown = await tool('get_device', { id: 'iphone-99' })
    expect(unknown.isError).toBe(true)
    expect(unknown.content[0].text).toContain('iphone-17')
    expect((await tool('get_device', { id: 'iphone-17', runtime: '9.9' })).content[0].text).toContain('24A434')
    expect((await tool('get_device', { id: 'iphone-17', screen: 'open' })).content[0].text).toContain('Its screens: main')
    const bad = await tool('check_layout', { device: 'iphone-17', frames: [{ name: 'a', x: 0, y: 0, width: -1, height: 1 }], extra: 1 })
    expect(bad.isError).toBe(true)
    expect(bad.content[0].text).toMatch(/width must be at least 0.*extra is not an argument/)
  })

  it('compares devices, and lists the ones with no reading for the runtime asked', async () => {
    const c = await ok('compare_devices', { ids: ['iphone-17', 'pixel-8'] })
    expect(c.rows.map((r: { id: string }) => r.id)).toEqual(['iphone-17', 'pixel-8'])
    expect(c.rows[0]).toMatchObject({ safeArea: { x: 0, y: 62, width: 402, height: 778 }, pixelsPerUnit: 3 })
    const v = await ok('compare_devices', { ids: ['iphone-17', 'pixel-8'], runtime: '27.2' })
    expect(v.rows.map((r: { id: string }) => r.id)).toEqual(['iphone-17'])
    expect(v.missing[0].id).toBe('pixel-8')
  })

  it("reports the docs article's corner cases on the iPhone 17 (radius 62 pt)", async () => {
    const out = await ok('check_layout', {
      device: 'iphone-17',
      frames: [
        { name: 'on the safe area', x: 16, y: 700, width: 370, height: 140 },
        { name: 'square at 16', x: 16, y: 700, width: 370, height: 158 },
        { name: 'concentric at 16', x: 16, y: 700, width: 370, height: 158, cornerRadius: 46 },
      ],
    })
    const [onSafe, square, concentric] = out.frames
    expect(onSafe.findings).toContainEqual({ type: 'near-corner', corner: 'bottomLeft', gap: 8.15, concentricRadius: 28 })
    expect(square.findings).toContainEqual({ type: 'cut-by-corner', corner: 'bottomLeft', depth: 3.05, concentricRadius: 46 })
    expect(concentric.findings).toContainEqual({ type: 'near-corner', corner: 'bottomLeft', gap: 16, concentricRadius: 46 })
    expect(square.findings).toContainEqual({ type: 'in-inset', edge: 'bottom', depth: 18 })
  })

  it('reports frames outside the window, under a bar, across a fold and in a reserved region', async () => {
    const ios = await ok('check_layout', { device: 'iphone-17', frames: [{ name: 'header', x: -4, y: 0, width: 410, height: 100 }] })
    const f = ios.frames[0].findings
    expect(f).toContainEqual({ type: 'outside-window', overhang: { top: 0, bottom: 0, left: 4, right: 4 } })
    expect(f).toContainEqual(expect.objectContaining({ type: 'under-system-bar', bar: 'status' }))
    expect(f).toContainEqual(expect.objectContaining({ type: 'under-system-bar', bar: 'navigation' }))
    const fold = await ok('check_layout', { device: 'pixel-fold', screen: 'half-open', frames: [{ name: 'list', x: 0, y: 100, width: 841, height: 400 }] })
    expect(fold.frames[0].findings).toContainEqual({ type: 'crosses-fold', axis: 'vertical', separates: true })
    const duo = await ok('get_device', { id: 'iphone-duo', screen: 'open' })
    const region = duo.readings.find((r: { regions: unknown[] | null }) => r.regions?.length)
    const g = region.regions[0].frame
    const hit = await ok('check_layout', {
      device: 'iphone-duo', screen: 'open', rotation: region.rotation,
      frames: [{ name: 'over the camera', x: g.x, y: g.y, width: g.width, height: g.height }],
    })
    expect(hit.frames[0].findings).toContainEqual(expect.objectContaining({ type: 'in-occlusion-region', kind: region.regions[0].kind }))
  })

  it("converts between a device's unit and px, with Compose's roundToPx on Android", async () => {
    const a = await ok('convert_units', { device: 'pixel-8', values: [16, 0.5, 24.1], from: 'dp', to: 'px' })
    expect(a.values).toEqual([
      { value: 16, result: 42, roundToPx: 42 },
      { value: 0.5, result: 1.3125, roundToPx: 1 },
      { value: 24.1, result: 63.2625, roundToPx: 63 },
    ])
    const b = await ok('convert_units', { device: 'iphone-17', values: [1], from: 'px', to: 'pt' })
    expect(b.values[0].result).toBe(0.3333)
    expect((await tool('convert_units', { device: 'iphone-17', values: [1], from: 'dp', to: 'px' })).isError).toBe(true)
  })

  // The defects of the live test of 2026-11-23 (spec 002 §5.1), one test per decision.
  it('refuses an orientation and a rotation that disagree, naming the rotation (D13)', async () => {
    for (const [name, args] of [
      ['get_device', { id: 'iphone-17', orientation: 'portrait', rotation: 90 }],
      ['check_layout', { device: 'iphone-17', orientation: 'portrait', rotation: 90, frames: [{ name: 'a', x: 0, y: 0, width: 1, height: 1 }] }],
    ] as const) {
      const r = await tool(name, args)
      expect(r.isError, name).toBe(true)
      expect(r.content[0].text).toBe("Rotation 90 gives the iPhone 17's main screen a landscape window, not portrait. Give orientation or rotation, or a pair that agrees.")
    }
    const fold = await tool('get_device', { id: 'pixel-fold', screen: 'open', orientation: 'portrait', rotation: 0 })
    expect(fold.content[0].text).toMatch(/^Rotation 0 gives the Pixel Fold's open screen a landscape window, not portrait/)
    expect((await ok('get_device', { id: 'iphone-17', orientation: 'landscape', rotation: 90 })).readings).toHaveLength(1)
  })

  it("names a version's build by the device's current build when the version is current (D14)", async () => {
    const duo = await ok('get_device', { id: 'iphone-duo', runtime: '27.1' })
    const current = await ok('get_device', { id: 'iphone-duo' })
    expect(duo.runtime.build).toBe('24A94232')
    expect(duo.readings).toEqual(current.readings)
    expect((await ok('get_device', { id: 'iphone-duo', runtime: '24A94425' })).runtime.build).toBe('24A94425')
  })

  it('gives pixels per unit unrounded, and refuses a length beyond ±1,000,000 (D15)', async () => {
    expect((await ok('convert_units', { device: 'pixel-8', values: [1], from: 'dp', to: 'px' })).pixelsPerUnit).toBe(2.625)
    const rows = (await ok('compare_devices', { ids: ['pixel-8', 'pixel-9-pro-fold'] })).rows
    expect(rows.map((r: { pixelsPerUnit: number }) => r.pixelsPerUnit)).toEqual([2.625, 2.4375, 2.4375, 2.4375])
    expect((await ok('convert_units', { device: 'pixel-8', values: [MAX_MAGNITUDE, -MAX_MAGNITUDE], from: 'dp', to: 'px' })).values[0]).toEqual({ value: 1e6, result: 2625000, roundToPx: 2625000 })
    const big = await tool('convert_units', { device: 'pixel-8', values: [1e39], from: 'dp', to: 'px' })
    expect(big.content[0].text).toContain('arguments.values[0] must be at most 1000000')
    const far = await tool('check_layout', { device: 'iphone-17', frames: [{ name: 'a', x: -1e7, y: 0, width: 1e308, height: 1 }] })
    expect(far.content[0].text).toMatch(/frames\[0\]\.x must be at least -1000000.*frames\[0\]\.width must be at most 1000000/)
  })

  it('refuses a device named twice in compare_devices (D16)', async () => {
    const r = await tool('compare_devices', { ids: ['iphone-17', 'pixel-8', 'iphone-17'] })
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toContain('arguments.ids must not repeat an item: "iphone-17" appears more than once')
  })

  it("caps the concentric radius at half the frame's shorter side and at the display's radius (D17)", async () => {
    const out = await ok('check_layout', {
      device: 'iphone-17',
      frames: [{ name: 'tiny', x: 4, y: 4, width: 20, height: 20 }, { name: 'off', x: -10, y: -10, width: 50, height: 50 }, { name: 'wide', x: -10, y: -10, width: 422, height: 300 }],
    })
    const radius = (i: number) => out.frames[i].findings.find((f: { corner?: string }) => f.corner === 'topLeft').concentricRadius
    expect([radius(0), radius(1), radius(2)]).toEqual([10, 25, 62])
  })

  it('names the keys a tool or a frame takes when given another, and counts in the singular for one', async () => {
    expect((await tool('get_device', { device: 'iphone-17' })).content[0].text)
      .toBe('Invalid arguments for get_device: arguments.id is required; arguments.device is not an argument of this tool; its arguments are id, screen, orientation, rotation, runtime.')
    expect((await tool('check_layout', { device: 'iphone-17', frames: [{ name: 'a', x: 0, y: 0, w: 1, height: 1 }] })).content[0].text)
      .toContain('arguments.frames[0].w is not a key of arguments.frames[0]; its keys are name, x, y, width, height, cornerRadius')
    expect((await tool('convert_units', { device: 'pixel-8', values: [], from: 'dp', to: 'px' })).content[0].text)
      .toContain('arguments.values must have at least 1 item.')
  })

  it.each(LIVE_CASES.map((c, i) => [i, c.tool, JSON.stringify(c.args).slice(0, 80), c] as const))(
    'replays live case %i: %s %s',
    async (_i, name, _args, c) => {
      const r = await tool(name, c.args)
      if (c.expect === 'error') {
        expect(r.isError, r.content[0].text).toBe(true)
        if (c.error) expect(r.content[0].text).toContain(c.error)
        return
      }
      const sc = await ok(name, c.args)
      if (c.match) expect(matches(sc, c.match)).toEqual([])
    },
  )
})

describe('the rate limit', () => {
  const ping = { jsonrpc: '2.0', id: 1, method: 'ping' }

  it('refuses the 101st request in a minute from one address, with Retry-After, and serves another address', async () => {
    const { env, ctx, rows } = stubEnv()
    for (let i = 0; i < 100; i++) expect((await worker.fetch(post(ping, from('192.0.2.1')), env, ctx)).status).toBe(200)
    const writes = [...rows.values()][0].writes
    const refused = await worker.fetch(post(ping, from('192.0.2.1')), env, ctx)
    expect(refused.status).toBe(429)
    expect(refused.headers.get('Retry-After')).toBe('60')
    expect((await refused.json()).error).toMatchObject({ code: -32000 })
    expect([...rows.values()][0].writes).toBe(writes) // the minute window refused it before the Durable Object
    expect((await worker.fetch(post(ping, from('192.0.2.2')), env, ctx)).status).toBe(200)
  })

  it('refuses the 1,001st request in a UTC day', async () => {
    const { env, ctx } = stubEnv({ minute: Infinity })
    for (let i = 0; i < 1000; i++) await worker.fetch(post(ping, from('192.0.2.3')), env, ctx)
    const refused = await worker.fetch(post(ping, from('192.0.2.3')), env, ctx)
    expect(refused.status).toBe(429)
    expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await refused.json()).error.message).toContain('1,000 requests a UTC day')
  })

  it('serves the first request of a new UTC date after a refused day, and counts the refused ones nowhere', async () => {
    const { env, rows } = stubEnv({ minute: Infinity, day: 2 })
    const late = new Date('2026-11-17T23:59:58Z')
    expect(await checkRateLimit(env, '192.0.2.5', late)).toBeNull()
    expect(await checkRateLimit(env, '192.0.2.5', late)).toBeNull()
    expect(await checkRateLimit(env, '192.0.2.5', late)).toMatchObject({ window: 'day', retryAfter: 2 })
    expect([...rows.values()][0]).toMatchObject({ row: { day: '2026-11-17', n: 2 }, writes: 2 })
    expect(await checkRateLimit(env, '192.0.2.5', new Date('2026-11-18T00:00:00Z'))).toBeNull()
    expect([...rows.values()][0].row).toEqual({ day: '2026-11-18', n: 1 })
  })

  it("keeps the Durable Object's count in one SQLite row", async () => {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(':memory:')
    const sql = {
      exec: (query: string, ...bindings: unknown[]) => {
        const statement = db.prepare(query)
        const rows = /^\s*SELECT/i.test(query) ? statement.all(...(bindings as never[])) : (statement.run(...(bindings as never[])), [])
        return { toArray: () => rows as Record<string, unknown>[] }
      },
    }
    const object = new DailyCount({ storage: { sql } })
    const ask = async (day: string) => (await (await object.fetch(new Request(`https://daily-count/?day=${day}&limit=2`))).json())
    expect(await ask('2026-11-17')).toEqual({ allowed: true, count: 1 })
    expect(await ask('2026-11-17')).toEqual({ allowed: true, count: 2 })
    expect(await ask('2026-11-17')).toEqual({ allowed: false, count: 2 })
    expect(await ask('2026-11-18')).toEqual({ allowed: true, count: 1 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM daily').get()).toEqual({ n: 1 })
  })

  it('stores no address, only its SHA-256', async () => {
    const { env, ctx, rows } = stubEnv()
    await worker.fetch(post(ping, from('192.0.2.4')), env, ctx)
    const [name] = [...rows.keys()]
    expect(name).toMatch(/^[0-9a-f]{64}$/)
    expect(name).not.toContain('192.0.2.4')
  })
})

describe('the usage events', () => {
  function capture(answer: () => Promise<Response>) {
    const fetcher = vi.fn((_url: string, _init: RequestInit) => answer())
    vi.stubGlobal('fetch', fetcher)
    return fetcher
  }
  const sent = (fetcher: ReturnType<typeof capture>, i: number) => fetcher.mock.calls[i][1].body as string

  it('sends one mcp_request per message for screens.guide, and none for localhost', async () => {
    const fetcher = capture(async () => new Response('{}'))
    const { env, ctx, waits } = stubEnv()
    await worker.fetch(post([{ jsonrpc: '2.0', id: 1, method: 'ping' }, call(2, 'get_device', { id: 'iphone-17', runtime: 'secret build' })], {}, 'https://screens.guide'), env, ctx)
    await Promise.all(waits)
    expect(fetcher).toHaveBeenCalledTimes(2)
    const bodies = fetcher.mock.calls.map((_, i) => JSON.parse(sent(fetcher, i)))
    expect(bodies.map((b) => b.event)).toEqual(['mcp_request', 'mcp_request'])
    expect(bodies[1].properties).toMatchObject({ method: 'tools/call', tool: 'get_device', devices: ['iphone-17'], isError: true, status: 200, $process_person_profile: false, $geoip_disable: true })
    expect(bodies[1].properties.runtime).toBeUndefined() // a value the dataset does not know is text the client sent
    expect(bodies[0].distinct_id).not.toBe(bodies[1].distinct_id)
    fetcher.mockClear()
    await worker.fetch(post({ jsonrpc: '2.0', id: 1, method: 'ping' }), env, ctx)
    await Promise.all(waits)
    expect(fetcher).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('carries no check_layout frame and no client address', async () => {
    const fetcher = capture(async () => new Response('{}'))
    const { env, ctx, waits } = stubEnv()
    await worker.fetch(post(call(1, 'check_layout', { device: 'iphone-17', frames: [{ name: 'my-secret-frame', x: 12.5, y: 7.25, width: 3, height: 4 }] }), from('198.51.100.9'), 'https://screens.guide'), env, ctx)
    await Promise.all(waits)
    const body = sent(fetcher, 0)
    expect(body).not.toContain('my-secret-frame')
    expect(body).not.toContain('12.5')
    expect(body).not.toContain('198.51.100.9')
    expect(JSON.parse(body).properties.frames).toBe(1)
    vi.unstubAllGlobals()
  })

  it('leaves the response unchanged when PostHog answers 500 or cannot be reached', async () => {
    for (const answer of [async () => new Response('', { status: 500 }), async () => { throw new Error('offline') }]) {
      capture(answer)
      const { env, ctx, waits } = stubEnv()
      const res = await worker.fetch(post({ jsonrpc: '2.0', id: 7, method: 'ping' }, {}, 'https://screens.guide'), env, ctx)
      await Promise.all(waits)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 7, result: {} })
      vi.unstubAllGlobals()
    }
  })

  it('counts a refused request with the window that refused it', async () => {
    const fetcher = capture(async () => new Response('{}'))
    const { env, ctx, waits } = stubEnv({ minute: 0 })
    await worker.fetch(post({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, 'https://screens.guide'), env, ctx)
    await Promise.all(waits)
    expect(JSON.parse(sent(fetcher, 0)).properties).toMatchObject({ rate_limited: 'minute', status: 429 })
    vi.unstubAllGlobals()
  })
})
