// The skill's files against the dataset (spec 002 §4.1): references/devices.md is the generator's
// output, and every number SKILL.md quotes is recomputed here from data/devices.json, so a dataset
// change that moves one fails until the skill is edited.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32, inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import data from '../data/devices.json' with { type: 'json' }
import type { Dataset, Device, Reading } from '../src/lib/dataset.ts'
import { compareRuntimes } from '../src/lib/format.ts'
import { concentricRadius, cornerDepth, round2 } from '../src/lib/geometry.ts'
import { skillReference } from '../src/lib/skill-reference.ts'
import { zip } from '../src/lib/zip.ts'

const ROOT = join(import.meta.dirname, '..')
const DATA = data as unknown as Dataset
const SKILL = readFileSync(join(ROOT, 'skills/screens-guide/SKILL.md'), 'utf8')
const body = SKILL.replace(/\s+/g, ' ')

const device = (id: string): Device => DATA.devices.find((d) => d.id === id)!
const reading = (id: string, version: string, screen: string, rotation: number): Reading => {
  const r = device(id).readings.find((x) => x.runtime.version === version && !x.runtime.prerelease && x.screen === screen && x.rotation === rotation)
  if (!r) throw new Error(`no reading ${id} ${version} ${screen} ${rotation}`)
  return r
}
const insets = (r: Reading) => [r.safeAreaInsets!.top, r.safeAreaInsets!.bottom, r.safeAreaInsets!.left, r.safeAreaInsets!.right].join(' / ')
const iphones = DATA.devices.filter((d) => d.platform === 'ios' && d.kind === 'phone')
const atLeast = (r: Reading, version: string) => compareRuntimes(r.runtime, { ...r.runtime, version, build: '' }) >= 0

/** Asserts SKILL.md says `text` (whitespace folded) and that `holds` is true of the dataset. */
function claim(text: string, holds: boolean) {
  expect(body, text).toContain(text)
  expect(holds, text).toBe(true)
}

describe('references/devices.md', () => {
  it('is what npm run gen:skill writes from data/devices.json', () => {
    const committed = readFileSync(join(ROOT, 'skills/screens-guide/references/devices.md'), 'utf8')
    expect(committed, 'run npm run gen:skill and commit the result').toBe(skillReference(DATA))
  })

  it('states the dataset version and date, and lists every device', () => {
    const ref = skillReference(DATA)
    expect(ref).toContain(`Dataset ${DATA.version} of ${DATA.updated}`)
    for (const d of DATA.devices) expect(ref).toContain(`\`${d.id}\``)
  })
})

describe("SKILL.md's numbers", () => {
  it('corner radii', () => {
    const r = reading('iphone-17', '27.0', 'main', 0)
    const R = r.cornerRadii.profile!.bottomLeft
    claim('The iPhone 17 on iOS 27.0 has a display corner radius of 62 pt.', R === 62)
    claim('62 − 16 = 46 pt', concentricRadius(R, 16, 16) === 46)
    claim('lies 3.05 pt outside', round2(cornerDepth(R, 16, 16)) === -3.05)
    claim('it lies 8.15 pt inside', round2(cornerDepth(R, 16, 34)) === 8.15)
    claim('25 pt on the iPad (A16)', reading('ipad-a16', '27.0', 'main', 0).cornerRadii.profile!.topLeft === 25)
    claim('30 pt on the iPad Pro 11-inch (M5)', reading('ipad-pro-11-m5', '27.0', 'main', 0).cornerRadii.profile!.topLeft === 30)
    const se = device('iphone-se-3').readings[0].cornerRadii.profile!
    claim('The iPhone SE (3rd generation) has square corners.', se.topLeft === 0 && se.bottomRight === 0)
    const p8 = reading('pixel-8', '16', 'main', 0).cornerRadii.profile!
    claim('39.62 dp at the top and 38.86 dp at the bottom', p8.topLeft === 39.62 && p8.topRight === 39.62 && p8.bottomLeft === 38.86 && p8.bottomRight === 38.86)
  })

  it('the iOS tab bar', () => {
    const modern = iphones.flatMap((d) => d.readings).filter((r) => r.tabBar && !r.runtime.prerelease && atLeast(r, '26.5'))
    expect(modern.length).toBeGreaterThan(15)
    claim(
      'From iOS 26.5, every iPhone measured draws the tab bar as a capsule 62 pt tall whose bottom edge is 21 pt above the window\'s bottom edge in portrait, and 44 pt tall and 20 pt above in landscape.',
      modern.every((r) => r.tabBar!.style === 'capsule' && (r.orientation === 'portrait' ? r.tabBar!.height === 62 && r.tabBar!.bottom === 21 : r.tabBar!.height === 44 && r.tabBar!.bottom === 20)),
    )
    claim('it is 21 pt on the iPhone 17, whose bottom inset is 34 pt, and on the iPhone SE (3rd generation), whose bottom inset is 0, both on iOS 27.0',
      [['iphone-17', 34], ['iphone-se-3', 0]].every(([id, inset]) => {
        const r = reading(id as string, '27.0', 'main', 0)
        return r.tabBar!.bottom === 21 && r.safeAreaInsets!.bottom === inset
      }))
    claim('83 pt from the bottom edge in portrait', 62 + 21 === 83)
    const old16 = reading('iphone-16', '18.6', 'main', 0).tabBar!
    const oldSe = reading('iphone-se-3', '18.6', 'main', 0).tabBar!
    claim('On iOS 18.6 the tab bar is a full-width bar at the bottom edge: 83 pt tall on the iPhone 16, which includes its 34 pt bottom inset, and 49 pt on the iPhone SE (3rd generation).',
      old16.style === 'bar' && old16.bottom === 0 && old16.height === 83 && reading('iphone-16', '18.6', 'main', 0).safeAreaInsets!.bottom === 34 && oldSe.style === 'bar' && oldSe.height === 49)
  })

  it('iOS in landscape, on iPad, and the navigation bar', () => {
    const landscape = iphones.flatMap((d) => d.readings).filter((r) => r.orientation === 'landscape')
    expect(landscape.length).toBeGreaterThan(10)
    claim('Every iPhone reading in landscape has a top inset of 0, and each one that read the status bar reports it hidden.',
      landscape.every((r) => r.safeAreaInsets!.top === 0 && (!r.statusBar || r.statusBar.placement === 'hidden')))
    claim('62 / 34 / 0 / 0 in portrait and 0 / 20 / 62 / 62 in landscape',
      insets(reading('iphone-17', '27.0', 'main', 0)) === '62 / 34 / 0 / 0' && insets(reading('iphone-17', '27.0', 'main', 90)) === '0 / 20 / 62 / 62')
    const pads = [reading('ipad-a16', '27.0', 'main', 0), reading('ipad-a16', '27.0', 'main', 90)]
    claim('32 pt tall, and the insets are 32 / 20 / 0 / 0 either way',
      pads.every((r) => r.statusBar!.placement === 'top' && r.statusBar!.frame!.height === 32 && insets(r) === '32 / 20 / 0 / 0'))
    const nav = reading('iphone-17', '27.0', 'main', 0).navigationBar
    claim('The inline navigation bar is 54 pt tall from the top inset, and a large-title bar 106 pt, on the iPhone 17 on iOS 27.0.',
      nav.inline!.height === 54 && nav.inline!.top === 62 && nav.large!.height === 106)
  })

  it('Android dp and bars', () => {
    const p8 = device('pixel-8')
    const r = reading('pixel-8', '16', 'main', 0)
    claim('The Pixel 8 on Android 16 has 420 dpi, so 2.625 px per dp', p8.displays.main.density === 420 && 420 / 160 === 2.625)
    claim('its window is 411.43 × 914.29 dp and its status bar inset is 50.29 dp', r.window.width === 411.43 && r.window.height === 914.29 && r.safeAreaInsets!.top === 50.29)
    claim('16 dp is 42 px on the Pixel 8', Math.round(16 * 2.625) === 42)
    claim("Material 3's navigation bar is 104 dp tall at the window's bottom edge: 80 dp of bar above the 24 dp gesture-navigation inset.",
      r.tabBar!.height === 104 && r.tabBar!.bottom === 0 && r.safeAreaInsets!.bottom === 24 && 104 - 24 === 80)
    claim("Material 3's top app bar is 64 dp tall, below the 50.29 dp status bar inset", r.navigationBar.inline!.height === 64 && r.navigationBar.inline!.top === 50.29)
    claim('insets 50.29 / 24 / 0 / 0 at rotation 0, 28.19 / 24 / 50.29 / 0 at 90, 28.19 / 50.29 / 0 / 0 at 180, 28.19 / 24 / 0 / 50.29 at 270',
      [0, 90, 180, 270].map((rot) => insets(reading('pixel-8', '16', 'main', rot))).join(' | ') === '50.29 / 24 / 0 / 0 | 28.19 / 24 / 50.29 / 0 | 28.19 / 50.29 / 0 / 0 | 28.19 / 24 / 0 / 50.29')
  })

  it('window size classes', () => {
    const android = DATA.devices.filter((d) => d.platform === 'android').flatMap((d) => d.readings).filter((r) => r.sizeClass)
    expect(android.length).toBeGreaterThan(30)
    const width = (w: number) => (w < 600 ? 'compact' : w < 840 ? 'medium' : 'expanded')
    const height = (h: number) => (h < 480 ? 'compact' : h < 900 ? 'medium' : 'expanded')
    claim('Every Android reading in the dataset, on Android 16, falls in the class these thresholds give.',
      android.every((r) => r.runtime.version === '16' && r.sizeClass!.width === width(r.window.width) && r.sizeClass!.height === height(r.window.height)))
    const fold = (screen: string, rot: number) => reading('pixel-fold', '16', screen, rot)
    claim('the Pixel 8 is compact wide in portrait (411.43 dp) and expanded in landscape (914.29 dp)',
      reading('pixel-8', '16', 'main', 0).sizeClass!.width === 'compact' && reading('pixel-8', '16', 'main', 90).sizeClass!.width === 'expanded')
    claim('the Pixel Fold is medium closed in landscape (796.95 dp), expanded open in landscape (841.14 dp) and medium open in portrait (700.95 dp)',
      fold('closed', 90).window.width === 796.95 && fold('closed', 90).sizeClass!.width === 'medium' &&
      fold('open', 0).window.width === 841.14 && fold('open', 0).orientation === 'landscape' && fold('open', 0).sizeClass!.width === 'expanded' &&
      fold('open', 90).window.width === 700.95 && fold('open', 90).sizeClass!.width === 'medium')
    const tablet = reading('pixel-tablet', '16', 'main', 0)
    claim('the Pixel Tablet in landscape, 1280 dp wide, is large there and expanded in the first version',
      tablet.window.width === 1280 && tablet.sizeClassV2!.width === 'large' && tablet.sizeClass!.width === 'expanded')
    claim('the iPhone 17 Pro Max on iOS 26.5 and the iPhone Air on iOS 27.0, 956 and 912 pt wide, are regular wide; the iPhone 17 on iOS 27.0, 874 pt wide, stays compact',
      reading('iphone-17-pro-max', '26.5', 'main', 90).sizeClass!.width === 'regular' && reading('iphone-17-pro-max', '26.5', 'main', 90).window.width === 956 &&
      reading('iphone-air', '27.0', 'main', 90).sizeClass!.width === 'regular' && reading('iphone-air', '27.0', 'main', 90).window.width === 912 &&
      reading('iphone-17', '27.0', 'main', 90).sizeClass!.width === 'compact' && reading('iphone-17', '27.0', 'main', 90).window.width === 874)
    const pads = DATA.devices.filter((d) => d.kind === 'tablet' && d.platform === 'ios').flatMap((d) => d.readings).filter((r) => r.sizeClass)
    claim('Full-screen iPads are regular in both directions.', pads.length > 5 && pads.every((r) => r.sizeClass!.width === 'regular' && r.sizeClass!.height === 'regular'))
  })

  it('foldables', () => {
    const open = reading('pixel-fold', '16', 'open', 0)
    claim('open in landscape, is 841.14 × 700.95 dp, with a vertical fold line of width 0 at x 420.57 dp',
      open.window.width === 841.14 && open.window.height === 700.95 && open.fold!.axis === 'vertical' && open.fold!.frame.width === 0 && open.fold!.frame.x === 420.57)
    const p9 = reading('pixel-9-pro-fold', '16', 'open', 0)
    claim("The Pixel 9 Pro Fold's is at x 425.85 dp of 851.69 dp.", p9.fold!.frame.x === 425.85 && p9.window.width === 851.69)
    const folds = DATA.devices.filter((d) => d.kind === 'foldable').flatMap((d) => d.readings).filter((r) => r.fold)
    claim('The hinge separates the screen into two halves when half open and does not when flat.',
      folds.every((r) => (r.screen === 'half-open') === r.fold!.separates))
    const duo = reading('iphone-duo', '27.1', 'open', 0)
    const duoLandscape = reading('iphone-duo', '27.1', 'open', 90)
    claim('a fold band 40 pt tall: from y 455.5 pt to 495.5 pt of its 669 × 951 pt window in portrait, and 40 pt wide at x 455.5 pt in landscape',
      duo.fold!.frame.height === 40 && duo.fold!.frame.y === 455.5 && duo.window.width === 669 && duo.window.height === 951 &&
      duoLandscape.fold!.frame.width === 40 && duoLandscape.fold!.frame.x === 455.5)
    const camera = duo.regions!.find((g) => g.kind === 'occlusion')!.frame
    claim('the camera at 535, 0, 134 × 82 pt in portrait, open', camera.x === 535 && camera.y === 0 && camera.width === 134 && camera.height === 82)
  })
})

/** The entries of a ZIP archive, read from its central directory, each inflated and its CRC checked. */
function unzip(archive: Buffer): { name: string; data: Buffer; date: number; time: number }[] {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = archive.readUInt16LE(end + 10)
  let p = archive.readUInt32LE(end + 16)
  const out = []
  for (let i = 0; i < count; i++) {
    expect(archive.readUInt32LE(p)).toBe(0x02014b50)
    const [method, time, date, crc, packed, size, nameLength, extra, comment, local] = [
      archive.readUInt16LE(p + 10), archive.readUInt16LE(p + 12), archive.readUInt16LE(p + 14), archive.readUInt32LE(p + 16),
      archive.readUInt32LE(p + 20), archive.readUInt32LE(p + 24), archive.readUInt16LE(p + 28), archive.readUInt16LE(p + 30),
      archive.readUInt16LE(p + 32), archive.readUInt32LE(p + 42),
    ]
    const name = archive.toString('utf8', p + 46, p + 46 + nameLength)
    expect(archive.readUInt32LE(local), name).toBe(0x04034b50)
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28)
    expect(method, name).toBe(8)
    const data = inflateRawSync(archive.subarray(start, start + packed))
    expect(data.length, name).toBe(size)
    expect(crc32(data), name).toBe(crc)
    out.push({ name, data, date, time })
    p += 46 + nameLength + extra + comment
  }
  return out
}

describe('the zip writer', () => {
  it('writes the same bytes from the same input, and archives that read back', () => {
    const entries = [{ name: 'a/SKILL.md', data: Buffer.from('# A\n') }, { name: 'a/references/b.md', data: Buffer.from('b'.repeat(1000)) }]
    const one = Buffer.from(zip(entries, new Date('2026-11-17T00:00:00Z')))
    expect(Buffer.from(zip(entries, new Date('2026-11-17T00:00:00Z'))).equals(one)).toBe(true)
    const read = unzip(one)
    expect(read.map((e) => e.name)).toEqual(['a/SKILL.md', 'a/references/b.md'])
    expect(read[1].data.toString()).toBe('b'.repeat(1000))
    expect(read[0].date).toBe(((2026 - 1980) << 9) | (11 << 5) | 17)
    expect(read[0].time).toBe(0)
  })
})

describe("the build's copies of the skill", () => {
  const DIST = join(ROOT, 'dist')
  const source = (path: string) => readFileSync(join(ROOT, 'skills/screens-guide', path))

  it('serves each file of skills/screens-guide/ under /skills/screens-guide/', () => {
    if (!existsSync(DIST)) throw new Error('dist/ is missing: run npm run build first')
    for (const path of ['SKILL.md', 'references/devices.md']) {
      expect(readFileSync(join(DIST, 'skills/screens-guide', path)).equals(source(path)), path).toBe(true)
    }
  })

  it('writes /skills/screens-guide.zip with the skill folder at its root, dated the dataset', () => {
    const entries = unzip(readFileSync(join(DIST, 'skills/screens-guide.zip')))
    expect(entries.map((e) => e.name)).toEqual(['screens-guide/SKILL.md', 'screens-guide/references/devices.md'])
    for (const e of entries) expect(e.data.equals(source(e.name.slice('screens-guide/'.length))), e.name).toBe(true)
    const [y, m, d] = DATA.updated.split('-').map(Number)
    expect(entries[0].date).toBe(((y - 1980) << 9) | (m << 5) | d)
  })
})
