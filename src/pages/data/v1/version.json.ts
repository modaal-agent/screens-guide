// The dataset's version, date and counts.
import type { APIRoute } from 'astro'
import { versionJson } from '../../../lib/agent-files.ts'

export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(versionJson(), null, 2)}\n`, { headers: { 'Content-Type': 'application/json' } })
