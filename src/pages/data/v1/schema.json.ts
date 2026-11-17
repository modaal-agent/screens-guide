// data/schema.json as it is.
import type { APIRoute } from 'astro'
import schema from '../../../../data/schema.json?raw'

export const GET: APIRoute = () => new Response(schema, { headers: { 'Content-Type': 'application/schema+json' } })
