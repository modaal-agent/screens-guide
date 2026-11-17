// PostHog, in its EU region, cookieless: the page view and the four events of spec 001 §5.5, with
// no free text in any property. It starts only on screens.guide, so a local server, CI and
// previews send nothing. Spec 002's Worker imports the token and host from here.

export const POSTHOG_TOKEN = 'phc_uUCsuu3u789nj9y6wBqTqDhffPrnbJwn9P75ezSyK4pf'
export const POSTHOG_HOST = 'https://eu.i.posthog.com'
export const ANALYTICS_HOSTNAME = 'screens.guide'

/**
 * posthog-js's options: no cookie and no browser storage, the page view and the named events only,
 * no session recording, surveys, heatmaps, exceptions, web vitals or feature flags. The bundle
 * imported below is the slim one that never loads a script from another host.
 */
export const POSTHOG_CONFIG = {
  api_host: POSTHOG_HOST,
  cookieless_mode: 'always',
  persistence: 'memory',
  autocapture: false,
  capture_pageview: true,
  capture_pageleave: false,
  capture_dead_clicks: false,
  capture_exceptions: false,
  capture_performance: false,
  capture_heatmaps: false,
  enable_heatmaps: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  disable_external_dependency_loading: true,
  advanced_disable_flags: true,
} as const

export interface Events {
  explorer_changed: { device: string; screen: string; orientation: string; runtime: string }
  compare_changed: { ids: string }
  playground_used: { playground: 'pixel-snapping' | 'corner-fit' | 'this-device'; device?: string }
  data_link_clicked: { url: string }
}

/** Each event as /privacy lists it: when it is sent and what it carries. */
export const EVENT_DOCS: Record<'$pageview' | keyof Events, { when: string; properties: string }> = {
  $pageview: { when: 'a page loads', properties: "the page's address" },
  explorer_changed: { when: "a picker in a device page's explorer changes", properties: 'the device id, screen, orientation and runtime build' },
  compare_changed: { when: "the comparison's device list changes", properties: 'the device ids' },
  playground_used: { when: "a playground's first input on a page; for \"this device\", when it has read the screen", properties: "the playground's name; for \"this device\", the id of the closest measured device" },
  data_link_clicked: { when: 'a click on a link to a data file, llms.txt or a Markdown copy', properties: "the link's path" },
}

interface Client {
  capture(event: string, properties: Record<string, unknown>): unknown
}

let client: Client | null = null
let starting = false
const queue: [string, Record<string, unknown>][] = []

export function shouldStart(hostname: string): boolean {
  return hostname === ANALYTICS_HOSTNAME
}

/** Starts PostHog on screens.guide and sends the events queued before it loaded; elsewhere does nothing. */
export async function startAnalytics(hostname: string): Promise<boolean> {
  if (!shouldStart(hostname) || client || starting) return false
  starting = true
  const { default: posthog } = await import('posthog-js/dist/module.slim.no-external.js')
  posthog.init(POSTHOG_TOKEN, POSTHOG_CONFIG)
  client = posthog
  for (const [event, props] of queue.splice(0)) client.capture(event, props)
  return true
}

/** Sends an event once PostHog has started; on another host the event is dropped with the queue. */
export function track<E extends keyof Events>(event: E, properties: Events[E]): void {
  if (client) client.capture(event, properties)
  else if (queue.length < 20) queue.push([event, properties])
}

/** The site path of a link to a data file, a text file for language models or a Markdown copy. */
export function dataLinkPath(href: string, base: string): string | null {
  let url: URL
  try {
    url = new URL(href, base)
  } catch {
    return null
  }
  if (url.origin !== new URL(base).origin) return null
  const p = url.pathname
  return p.startsWith('/data/') || p === '/llms.txt' || p === '/llms-full.txt' || p.endsWith('.md') ? p : null
}

/** One listener for the page: a click on a data link sends `data_link_clicked` with its path. */
export function trackDataLinks(doc: Document): void {
  doc.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]')
    const path = a && dataLinkPath(a.getAttribute('href')!, doc.location.href)
    if (path) track('data_link_clicked', { url: path })
  })
}

/** `playground_used` once per playground per page. */
const used = new Set<string>()
export function trackPlayground(playground: Events['playground_used']['playground'], device?: string): void {
  if (used.has(playground)) return
  used.add(playground)
  track('playground_used', device ? { playground, device } : { playground })
}
