import { describe, expect, it } from 'vitest'
import { layerOf } from '../src/components/Drawing.tsx'
import { parseIds } from '../src/islands/Compare.tsx'
import { closest } from '../src/islands/Playgrounds.tsx'
import { playDevices } from '../src/lib/pages/playground.ts'

describe('the comparison', () => {
  const known = ['iphone-17', 'pixel-8', 'ipad-a16', 'iphone-se-3']
  const defaults = ['iphone-se-3', 'iphone-17']

  it('takes the known ids of ?ids=, each once, at most the maximum', () => {
    expect(parseIds('?ids=pixel-8,iphone-17', known, defaults, 8)).toEqual(['pixel-8', 'iphone-17'])
    expect(parseIds('?ids=pixel-8,pixel-8,nope,ipad-a16', known, defaults, 8)).toEqual(['pixel-8', 'ipad-a16'])
    expect(parseIds('?ids=pixel-8,iphone-17,ipad-a16', known, defaults, 2)).toEqual(['pixel-8', 'iphone-17'])
  })

  it('shows the defaults when fewer than two ids remain', () => {
    expect(parseIds('', known, defaults, 8)).toEqual(defaults)
    expect(parseIds('?ids=pixel-8', known, defaults, 8)).toEqual(defaults)
    expect(parseIds('?ids=nope,also-nope', known, defaults, 8)).toEqual(defaults)
  })
})

describe('this device', () => {
  const devices = playDevices()

  it('names a measured device of the same size and pixel ratio, in either orientation', () => {
    for (const [w, h] of [[402, 874], [874, 402]]) {
      const m = closest(devices, w, h, 3)
      expect(m.distance).toBe(0)
      expect([m.device.display.width, m.device.display.height]).toEqual([402, 874])
    }
    expect(closest(devices, 375, 667, 2).device.id).toBe('iphone-se-3')
    expect(closest(devices, 1280, 800, 2).device.id).toBe('pixel-tablet')
  })

  it('counts a different pixel ratio against a device', () => {
    expect(closest(devices, 375, 667, 3).distance).toBeGreaterThan(0)
  })
})

describe('the drawing', () => {
  it('maps each table row to the layer that draws it', () => {
    expect(layerOf('safeAreaInsets')).toBe('insets')
    expect(layerOf('cutoutInsets')).toBe('insets')
    expect(layerOf('cornerRadii.profile')).toBe('window')
    expect(layerOf('navigationBar.large')).toBe('nav')
    expect(layerOf('tabBar')).toBe('tab')
    expect(layerOf('contentMargin')).toBe('margins')
    expect(layerOf('sizeClass')).toBeNull()
    expect(layerOf('measured')).toBeNull()
  })
})
