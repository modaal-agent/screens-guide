// The checks `npm run check:data` runs on data/devices.json (spec 001 §6). Each returns a list
// of messages; an empty list passes.

import Ajv2020Import from 'ajv/dist/2020.js'
import { displayOf, type Dataset, type Device, type Reading } from './dataset.ts'

// ajv is CommonJS: Node's default import is the class, a bundler's may be the module.
const Ajv2020 = ((Ajv2020Import as unknown as { default?: unknown }).default ?? Ajv2020Import) as typeof Ajv2020Import

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
// A null field that needs no reason: a screen with no hinge across it has no fold, and a hidden
// status bar has no frame.
const FOLDLESS = new Set(['main', 'closed', 'tent'])

export function checkSchema(doc: unknown, schema: object): string[] {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validate = ajv.compile(schema)
  if (validate(doc)) return []
  return (validate.errors ?? []).map((e) => `schema: ${e.instancePath || '/'} ${e.message}`)
}

function where(device: Device, r: Reading): string {
  return `${device.id} ${r.runtime.build} ${r.screen} ${r.rotation}`
}

function nullPaths(r: Reading): string[] {
  const out: string[] = []
  const skip = new Set(['runtime', 'measured', 'missing'])
  for (const [key, value] of Object.entries(r)) {
    if (skip.has(key)) continue
    if (value === null) {
      out.push(key)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [sub, v] of Object.entries(value)) if (v === null) out.push(`${key}.${sub}`)
    }
  }
  return out
}

function lookup(r: Reading, path: string): unknown {
  let cur: unknown = r
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function checkRules(data: Dataset, changelog: string): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const device of data.devices) {
    if (ids.has(device.id)) errors.push(`${device.id}: the id is not unique`)
    ids.add(device.id)
    if (!ID.test(device.id)) errors.push(`${device.id}: an id is lowercase words joined by hyphens`)
    const screens = new Set(device.screens ? device.screens.map((s) => s.id) : ['main'])
    const keys = new Set<string>()
    for (const r of device.readings) {
      const at = where(device, r)
      const key = `${r.runtime.build} ${r.screen} ${r.rotation}`
      if (keys.has(key)) errors.push(`${at}: a second reading for this build, screen and rotation`)
      keys.add(key)
      if (!screens.has(r.screen)) errors.push(`${at}: the device lists no screen ${r.screen}`)
      const display = device.displays[displayOf(device, r.screen)]
      if (!display) {
        errors.push(`${at}: no display for screen ${r.screen}`)
        continue
      }
      const { width, height } = r.window
      if ((width > height ? 'landscape' : 'portrait') !== r.orientation) {
        errors.push(`${at}: orientation ${r.orientation} for a ${width} × ${height} window`)
      }
      for (const name of ['safeAreaInsets', 'systemBarInsets', 'cutoutInsets'] as const) {
        const i = r[name]
        if (!i) continue
        if (i.top + i.bottom >= height || i.left + i.right >= width) {
          errors.push(`${at}: ${name} leave no safe area in ${width} × ${height}`)
        }
      }
      const half = Math.min(width, height) / 2
      for (const set of ['profile', 'measured'] as const) {
        const c = r.cornerRadii[set]
        if (!c) continue
        for (const corner of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const) {
          if (c[corner] > half) errors.push(`${at}: cornerRadii.${set}.${corner} ${c[corner]} is above half the shorter side`)
        }
      }
      if (device.platform === 'ios') {
        const scale = display.scale ?? 0
        if (Math.abs(width * scale - r.pixels.width) > 1 || Math.abs(height * scale - r.pixels.height) > 1) {
          errors.push(`${at}: window × scale ${width * scale} × ${height * scale} is not pixels ${r.pixels.width} × ${r.pixels.height}`)
        }
      } else {
        const k = (display.density ?? 0) / 160
        if (Math.abs(width * k - r.pixels.width) > 0.5 || Math.abs(height * k - r.pixels.height) > 0.5) {
          errors.push(`${at}: dp × density ÷ 160 is not pixels ${r.pixels.width} × ${r.pixels.height}`)
        }
      }
      const on = device.platform === 'ios' ? 'simulator' : 'emulator'
      if (r.measured.on !== on) errors.push(`${at}: measured on ${r.measured.on}, expected ${on}`)
      for (const run of r.measured.runs) if (!(run in data.runs)) errors.push(`${at}: unknown run ${run}`)
      for (const path of nullPaths(r)) {
        if (path in r.missing) continue
        if (path === 'fold' && FOLDLESS.has(r.screen)) continue
        if (path === 'statusBar.frame' && r.statusBar?.placement === 'hidden') continue
        errors.push(`${at}: ${path} is null with no reason in missing`)
      }
      for (const path of Object.keys(r.missing)) {
        if (lookup(r, path) !== null) errors.push(`${at}: missing names ${path}, which is not null`)
      }
    }
    const current = device.readings.filter((r) => r.runtime.build === device.current.build)
    if (current.length === 0) {
      errors.push(`${device.id}: current names build ${device.current.build}, which has no reading`)
    } else if (current.some((r) => r.runtime.prerelease)) {
      errors.push(`${device.id}: current names a pre-release build`)
    } else if (current[0].runtime.version !== device.current.version) {
      errors.push(`${device.id}: current's version ${device.current.version} is not its build's`)
    }
  }
  if (!new RegExp(`^## ${data.version.replaceAll('.', '\\.')}\\b`, 'm').test(changelog)) {
    errors.push(`data/CHANGELOG.md has no entry "## ${data.version}"`)
  }
  return errors
}

/** Every check on the dataset: the schema first, then the rules on a file the schema accepts. */
export function checkData(doc: unknown, schema: object, changelog: string): string[] {
  const schemaErrors = checkSchema(doc, schema)
  if (schemaErrors.length) return schemaErrors
  return checkRules(doc as Dataset, changelog)
}
