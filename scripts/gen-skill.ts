// npm run gen:skill: writes skills/screens-guide/references/devices.md from data/devices.json
// (spec 002 §4.1). Commit the result: the plugin and `npx skills` read the repository, not the build.

import { readFileSync, writeFileSync } from 'node:fs'
import { skillReference } from '../src/lib/skill-reference.ts'

const root = new URL('../', import.meta.url)
const data = JSON.parse(readFileSync(new URL('data/devices.json', root), 'utf8'))
const target = new URL('skills/screens-guide/references/devices.md', root)
writeFileSync(target, skillReference(data))
console.log(`gen:skill: wrote skills/screens-guide/references/devices.md for dataset ${data.version}`)
