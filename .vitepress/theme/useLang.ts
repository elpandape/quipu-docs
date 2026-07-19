// Global, persistent store for the currently selected code language.
//
// A single module-level `ref` is shared by every <CodeTabs> on the page, so
// choosing a language in one block updates them all at once (Stripe/AWS style)
// and the choice is persisted in localStorage.
//
// SSR-safe: VitePress pre-renders pages on the server, where `window` and
// `localStorage` do not exist. The ref always starts at the default, and we
// only read/write storage on the client (guarded by `import.meta.env.SSR` and
// invoked from `onMounted`), which also keeps client hydration consistent with
// the server-rendered HTML.
import { ref } from 'vue'

const STORAGE_KEY = 'quipu-code-lang'
const DEFAULT_LANG = 'php'

export interface CodeLanguage {
  /** Slot name used in <CodeTabs>, e.g. `php`. */
  id: string
  /** Human label shown on the tab. */
  label: string
  /** Whether examples exist for this language yet. */
  available: boolean
}

// Order defines the tab order. Only `available` languages are selectable; the
// rest render as disabled "pronto" tabs until their examples are written.
export const languages: readonly CodeLanguage[] = [
  { id: 'php', label: 'PHP', available: true },
  { id: 'java', label: 'Java', available: false },
  { id: 'dotnet', label: '.NET', available: false },
  { id: 'python', label: 'Python', available: false },
  { id: 'js', label: 'JavaScript', available: false },
]

/** The selected code language, shared across every <CodeTabs>. */
export const currentLang = ref<string>(DEFAULT_LANG)

let hydrated = false

/**
 * Restore the persisted language on the client. Idempotent and safe to call
 * from every component's `onMounted`; runs at most once and never on the server.
 */
export function hydrateLang(): void {
  if (import.meta.env.SSR || hydrated) {
    return
  }
  hydrated = true
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved !== null && languages.some((lang) => lang.id === saved && lang.available)) {
      currentLang.value = saved
    }
  } catch {
    // localStorage can throw (private mode, disabled cookies); ignore.
  }
}

/** Select a language for the whole site and persist it. No-op for unavailable languages. */
export function setLang(id: string): void {
  const lang = languages.find((candidate) => candidate.id === id)
  if (lang === undefined || !lang.available) {
    return
  }
  currentLang.value = id
  if (import.meta.env.SSR) {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Ignore write failures (storage full/unavailable).
  }
}

/** Human label for a language id, falling back to the id itself. */
export function languageLabel(id: string): string {
  return languages.find((lang) => lang.id === id)?.label ?? id
}
