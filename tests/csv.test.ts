import { describe, expect, it } from 'vitest'
import { cellOf, csvHeader, parseCsv, readingPaths, toCsv } from '../src/lib/csv.ts'
import { DATA } from '../src/lib/data.ts'

function leaves(v: unknown, path: string[] = []): string[][] {
  if (v === null || typeof v !== 'object' || Array.isArray(v) || path.join('_') === 'missing') return [path]
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => leaves(x, [...path, k]))
}

function at(obj: unknown, path: string[]): unknown {
  return path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), obj)
}

describe('devices.csv', () => {
  const rows = parseCsv(toCsv(DATA))
  const [header, ...body] = rows
  const paths = readingPaths(DATA)
  const readings = DATA.devices.flatMap((d) => d.readings.map((r) => ({ d, r })))

  it('has a row per reading, each as wide as the header', () => {
    expect(header).toEqual(csvHeader(paths))
    expect(body).toHaveLength(readings.length)
    for (const row of body) expect(row).toHaveLength(header.length)
  })

  it('round-trips every value of every reading', () => {
    readings.forEach(({ d, r }, i) => {
      const row = Object.fromEntries(header.map((h, j) => [h, body[i][j]]))
      expect(row.device_id).toBe(d.id)
      expect(row.current).toBe(String(r.runtime.build === d.current.build))
      for (const p of paths) {
        const v = at(r, p)
        const cell = row[p.join('_')]
        if (v === null || v === undefined) expect(cell, `${d.id} ${p.join('_')}`).toBe('')
        else if (typeof v === 'object') expect(JSON.parse(cell), `${d.id} ${p.join('_')}`).toEqual(v)
        else if (typeof v === 'number') expect(Number(cell), `${d.id} ${p.join('_')}`).toBe(v)
        else expect(cell, `${d.id} ${p.join('_')}`).toBe(String(v))
      }
    })
  })

  it('has a column for every field of every reading', () => {
    const columns = new Set(paths.map((p) => p.join('_')))
    for (const { r } of readings) {
      for (const leaf of leaves(r)) {
        // A null object (cornerRadii.measured on a reading without it) is its children's empty columns.
        const covered = leaf.some((_, n) => columns.has(leaf.slice(0, n + 1).join('_'))) ||
          (at(r, leaf) === null && [...columns].some((c) => c.startsWith(`${leaf.join('_')}_`)))
        expect(covered, leaf.join('_')).toBe(true)
      }
    }
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(parseCsv('a,"b, ""c""\nd",e\n')).toEqual([['a', 'b, "c"\nd', 'e']])
    expect(cellOf(null)).toBe('')
    expect(cellOf(['x'])).toBe('["x"]')
  })
})
