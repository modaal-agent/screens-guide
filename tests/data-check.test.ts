import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkData } from '../src/lib/data-check.ts'
import type { Dataset, Device, Reading } from '../src/lib/dataset.ts'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const DATA: Dataset = JSON.parse(read('data/devices.json'))
const SCHEMA = JSON.parse(read('data/schema.json'))
const CHANGELOG = read('data/CHANGELOG.md')

function seeded(change: (d: Dataset) => void): string[] {
  const doc = structuredClone(DATA)
  change(doc)
  return checkData(doc, SCHEMA, CHANGELOG)
}

const device = (d: Dataset, id: string): Device => d.devices.find((x) => x.id === id)!
const reading = (d: Dataset, id: string, build: string, screen = 'main', rotation = 0): Reading =>
  device(d, id).readings.find((r) => r.runtime.build === build && r.screen === screen && r.rotation === rotation)!

describe('check:data', () => {
  it('passes the committed dataset', () => {
    expect(checkData(DATA, SCHEMA, CHANGELOG)).toEqual([])
  })

  it('fails a negative inset (schema)', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').safeAreaInsets!.top = -1 })
    expect(errors.join('\n')).toMatch(/schema: .*safeAreaInsets/)
  })

  it('fails an id that is not lowercase with hyphens (schema)', () => {
    const errors = seeded((d) => { device(d, 'iphone-17').id = 'iPhone_17' })
    expect(errors.join('\n')).toMatch(/schema: \/devices\/\d+\/id/)
  })

  it('fails a duplicate id', () => {
    const errors = seeded((d) => { device(d, 'iphone-16').id = 'iphone-17' })
    expect(errors).toContain('iphone-17: the id is not unique')
  })

  it('fails insets that leave no safe area', () => {
    const errors = seeded((d) => { reading(d, 'pixel-8', 'BE2A.250530.026.F3').safeAreaInsets!.bottom = 900 })
    expect(errors.join('\n')).toMatch(/pixel-8 .* safeAreaInsets leave no safe area/)
  })

  it('fails a corner radius above half the shorter side', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').cornerRadii.profile!.topLeft = 202 })
    expect(errors.join('\n')).toMatch(/cornerRadii\.profile\.topLeft 202 is above half the shorter side/)
  })

  it('fails iOS pixels that are not window × scale', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').pixels.width = 1210 })
    expect(errors.join('\n')).toMatch(/iphone-17 24A434 main 0: window × scale/)
  })

  it('fails Android pixels that are not dp × density ÷ 160', () => {
    const errors = seeded((d) => { reading(d, 'pixel-8', 'BE2A.250530.026.F3').window.width = 412 })
    expect(errors.join('\n')).toMatch(/pixel-8 .*dp × density ÷ 160/)
  })

  it('fails an orientation that is not the window shape', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').orientation = 'landscape' })
    expect(errors.join('\n')).toMatch(/orientation landscape for a 402 × 874 window/)
  })

  it('fails a current build with no reading', () => {
    const errors = seeded((d) => { device(d, 'iphone-17').current.build = '99Z1' })
    expect(errors).toContain('iphone-17: current names build 99Z1, which has no reading')
  })

  it('fails a current build that is a pre-release', () => {
    const errors = seeded((d) => { device(d, 'iphone-17').current = { version: '27.3', build: '24C5037i' } })
    expect(errors).toContain('iphone-17: current names a pre-release build')
  })

  it('fails two readings for one build, screen and rotation', () => {
    const errors = seeded((d) => {
      const dev = device(d, 'pixel-8')
      dev.readings.push(structuredClone(dev.readings[0]))
    })
    expect(errors.join('\n')).toMatch(/pixel-8 .*a second reading/)
  })

  it('fails a reading that names an unknown run', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').measured.runs.push('no-such-run') })
    expect(errors.join('\n')).toMatch(/unknown run no-such-run/)
  })

  it('fails a null field with no reason', () => {
    const errors = seeded((d) => {
      const r = reading(d, 'iphone-17', '24A434')
      r.tabBar = null
    })
    expect(errors).toContain('iphone-17 24A434 main 0: tabBar is null with no reason in missing')
  })

  it('fails a reason for a field that is not null', () => {
    const errors = seeded((d) => { reading(d, 'iphone-17', '24A434').missing['window'] = 'not read' })
    expect(errors).toContain('iphone-17 24A434 main 0: missing names window, which is not null')
  })

  it('fails a version with no changelog entry', () => {
    const errors = seeded((d) => { d.version = '1.1.0' })
    expect(errors).toContain('data/CHANGELOG.md has no entry "## 1.1.0"')
  })
})
