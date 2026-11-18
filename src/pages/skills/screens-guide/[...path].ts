// /skills/screens-guide/<path>: each file of the skill, as it is in skills/screens-guide/.
import type { APIRoute, GetStaticPaths } from 'astro'
import { SKILL_FILES } from '../../../lib/skill-files.ts'

export const getStaticPaths: GetStaticPaths = () => SKILL_FILES.map((f) => ({ params: { path: f.path }, props: { text: f.text } }))

export const GET: APIRoute = ({ props }) => new Response(props.text as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
