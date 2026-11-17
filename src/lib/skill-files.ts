// The skill's files as the build serves them (spec 002 §4.2): each file under skills/screens-guide/
// at /skills/screens-guide/<path>, and all of them in /skills/screens-guide.zip, inside a folder
// named after the skill.

const RAW = import.meta.glob('../../skills/screens-guide/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const SKILL_NAME = 'screens-guide'

/** Each file's path inside the skill's folder, `SKILL.md` first, and its text. */
export const SKILL_FILES: { path: string; text: string }[] = Object.entries(RAW)
  .map(([key, text]) => ({ path: key.slice('../../skills/screens-guide/'.length), text }))
  .sort((a, b) => (a.path === 'SKILL.md' ? -1 : b.path === 'SKILL.md' ? 1 : a.path.localeCompare(b.path)))
