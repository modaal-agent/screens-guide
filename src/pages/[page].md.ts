// The Markdown copy of each page that is not a device's: /index.md, /guide.md, ...
import type { APIRoute, GetStaticPaths } from 'astro'
import type { Doc } from '../lib/doc.ts'
import { markdownCopy, sitePages } from '../lib/pages/index.ts'

export const getStaticPaths = (() =>
  sitePages().map((doc) => ({ params: { page: doc.path === '/' ? 'index' : doc.path.slice(1) }, props: { doc } }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(markdownCopy((props as { doc: Doc }).doc), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
