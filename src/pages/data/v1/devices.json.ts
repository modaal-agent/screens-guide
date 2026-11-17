// data/devices.json as it is.
import type { APIRoute } from 'astro'
import devices from '../../../../data/devices.json?raw'

export const GET: APIRoute = () => new Response(devices, { headers: { 'Content-Type': 'application/json' } })
