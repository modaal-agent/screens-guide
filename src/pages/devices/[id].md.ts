// The Markdown copy of each device's page.
import type { APIRoute, GetStaticPaths } from 'astro'
import type { Doc } from '../../lib/doc.ts'
import { devicePages, markdownCopy } from '../../lib/pages/index.ts'

export const getStaticPaths = (() =>
  devicePages().map((doc) => ({ params: { id: doc.path.split('/').pop()! }, props: { doc } }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(markdownCopy((props as { doc: Doc }).doc), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
