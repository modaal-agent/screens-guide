import { describe, expect, it } from 'vitest'
import { concentricRadius, cornerDepth, onPixelGrid, round2, snapToPixels } from '../src/lib/geometry.ts'

describe('cornerDepth', () => {
  // spec 002 §2.3, on the iPhone 17 (radius 62 pt).
  it('puts a square corner 16 pt from the side and 34 pt from the bottom 8.15 pt inside the curve', () => {
    expect(round2(cornerDepth(62, 16, 34))).toBe(8.15)
  })

  it('cuts off a square corner 16 pt from both edges by 3.05 pt', () => {
    expect(round2(cornerDepth(62, 16, 16))).toBe(-3.05)
  })

  it('gives the distance to the straight edge beyond the curve', () => {
    expect(cornerDepth(62, 70, 10)).toBe(10)
    expect(cornerDepth(62, 62, 30)).toBe(30)
  })

  it('is continuous where the curve meets the straight edge', () => {
    expect(cornerDepth(62, 61.999, 30)).toBeCloseTo(30, 2)
  })

  it('reads a square display corner as the distance to the nearer edge', () => {
    expect(cornerDepth(0, 16, 16)).toBe(16)
  })
})

describe('concentricRadius', () => {
  it('is 46 pt for a 16 pt margin on the iPhone 17', () => {
    expect(concentricRadius(62, 16, 16)).toBe(46)
  })

  it('takes the larger gap', () => {
    expect(concentricRadius(62, 16, 34)).toBe(28)
  })

  it('is never below 0 nor above half the shorter side', () => {
    expect(concentricRadius(55, 80, 10)).toBe(0)
    expect(concentricRadius(62, 0, 0, 100, 40)).toBe(20)
  })
})

describe('pixel snapping', () => {
  it('rounds to whole pixels at the scale', () => {
    expect(snapToPixels(10.2, 3)).toBeCloseTo(10.333, 3)
    expect(snapToPixels(0.38, 2.625)).toBeCloseTo(0.381, 3)
  })

  it('tells whether a value sits on the pixel grid', () => {
    expect(onPixelGrid(0.5, 2)).toBe(true)
    expect(onPixelGrid(0.3, 2)).toBe(false)
    expect(onPixelGrid(50.29, 2.625, 0.02)).toBe(true)
  })
})
