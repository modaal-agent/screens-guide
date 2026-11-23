import { beforeEach, describe, expect, it, vi } from 'vitest'

const init = vi.fn()
const capture = vi.fn()
const get_explicit_consent_status = vi.fn(() => 'pending')
const opt_in_capturing = vi.fn()
const opt_out_capturing = vi.fn()
vi.mock('posthog-js/dist/module.slim.no-external.js', () => ({
  default: { init, capture, get_explicit_consent_status, opt_in_capturing, opt_out_capturing },
}))

// Each test gets a fresh module: its client and queue are module state.
async function analytics() {
  vi.resetModules()
  return import('../src/lib/analytics.ts')
}

beforeEach(() => {
  init.mockClear()
  capture.mockClear()
  opt_in_capturing.mockClear()
  opt_out_capturing.mockClear()
})

describe('analytics', () => {
  it('starts on screens.guide and on no other host', async () => {
    const { shouldStart } = await analytics()
    expect(shouldStart('screens.guide')).toBe(true)
    for (const host of ['localhost', '127.0.0.1', 'www.screens.guide', 'screens.guide.example.com', 'screens-guide.example.workers.dev', '']) {
      expect(shouldStart(host), host).toBe(false)
    }
  })

  it('loads nothing and sends nothing on another host', async () => {
    const a = await analytics()
    a.track('compare_changed', { ids: 'iphone-17,pixel-8' })
    expect(await a.startAnalytics('localhost')).toBe(false)
    expect(init).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })

  it('starts PostHog once on screens.guide, then sends the events queued before it', async () => {
    const a = await analytics()
    a.track('data_link_clicked', { url: '/data/v1/devices.json' })
    expect(await a.startAnalytics('screens.guide')).toBe(true)
    expect(await a.startAnalytics('screens.guide')).toBe(false)
    expect(init).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledWith(a.POSTHOG_TOKEN, a.POSTHOG_CONFIG)
    expect(capture).toHaveBeenCalledWith('data_link_clicked', { url: '/data/v1/devices.json' })
    a.track('explorer_changed', { device: 'iphone-17', screen: 'main', orientation: 'portrait', runtime: '24A434' })
    expect(capture).toHaveBeenCalledTimes(2)
  })

  it('counts without a cookie until the visitor allows one, in the EU region, with no recording, surveys, autocapture or flags', async () => {
    const { POSTHOG_CONFIG, POSTHOG_HOST } = await analytics()
    expect(POSTHOG_HOST).toBe('https://eu.i.posthog.com')
    expect(POSTHOG_CONFIG).toMatchObject({
      api_host: POSTHOG_HOST,
      cookieless_mode: 'on_reject',
      opt_out_capturing_by_default: true,
      opt_out_capturing_persistence_type: 'cookie',
      persistence: 'localStorage+cookie',
      cookie_expiration: 365,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      enable_heatmaps: false,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
    })
  })

  it('sends playground_used once per playground', async () => {
    const a = await analytics()
    await a.startAnalytics('screens.guide')
    a.trackPlayground('corner-fit')
    a.trackPlayground('corner-fit')
    a.trackPlayground('this-device', 'iphone-17')
    expect(capture.mock.calls).toEqual([
      ['playground_used', { playground: 'corner-fit' }],
      ['playground_used', { playground: 'this-device', device: 'iphone-17' }],
    ])
  })

  it('counts links to data files, llms.txt and Markdown copies as data links', async () => {
    const { dataLinkPath } = await analytics()
    const base = 'https://screens.guide/agents'
    expect(dataLinkPath('/data/v1/devices.csv', base)).toBe('/data/v1/devices.csv')
    expect(dataLinkPath('/llms.txt', base)).toBe('/llms.txt')
    expect(dataLinkPath('/llms-full.txt', base)).toBe('/llms-full.txt')
    expect(dataLinkPath('/devices/iphone-17.md', base)).toBe('/devices/iphone-17.md')
    expect(dataLinkPath('https://screens.guide/index.md?x=1#y', base)).toBe('/index.md')
    expect(dataLinkPath('/devices/iphone-17', base)).toBeNull()
    expect(dataLinkPath('https://example.com/data/x.json', base)).toBeNull()
  })

  it('reports no choice before PostHog starts, and records a choice only once it has', async () => {
    const a = await analytics()
    expect(a.consent()).toBeNull()
    a.setConsent(true)
    expect(opt_in_capturing).not.toHaveBeenCalled()
    await a.startAnalytics('screens.guide')
    expect(a.consent()).toBe('pending')
  })

  it('allows the cookie without sending an $opt_in event, and declines with opt-out', async () => {
    const a = await analytics()
    await a.startAnalytics('screens.guide')
    a.setConsent(true)
    expect(opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false })
    expect(opt_out_capturing).not.toHaveBeenCalled()
    a.setConsent(false)
    expect(opt_out_capturing).toHaveBeenCalledTimes(1)
    expect(capture).not.toHaveBeenCalled()
  })

  it("deletes this project's posthog-js entries from a storage area and leaves the rest", async () => {
    const { forget, POSTHOG_TOKEN } = await analytics()
    const entries = new Map([
      [`ph_${POSTHOG_TOKEN}_window_id`, '"01a2"'],
      [`ph_${POSTHOG_TOKEN}_primary_window_exists`, 'true'],
      ['ph_phc_another_project_posthog', '{}'],
      ['theme', 'dark'],
    ])
    const storage = {
      get length() {
        return entries.size
      },
      key: (i: number) => [...entries.keys()][i] ?? null,
      removeItem: (k: string) => void entries.delete(k),
    }
    forget(storage)
    expect([...entries.keys()]).toEqual(['ph_phc_another_project_posthog', 'theme'])
  })

  it('names the cookies with the project token, lasting COOKIE_DAYS', async () => {
    const { COOKIE_DAYS, POSTHOG_TOKEN, STORAGE_DOCS } = await analytics()
    expect(STORAGE_DOCS.map((e) => e.name.split(', ')[0])).toEqual([
      `__ph_opt_in_out_${POSTHOG_TOKEN}`,
      `ph_${POSTHOG_TOKEN}_posthog`,
      `ph_${POSTHOG_TOKEN}_window_id`,
    ])
    expect(STORAGE_DOCS[0].kind).toContain(`${COOKIE_DAYS} days`)
  })

  it('lists every event it sends on /privacy', async () => {
    const { EVENT_DOCS } = await analytics()
    expect(Object.keys(EVENT_DOCS).sort()).toEqual(['$pageview', 'compare_changed', 'data_link_clicked', 'explorer_changed', 'playground_used'])
  })
})
