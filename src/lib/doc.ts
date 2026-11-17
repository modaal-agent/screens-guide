// A page's content as blocks, written once and rendered twice: as HTML by
// src/components/DocBlocks.astro and as the page's Markdown copy by toMarkdown().
//
// Text is a subset of inline Markdown: `code`, [label](href) and **strong**.

import { SITE } from './site.ts'

export type Text = string

/**
 * A table cell: the value, a reason shown after a missing value, a note on its own line, and
 * further values each on a line of their own (joined with "; " in Markdown).
 */
export interface CellValue {
  text: Text
  reason?: Text
  note?: Text
  lines?: Text[]
}
export type Cell = Text | CellValue

export interface Table {
  type: 'table'
  id?: string
  head: Cell[]
  /** The first cell of each row is its row header. */
  rows: { cells: Cell[]; beta?: boolean }[]
  /** Column indexes whose cells are numbers, set in tabular figures. */
  numeric?: number[]
  /** Column indexes of pre-release builds, shaded. */
  beta?: number[]
}

export type Block =
  | { type: 'h2'; text: Text; id?: string }
  | { type: 'h3'; text: Text; id?: string }
  | { type: 'p'; text: Text; lede?: boolean }
  | { type: 'list'; items: Text[] }
  | { type: 'cards'; items: Text[] }
  | { type: 'facts'; items: [Text, Text][] }
  | { type: 'toc'; links: [Text, string][] }
  | Table
  /** Markup only the HTML page has, such as a drawing; the Markdown copy shows `markdown` instead. */
  | { type: 'slot'; name: string; markdown?: Block[] }

export interface Doc {
  /** The page's path: `/`, `/guide`, `/devices/iphone-17`. */
  path: string
  title: string
  description: string
  h1: string
  blocks: Block[]
}

/** The Markdown copy's path: `/index.md` for `/`, else the path plus `.md`. */
export function markdownPath(path: string): string {
  return path === '/' ? '/index.md' : `${path}.md`
}

// ── inline text ─────────────────────────────────────────────────────────────────────────

const INLINE = /`([^`]+)`|\[((?:`[^`]*`|[^\]])+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Inline Markdown to HTML. Everything outside the three forms is escaped. */
export function inlineHtml(text: Text): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    out += escapeHtml(text.slice(last, m.index))
    if (m[1] !== undefined) out += `<code>${escapeHtml(m[1])}</code>`
    else if (m[2] !== undefined) out += `<a href="${escapeHtml(m[3])}">${inlineHtml(m[2])}</a>`
    else out += `<strong>${escapeHtml(m[4])}</strong>`
    last = m.index + m[0].length
  }
  return out + escapeHtml(text.slice(last))
}

/** Inline Markdown with site-relative links made absolute, so a copy read elsewhere still links. */
export function absoluteLinks(text: Text): Text {
  return text.replace(/\]\((\/[^)\s]*)\)/g, (_, href: string) => `](${SITE}${href})`)
}

// ── Markdown ────────────────────────────────────────────────────────────────────────────

export function cellText(c: Cell): Text {
  if (typeof c === 'string') return c
  const parts = [[c.text, ...(c.lines ?? [])].filter(Boolean).join('; ')]
  if (c.reason) parts.push(`(${c.reason})`)
  if (c.note) parts.push(`— ${c.note}`)
  return parts.join(' ')
}

function tableCell(c: Cell): string {
  return absoluteLinks(cellText(c)).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
}

export function tableMarkdown(t: Table): string {
  const line = (cells: Cell[]) => `| ${cells.map(tableCell).join(' | ')} |`
  return [line(t.head), `| ${t.head.map(() => '---').join(' | ')} |`, ...t.rows.map((r) => line(r.cells))].join('\n')
}

export function blocksMarkdown(blocks: Block[]): string {
  const out: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'h2': out.push(`## ${absoluteLinks(b.text)}`); break
      case 'h3': out.push(`### ${absoluteLinks(b.text)}`); break
      case 'p': out.push(absoluteLinks(b.text)); break
      case 'list':
      case 'cards': out.push(b.items.map((i) => `- ${absoluteLinks(i)}`).join('\n')); break
      case 'facts': out.push(b.items.map(([k, v]) => `- ${k}: ${absoluteLinks(v)}`).join('\n')); break
      case 'toc': break
      case 'table': out.push(tableMarkdown(b)); break
      case 'slot': if (b.markdown) out.push(blocksMarkdown(b.markdown)); break
    }
  }
  return out.filter((s) => s !== '').join('\n\n')
}

/** The page's Markdown copy: the heading, the blocks, and a footer naming the HTML page. */
export function toMarkdown(doc: Doc, footer: Text): string {
  return `# ${doc.h1}\n\n${blocksMarkdown(doc.blocks)}\n\n---\n\n${absoluteLinks(footer)}\n`
}
