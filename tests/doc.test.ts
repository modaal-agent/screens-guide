import { describe, expect, it } from 'vitest'
import { absoluteLinks, inlineHtml, markdownPath, tableMarkdown, toMarkdown } from '../src/lib/doc.ts'
import { changelogBlocks } from '../src/lib/pages/about.ts'

describe('inline text', () => {
  it('renders code, links and strong, and escapes everything else', () => {
    expect(inlineHtml('a `<b>` [c](/d) **e** & "f"')).toBe(
      'a <code>&lt;b&gt;</code> <a href="/d">c</a> <strong>e</strong> &amp; &quot;f&quot;',
    )
  })

  it('renders code inside a link label', () => {
    expect(inlineHtml('[`/data/v1/devices.json`](/data/v1/devices.json)')).toBe(
      '<a href="/data/v1/devices.json"><code>/data/v1/devices.json</code></a>',
    )
  })

  it('escapes markup that is not one of the three forms', () => {
    expect(inlineHtml('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;')
  })

  it('makes site-relative links absolute and leaves others alone', () => {
    expect(absoluteLinks('[a](/b) [c](#d) [e](https://f.example/)')).toBe(
      '[a](https://screens.guide/b) [c](#d) [e](https://f.example/)',
    )
  })
})

describe('Markdown', () => {
  it('names the copy of / index.md and of other pages their path plus .md', () => {
    expect(markdownPath('/')).toBe('/index.md')
    expect(markdownPath('/devices/iphone-17')).toBe('/devices/iphone-17.md')
  })

  it('writes a table with escaped pipes, reasons and notes', () => {
    const md = tableMarkdown({
      type: 'table',
      head: ['Field', { text: 'iOS 27.0', note: '`24A434`' }],
      rows: [{ cells: ['a | b', { text: '—', reason: 'not read' }] }, { cells: ['c', { text: '', lines: ['x', 'y'] }] }],
    })
    expect(md).toBe(
      '| Field | iOS 27.0 — `24A434` |\n| --- | --- |\n| a \\| b | — (not read) |\n| c | x; y |',
    )
  })

  it('drops slots without a Markdown form and keeps those with one', () => {
    const md = toMarkdown({
      path: '/x', title: 't', description: 'd', h1: 'X',
      blocks: [
        { type: 'slot', name: 'drawing' },
        { type: 'slot', name: 'table', markdown: [{ type: 'p', text: 'in its place' }] },
        { type: 'toc', links: [['a', '#a']] },
      ],
    }, 'footer')
    expect(md).toBe('# X\n\nin its place\n\n---\n\nfooter\n')
  })
})

describe('the changelog', () => {
  it('reads headings, paragraphs and wrapped list items', () => {
    const blocks = changelogBlocks('# Dataset changelog\n\nIntro\nwrapped.\n\n## 1.0.0 — 2026-11-17\n\n- one\n  wrapped\n- two\n')
    expect(blocks).toEqual([
      { type: 'p', text: 'Intro wrapped.' },
      { type: 'h2', text: '1.0.0 — 2026-11-17' },
      { type: 'list', items: ['one wrapped', 'two'] },
    ])
  })
})
