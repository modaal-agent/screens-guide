// One row per reading, nested fields joined with _.
import type { APIRoute } from 'astro'
import { toCsv } from '../../../lib/csv.ts'
import { DATA } from '../../../lib/data.ts'

export const GET: APIRoute = () => new Response(toCsv(DATA), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
