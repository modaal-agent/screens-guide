import { beforeEach, describe, expect, it, vi } from 'vitest'

const init = vi.fn()
const capture = vi.fn()
vi.mock('posthog-js/dist/module.slim.no-external.js', () => ({ default: { init, capture } }))

// Each test gets a fresh module: its client and queue are module state.
async function analytics() {
  vi.resetModules()
  return import('../src/lib/analytics.ts')
}

beforeEach(() => {
  init.mockClear()
  capture.mockClear()
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

  it('is cookieless in the EU region, with no recording, surveys, autocapture or flags', async () => {
    const { POSTHOG_CONFIG, POSTHOG_HOST } = await analytics()
    expect(POSTHOG_HOST).toBe('https://eu.i.posthog.com')
    expect(POSTHOG_CONFIG).toMatchObject({
      api_host: POSTHOG_HOST,
      cookieless_mode: 'always',
      persistence: 'memory',
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

  it('lists every event it sends on /privacy', async () => {
    const { EVENT_DOCS } = await analytics()
    expect(Object.keys(EVENT_DOCS).sort()).toEqual(['$pageview', 'compare_changed', 'data_link_clicked', 'explorer_changed', 'playground_used'])
  })
})
