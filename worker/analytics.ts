// The Worker's usage events (spec 002 §2.5): one PostHog event per message to /mcp and per request
// the rate limit refuses. Each is anonymous, with a new random distinct_id, and carries the request's
// User-Agent and Accept headers; none carries the client's address, a frame or text it sent.

import { ANALYTICS_HOSTNAME, POSTHOG_HOST, POSTHOG_TOKEN } from '../src/lib/posthog.ts'

/** Each Worker event as /privacy lists it. */
export const WORKER_EVENT_DOCS: Record<string, { when: string; properties: string }> = {
  mcp_request: {
    when: 'each message to the MCP server at /mcp, and each request its rate limit refuses',
    properties: "the method; for initialize, the client's name and version and the protocol version; for a tool call, the tool, the device ids, screen, orientation, rotation and runtime it names, the number of frames, and whether it failed; a JSON-RPC error code; which rate limit refused it; the HTTP status; the request's User-Agent and Accept headers",
  },
}

export const CAPTURE_URL = `${POSTHOG_HOST}/i/v0/e/`

/** Events go out only for requests to screens.guide itself; tests and `wrangler dev` send none. */
export function shouldSend(url: URL): boolean {
  return url.hostname === ANALYTICS_HOSTNAME
}

export function captureBody(event: string, properties: Record<string, unknown>, request: Request) {
  return {
    api_key: POSTHOG_TOKEN,
    event,
    distinct_id: crypto.randomUUID(),
    properties: {
      ...properties,
      user_agent: request.headers.get('User-Agent')?.slice(0, 300) ?? null,
      accept: request.headers.get('Accept')?.slice(0, 200) ?? null,
      $process_person_profile: false,
      $geoip_disable: true, // the request reaches PostHog from Cloudflare, so its address locates Cloudflare
      $lib: 'screens-guide-worker',
    },
  }
}

/** Sends the events; a failed send is logged and changes nothing else. */
export async function sendEvents(event: string, list: Record<string, unknown>[], request: Request, fetcher: typeof fetch = fetch): Promise<void> {
  await Promise.all(list.map(async (properties) => {
    try {
      const res = await fetcher(CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captureBody(event, properties, request)),
      })
      if (!res.ok) console.error('PostHog answered', res.status)
    } catch (e) {
      console.error('PostHog unreachable', e)
    }
  }))
}
