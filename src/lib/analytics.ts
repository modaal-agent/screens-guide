// PostHog, in its EU region: the page view and the four events of spec 001 §5.5, with no free text
// in any property. A visitor who has not chosen, or who declined, is counted in PostHog's cookieless
// mode; a visitor who allows the cookie gets PostHog's cookie and local storage entry (spec 001
// §12). It starts only on screens.guide, so a local server, CI and previews send nothing. The token
// and host are in src/lib/posthog.ts, which the Worker imports too.

import { ANALYTICS_HOSTNAME, POSTHOG_HOST, POSTHOG_TOKEN } from './posthog.ts'

export { ANALYTICS_HOSTNAME, POSTHOG_HOST, POSTHOG_TOKEN }

/** Days PostHog's cookie and the consent cookie last; the banner asks again when they expire. */
export const COOKIE_DAYS = 365

/**
 * posthog-js's options. `on_reject` with `opt_out_capturing_by_default` captures in cookieless mode
 * and stores nothing until the visitor allows the cookie; then PostHog keeps its ids in a cookie and
 * a local storage entry. The choice itself is a cookie, so it expires with PostHog's. The page view
 * and the named events only: no session recording, surveys, heatmaps, exceptions, web vitals or
 * feature flags. The bundle imported below is the slim one that never loads a script from another host.
 */
export const POSTHOG_CONFIG = {
  api_host: POSTHOG_HOST,
  cookieless_mode: 'on_reject',
  opt_out_capturing_by_default: true,
  opt_out_capturing_persistence_type: 'cookie',
  persistence: 'localStorage+cookie',
  cookie_expiration: COOKIE_DAYS,
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

/** The prefix of every storage key posthog-js writes for this project. */
const STORAGE_PREFIX = `ph_${POSTHOG_TOKEN}_`

/**
 * What posthog-js stores in the browser, as /privacy lists it. Read in WebKit on 2026-11-23 with
 * posthog-js 1.447.10 (spec 001 §12): nothing before a choice; after "No cookie", the first entry only.
 */
export const STORAGE_DOCS: { name: string; kind: string; when: string; holds: string }[] = [
  {
    name: `__ph_opt_in_out_${POSTHOG_TOKEN}`,
    kind: `cookie, ${COOKIE_DAYS} days`,
    when: 'you choose "Allow cookie" or "No cookie"',
    holds: 'your choice: 1 for allow, 0 for no cookie',
  },
  {
    name: `${STORAGE_PREFIX}posthog`,
    kind: `cookie, ${COOKIE_DAYS} days; local storage; session storage`,
    when: 'you choose "Allow cookie"',
    holds: "a random id for your browser, the current session's random id and start time, and the address and referrer of the first page you opened",
  },
  {
    name: `${STORAGE_PREFIX}window_id, ${STORAGE_PREFIX}primary_window_exists, ${STORAGE_PREFIX}session_registered_properties`,
    kind: 'session storage, deleted when you close the tab',
    when: 'you choose "Allow cookie"',
    holds: "a random id for the tab, and which properties PostHog's library has already sent in this session",
  },
]

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
  get_explicit_consent_status(): Consent
  opt_in_capturing(options: { captureEventName: false }): void
  opt_out_capturing(): void
}

/** The visitor's choice about the cookie; `pending` until they make one. */
export type Consent = 'granted' | 'denied' | 'pending'

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

/** The visitor's choice, or null before PostHog has started (and on every host but screens.guide). */
export function consent(): Consent | null {
  return client ? client.get_explicit_consent_status() : null
}

/**
 * Records the visitor's choice. Allowing starts PostHog's cookie and sends no event of its own
 * (`$opt_in` is not one of spec 001 §5.5's events). Declining deletes PostHog's cookie and storage
 * entries, if any, and goes on counting in cookieless mode.
 */
export function setConsent(allow: boolean): void {
  if (!client) return
  if (allow) {
    client.opt_in_capturing({ captureEventName: false })
    return
  }
  client.opt_out_capturing()
  // opt_out_capturing() deletes the cookie and local storage, and leaves the tab's ids in session storage.
  try {
    forget(globalThis.sessionStorage)
  } catch {
    // Storage the browser refuses to open holds nothing to delete.
  }
}

/** Deletes every entry posthog-js wrote for this project from one storage area. */
export function forget(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>): void {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
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

/**
 * The consent banner of src/components/ConsentBanner.astro: shown while the choice is pending, and
 * again from the footer's Cookies button. Call it once PostHog has started; elsewhere the banner
 * and the button stay hidden.
 */
export function wireConsent(doc: Document): void {
  const banner = doc.getElementById('consent')
  if (!banner) return
  const close = () => {
    banner.hidden = true
  }
  banner.querySelector('[data-consent="allow"]')?.addEventListener('click', () => {
    setConsent(true)
    close()
  })
  banner.querySelector('[data-consent="decline"]')?.addEventListener('click', () => {
    setConsent(false)
    close()
  })
  for (const button of doc.querySelectorAll<HTMLElement>('[data-consent="open"]')) {
    button.hidden = false
    button.addEventListener('click', () => {
      banner.hidden = false
      banner.querySelector<HTMLElement>('button')?.focus()
    })
  }
  banner.hidden = consent() !== 'pending'
}
