import { describe, expect, it } from 'vitest'
import {
  concentricRadius, cornerDepth, cornerDistances, crossesFold, insetDepths, intersection, onPixelGrid, overhang,
  round2, roundedCornerDepth, snapToPixels,
} from '../src/lib/geometry.ts'

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

const WINDOW = { width: 402, height: 874 }

describe('intersection and overhang', () => {
  it('gives the shared area, or null when two rectangles only touch', () => {
    expect(intersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toEqual({ x: 5, y: 5, width: 5, height: 5 })
    expect(intersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBeNull()
  })

  it('reports how far a frame reaches past each window edge, and null inside', () => {
    expect(overhang({ x: -4, y: 0, width: 410, height: 100 }, WINDOW)).toEqual({ top: 0, bottom: 0, left: 4, right: 4 })
    expect(overhang({ x: 0, y: 0, width: 402, height: 874 }, WINDOW)).toBeNull()
  })
})

describe('insetDepths', () => {
  const insets = { top: 62, bottom: 34, left: 0, right: 0 }

  it('reports only the edges a frame enters, never deeper than the frame', () => {
    expect(insetDepths({ x: 16, y: 700, width: 370, height: 158 }, insets, WINDOW)).toEqual({ bottom: 18 })
    expect(insetDepths({ x: 0, y: 0, width: 402, height: 20 }, insets, WINDOW)).toEqual({ top: 20 })
    expect(insetDepths({ x: 0, y: 62, width: 402, height: 778 }, insets, WINDOW)).toEqual({})
  })

  it('ignores an edge with no inset', () => {
    expect(insetDepths({ x: -10, y: 100, width: 50, height: 50 }, insets, WINDOW)).toEqual({})
  })
})

describe('roundedCornerDepth', () => {
  it('is cornerDepth for a square frame corner', () => {
    expect(roundedCornerDepth(62, 16, 34)).toBe(cornerDepth(62, 16, 34))
    expect(round2(roundedCornerDepth(62, 16, 16))).toBe(-3.05)
  })

  it('fits a 46 pt corner 16 pt from both edges of a 62 pt display corner exactly', () => {
    expect(roundedCornerDepth(62, 16, 16, 46)).toBe(16)
    expect(roundedCornerDepth(62, 16, 16, 45.999)).toBeCloseTo(16, 2)
  })

  it('goes below the gap when the frame corner is tighter than concentric', () => {
    expect(round2(roundedCornerDepth(62, 16, 16, 40))).toBe(13.51)
  })
})

describe('cornerDistances and crossesFold', () => {
  it("gives each corner's distances from its two window edges", () => {
    expect(cornerDistances({ x: 16, y: 700, width: 370, height: 158 }, WINDOW)).toEqual({
      topLeft: [16, 700], topRight: [16, 700], bottomRight: [16, 16], bottomLeft: [16, 16],
    })
  })

  it('crosses a vertical fold line only when the frame spans it', () => {
    const line = { x: 420, y: 0, width: 0, height: 900 }
    expect(crossesFold({ x: 0, y: 100, width: 841, height: 400 }, line)).toBe(true)
    expect(crossesFold({ x: 0, y: 100, width: 420, height: 400 }, line)).toBe(false)
  })

  it('crosses a horizontal fold line, and a fold band by overlap', () => {
    expect(crossesFold({ x: 0, y: 300, width: 100, height: 400 }, { x: 0, y: 500, width: 800, height: 0 })).toBe(true)
    expect(crossesFold({ x: 0, y: 300, width: 100, height: 100 }, { x: 0, y: 500, width: 800, height: 0 })).toBe(false)
    expect(crossesFold({ x: 0, y: 0, width: 100, height: 100 }, { x: 90, y: 0, width: 20, height: 900 })).toBe(true)
  })
})
