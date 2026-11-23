// The appearance buttons in the footer (spec 001 §13). Auto follows the system's light or dark
// setting; Light and Dark override it with `data-theme` on <html>. The choice is one local storage
// entry, written when the visitor picks Light or Dark and deleted when they pick Auto. It works on
// every host and sends no event.

export const APPEARANCES = ['auto', 'light', 'dark'] as const
export type Appearance = (typeof APPEARANCES)[number]

/** The local storage key that holds `light` or `dark`. */
export const APPEARANCE_KEY = 'appearance'

/** The entry as /privacy lists it, beside PostHog's (STORAGE_DOCS in src/lib/analytics.ts). */
export const APPEARANCE_STORAGE_DOC = {
  name: APPEARANCE_KEY,
  kind: 'local storage, until you pick Auto',
  when: 'you pick Light or Dark at the bottom of a page',
  holds: '`light` or `dark`',
}

/**
 * The script the layout writes inline at the top of <head>. It applies a stored Light or Dark before
 * the first paint, so a page does not flash the system's appearance first. The content security
 * policy allows it by its hash.
 */
export const APPEARANCE_HEAD_SCRIPT = `try{var a=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)});if(a==='light'||a==='dark')document.documentElement.dataset.theme=a}catch(e){}`

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The stored choice; `auto` when there is none, it is unreadable, or storage is refused. */
export function readAppearance(storage: Store | null): Appearance {
  try {
    const value = storage?.getItem(APPEARANCE_KEY)
    return value === 'light' || value === 'dark' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

/** Stores Light or Dark; Auto deletes the entry. A browser that refuses storage keeps the page's choice only. */
export function saveAppearance(storage: Store | null, appearance: Appearance): void {
  try {
    if (appearance === 'auto') storage?.removeItem(APPEARANCE_KEY)
    else storage?.setItem(APPEARANCE_KEY, appearance)
  } catch {
    // The choice still applies to this page.
  }
}

/** Sets or removes `data-theme`, which src/styles/global.css reads. */
export function applyAppearance(root: HTMLElement, appearance: Appearance): void {
  if (appearance === 'auto') delete root.dataset.theme
  else root.dataset.theme = appearance
}

/** Shows the footer's buttons, marks the stored choice, and applies and stores a click. */
export function wireAppearance(doc: Document): void {
  const group = doc.querySelector<HTMLElement>('[data-appearance-group]')
  if (!group) return
  let storage: Storage | null = null
  try {
    storage = doc.defaultView?.localStorage ?? null
  } catch {
    // Storage refused: the buttons still change the page.
  }
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-appearance]')]
  const mark = (appearance: Appearance) => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.appearance === appearance))
  }
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const appearance = b.dataset.appearance as Appearance
      saveAppearance(storage, appearance)
      applyAppearance(doc.documentElement, appearance)
      mark(appearance)
    })
  }
  mark(readAppearance(storage))
  group.hidden = false
}
