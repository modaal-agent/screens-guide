import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APPEARANCE_HEAD_SCRIPT, APPEARANCE_KEY, applyAppearance, readAppearance, saveAppearance } from '../src/lib/appearance.ts'

function store(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial))
  return {
    entries,
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => void entries.set(k, v),
    removeItem: (k: string) => void entries.delete(k),
  }
}

const refusing = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('SecurityError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

describe('the appearance choice', () => {
  it('reads light or dark, and auto for anything else or no storage', () => {
    expect(readAppearance(store({ [APPEARANCE_KEY]: 'light' }))).toBe('light')
    expect(readAppearance(store({ [APPEARANCE_KEY]: 'dark' }))).toBe('dark')
    expect(readAppearance(store({ [APPEARANCE_KEY]: 'sepia' }))).toBe('auto')
    expect(readAppearance(store())).toBe('auto')
    expect(readAppearance(null)).toBe('auto')
    expect(readAppearance(refusing)).toBe('auto')
  })

  it('stores light or dark, and deletes the entry for auto', () => {
    const s = store()
    saveAppearance(s, 'dark')
    expect([...s.entries]).toEqual([[APPEARANCE_KEY, 'dark']])
    saveAppearance(s, 'auto')
    expect(s.entries.size).toBe(0)
    expect(() => saveAppearance(refusing, 'light')).not.toThrow()
  })

  it('sets data-theme for light and dark, and removes it for auto', () => {
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement
    applyAppearance(root, 'light')
    expect(root.dataset.theme).toBe('light')
    applyAppearance(root, 'auto')
    expect(root.dataset.theme).toBeUndefined()
  })

  it('has a head script that reads the same key', () => {
    expect(APPEARANCE_HEAD_SCRIPT).toContain(`localStorage.getItem("${APPEARANCE_KEY}")`)
  })
})

describe('the stylesheet', () => {
  const css = readFileSync(join(import.meta.dirname, '..', 'src/styles/global.css'), 'utf8')
  const tokens = (block: string) =>
    block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('--'))

  it("gives the picked Dark the same tokens as the system's dark, and Light the light ones", () => {
    const system = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\) \{([^}]*)\}/)
    const picked = css.match(/:root\[data-theme='dark'\] \{([^}]*)\}/)
    expect(system).not.toBeNull()
    expect(picked).not.toBeNull()
    expect(tokens(picked![1])).toEqual(tokens(system![1]))
    expect(tokens(system![1]).length).toBeGreaterThan(10)
    expect(picked![1]).toContain('color-scheme: dark')
    expect(css).toMatch(/:root\[data-theme='light'\] \{ color-scheme: light; \}/)
  })
})
