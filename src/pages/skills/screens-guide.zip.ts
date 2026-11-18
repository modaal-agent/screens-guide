// /skills/screens-guide.zip: the skill's folder, to upload to claude.ai or the Skills API.
import type { APIRoute } from 'astro'
import { DATA } from '../../lib/data.ts'
import { SKILL_FILES, SKILL_NAME } from '../../lib/skill-files.ts'
import { zip } from '../../lib/zip.ts'

export const GET: APIRoute = () => {
  const entries = SKILL_FILES.map((f) => ({ name: `${SKILL_NAME}/${f.path}`, data: new TextEncoder().encode(f.text) }))
  return new Response(zip(entries, new Date(`${DATA.updated}T00:00:00Z`)), { headers: { 'Content-Type': 'application/zip' } })
}
