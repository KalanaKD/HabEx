/** Theme preference: stored in localStorage, applied as a `.dark` class on <html>. */
export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref)
  } catch { /* private mode etc. — still apply for this session */ }
  applyTheme()
}

export function applyTheme(): void {
  const pref = getThemePref()
  const dark = pref === 'dark' || (pref === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1120' : '#f8fafc')
}

/** Call once at startup: applies the saved preference and tracks OS changes. */
export function initTheme(): void {
  applyTheme()
  media.addEventListener('change', () => { if (getThemePref() === 'system') applyTheme() })
}
