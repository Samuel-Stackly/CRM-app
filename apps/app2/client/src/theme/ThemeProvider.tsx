import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { ThemeContext, type Theme } from './ThemeContext'

const STORAGE_KEY = 'shopdesk.theme'

/**
 * Resolves the theme to use on first paint.
 *
 * A stored choice wins over the OS setting; with neither, the OS decides. Both
 * reads are guarded because storage throws in a private window and
 * `matchMedia` is absent under jsdom.
 */
function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage unavailable — fall through to the OS preference.
  }

  try {
    if (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // No matchMedia (test environment) — default to light.
  }

  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  // The attribute is what every token in theme.css keys off, so it has to land
  // on <html> rather than on a wrapper element inside the tree.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // A failed write only costs the preference on next load.
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
