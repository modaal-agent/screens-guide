import type { APIRoute } from 'astro'
import { sitemapXml } from '../lib/agent-files.ts'

export const GET: APIRoute = () => new Response(sitemapXml(), { headers: { 'Content-Type': 'application/xml' } })
