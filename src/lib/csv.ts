// devices.csv: one row per reading, its nested fields flattened into columns joined with `_`.
// Lists and the `missing` map are JSON text in one column; a null or absent value is empty.

import schema from '../../data/schema.json' with { type: 'json' }
import type { Dataset, Device, Reading } from './dataset.ts'
import { displayOf } from './dataset.ts'

type Shape = Map<string, Shape | null>

/** Columns whose value is JSON text, not flattened further. */
const JSON_COLUMNS = new Set(['missing'])
const READING_KEYS: string[] = Object.keys(schema.$defs.reading.properties)
const DEVICE_COLUMNS = ['device_id', 'device_name', 'device_platform', 'device_kind', 'device_unit', 'display_scale', 'display_density', 'current']

function isLeaf(v: unknown): boolean {
  return v === null || typeof v !== 'object' || Array.isArray(v)
}

function addShape(shape: Shape, obj: Record<string, unknown>, prefix: string): void {
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix ? `${prefix}_${k}` : k
    if (JSON_COLUMNS.has(name) || isLeaf(v)) {
      if (!shape.has(k)) shape.set(k, null)
      continue
    }
    let sub = shape.get(k)
    if (!sub) {
      sub = new Map()
      shape.set(k, sub)
    }
    addShape(sub, v as Record<string, unknown>, name)
  }
}

function columnsOf(shape: Shape, prefix: string): string[][] {
  return [...shape.entries()].flatMap(([k, sub]) => (sub ? columnsOf(sub, `${prefix}${k}_`).map((p) => [k, ...p]) : [[k]]))
}

/** The reading columns as key paths, in the schema's order of a reading's fields. */
export function readingPaths(data: Dataset): string[][] {
  const shape: Shape = new Map()
  for (const d of data.devices) for (const r of d.readings) addShape(shape, r as unknown as Record<string, unknown>, '')
  const ordered: Shape = new Map()
  for (const k of [...READING_KEYS, ...shape.keys()]) if (shape.has(k) && !ordered.has(k)) ordered.set(k, shape.get(k)!)
  return columnsOf(ordered, '')
}

function at(obj: unknown, path: string[]): unknown {
  let v: unknown = obj
  for (const k of path) {
    if (v === null || v === undefined || typeof v !== 'object') return undefined
    v = (v as Record<string, unknown>)[k]
  }
  return v
}

export function cellOf(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function quote(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function readingRow(d: Device, r: Reading, paths: string[][]): string[] {
  const display = d.displays[displayOf(d, r.screen)]
  return [
    d.id, d.name, d.platform, d.kind, d.unit, cellOf(display.scale), cellOf(display.density),
    String(r.runtime.build === d.current.build),
    ...paths.map((p) => cellOf(at(r, p))),
  ]
}

export function csvHeader(paths: string[][]): string[] {
  return [...DEVICE_COLUMNS, ...paths.map((p) => p.join('_'))]
}

export function toCsv(data: Dataset): string {
  const paths = readingPaths(data)
  const rows = [csvHeader(paths), ...data.devices.flatMap((d) => d.readings.map((r) => readingRow(d, r, paths)))]
  return rows.map((row) => row.map(quote).join(',')).join('\n') + '\n'
}

/** RFC 4180 fields: quoted fields may hold commas, doubled quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}
