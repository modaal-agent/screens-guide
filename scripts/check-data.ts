// npm run check:data: data/devices.json against data/schema.json and the rules of spec 001 §6.

import { readFileSync } from 'node:fs'
import { checkData } from '../src/lib/data-check.ts'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const doc = JSON.parse(read('data/devices.json'))
const errors = checkData(doc, JSON.parse(read('data/schema.json')), read('data/CHANGELOG.md'))

if (errors.length) {
  for (const e of errors) console.error(e)
  console.error(`check:data: ${errors.length} failed`)
  process.exit(1)
}
const readings = doc.devices.reduce((n: number, d: { readings: unknown[] }) => n + d.readings.length, 0)
console.log(`check:data: data/devices.json ${doc.version} passes: ${doc.devices.length} devices, ${readings} readings`)
