// One device, with the dataset's version, license and units, and the runs its readings name.
import type { APIRoute, GetStaticPaths } from 'astro'
import { deviceJson } from '../../../../lib/agent-files.ts'
import type { Device } from '../../../../lib/dataset.ts'
import { DEVICES } from '../../../../lib/data.ts'

export const getStaticPaths = (() => DEVICES.map((device) => ({ params: { id: device.id }, props: { device } }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(`${JSON.stringify(deviceJson((props as { device: Device }).device), null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json' },
  })
