// The MCP endpoint's protocol (spec 002 §2.1): Streamable HTTP without a stream or a session. One
// POST carries a JSON-RPC message or an array of them, and gets one application/json body.

import { DATA } from '../src/lib/data.ts'
import { checkArguments } from './arguments.ts'
import { TOOLS, ToolError, toolEventProperties } from './tools.ts'

export const LATEST_VERSION = '2025-11-25'
export const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
export const MAX_BODY = 64 * 1024

export const INSTRUCTIONS = [
  'screens.guide: measured screen sizes, safe-area insets, corner radii, system bars, margins and folds of iPhones, iPads and Android devices, read on Xcode simulators and Android emulators.',
  "Lengths are in the device's unit: points (pt) on iOS, density-independent pixels (dp) on Android; px are physical pixels. Positions are window coordinates from the window's top left. A value no run measured is null, with its reason in the reading's `missing`; never fill it from another device.",
  'Tools: list_devices gives the device ids; get_device a device\'s readings; compare_devices several devices side by side; check_layout checks frames against a device\'s safe area, corners, bars and fold; convert_units converts between pt or dp and px.',
  `Dataset ${DATA.version} of ${DATA.updated}, licensed CC BY 4.0: credit "screens.guide, measured by Modaal".`,
].join('\n')

/**
 * public/_headers does not reach a response the script builds (measured with wrangler dev, spec 002
 * §1.9), so the script sends the security headers itself.
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
}

export const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS }

type Id = string | number | null
export type EventProperties = Record<string, unknown>

const ERROR = { parse: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602 } as const

function error(id: Id, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function result(id: Id, value: unknown) {
  return { jsonrpc: '2.0', id, result: value }
}

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } })
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const short = (v: unknown) => (typeof v === 'string' ? v.slice(0, 100) : undefined)

function toolList() {
  return {
    tools: TOOLS.map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({
      name, title, description, inputSchema, outputSchema, annotations,
    })),
  }
}

function callTool(id: Id, params: Record<string, unknown>, event: EventProperties) {
  const tool = TOOLS.find((t) => t.name === params.name)
  if (typeof params.name !== 'string' || !tool) {
    return error(id, ERROR.invalidParams, `Unknown tool ${JSON.stringify(params.name)}. The tools: ${TOOLS.map((t) => t.name).join(', ')}.`)
  }
  const args = params.arguments ?? {}
  if (!isObject(args)) return error(id, ERROR.invalidParams, 'params.arguments must be an object')
  Object.assign(event, toolEventProperties(tool.name, args))
  const fail = (text: string) => {
    event.isError = true
    return result(id, { content: [{ type: 'text', text }], isError: true })
  }
  const problems = checkArguments(tool.inputSchema, args)
  if (problems.length) return fail(`Invalid arguments for ${tool.name}: ${problems.join('; ')}.`)
  try {
    const structured = tool.run(args)
    event.isError = false
    return result(id, { content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured })
  } catch (e) {
    if (e instanceof ToolError) return fail(e.message)
    console.error('tool failed', tool.name, e)
    return fail(`${tool.name} failed on the server; nothing in the arguments caused it.`)
  }
}

/** One message's response, or null for a notification or a response; its usage event in `event`. */
export function handleMessage(msg: unknown, event: EventProperties): object | null {
  if (!isObject(msg) || msg.jsonrpc !== '2.0') {
    event.error = ERROR.invalidRequest
    return error(isObject(msg) && (typeof msg.id === 'string' || typeof msg.id === 'number') ? msg.id : null, ERROR.invalidRequest, 'Not a JSON-RPC 2.0 message')
  }
  if (typeof msg.method !== 'string') return null // a response from the client: nothing to answer
  event.method = msg.method
  const isRequest = 'id' in msg
  if (!isRequest) return null // a notification
  const id = msg.id as Id
  if (typeof id !== 'string' && typeof id !== 'number') {
    event.error = ERROR.invalidRequest
    return error(null, ERROR.invalidRequest, 'id must be a string or a number')
  }
  const params = msg.params ?? {}
  if (!isObject(params)) {
    event.error = ERROR.invalidParams
    return error(id, ERROR.invalidParams, 'params must be an object')
  }
  let reply: object
  switch (msg.method) {
    case 'initialize': {
      const asked = params.protocolVersion
      const protocolVersion = typeof asked === 'string' && SUPPORTED_VERSIONS.includes(asked) ? asked : LATEST_VERSION
      const client = isObject(params.clientInfo) ? params.clientInfo : {}
      Object.assign(event, { client: short(client.name), clientVersion: short(client.version), protocolVersion: short(asked) })
      reply = result(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'screens-guide', title: 'screens.guide', version: DATA.version },
        instructions: INSTRUCTIONS,
      })
      break
    }
    case 'ping':
      reply = result(id, {})
      break
    case 'tools/list':
      reply = result(id, toolList())
      break
    case 'tools/call':
      reply = callTool(id, params, event)
      break
    default:
      reply = error(id, ERROR.methodNotFound, `Method not found: ${msg.method.slice(0, 100)}. This server answers initialize, ping, tools/list and tools/call.`)
  }
  if ('error' in reply) event.error = (reply as { error: { code: number } }).error.code
  return reply
}

/** A POST to /mcp after its origin and rate limit passed: the response and a usage event per message. */
export async function handlePost(request: Request): Promise<{ response: Response; events: EventProperties[] }> {
  const version = request.headers.get('MCP-Protocol-Version')
  if (version !== null && !SUPPORTED_VERSIONS.includes(version)) {
    const body = error(null, ERROR.invalidRequest, `Unsupported MCP-Protocol-Version ${version.slice(0, 40)}; this server supports ${SUPPORTED_VERSIONS.join(', ')}.`)
    return { response: jsonResponse(body, 400), events: [{ status: 400, error: ERROR.invalidRequest }] }
  }
  const length = Number(request.headers.get('Content-Length') ?? 0)
  const text = length > MAX_BODY ? null : await request.text()
  if (text === null || new TextEncoder().encode(text).length > MAX_BODY) {
    return { response: jsonResponse(error(null, ERROR.invalidRequest, `The body is over ${MAX_BODY / 1024} KiB.`), 413), events: [{ status: 413 }] }
  }
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return { response: jsonResponse(error(null, ERROR.parse, 'The body is not valid JSON.'), 400), events: [{ status: 400, error: ERROR.parse }] }
  }
  if (Array.isArray(body) && body.length === 0) {
    return { response: jsonResponse(error(null, ERROR.invalidRequest, 'An empty array is not a message.'), 400), events: [{ status: 400, error: ERROR.invalidRequest }] }
  }
  const messages = Array.isArray(body) ? body : [body]
  const events: EventProperties[] = []
  const replies: object[] = []
  for (const m of messages) {
    const event: EventProperties = {}
    const reply = handleMessage(m, event)
    if (reply) replies.push(reply)
    events.push(event)
  }
  const status = replies.length ? 200 : 202
  for (const e of events) e.status = status
  if (!replies.length) return { response: new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store', ...SECURITY_HEADERS } }), events }
  return { response: jsonResponse(Array.isArray(body) ? replies : replies[0]), events }
}
