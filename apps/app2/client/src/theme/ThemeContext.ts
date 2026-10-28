import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeValue {
  theme: Theme
  toggle: () => void
}

export const ThemeContext = createContext<ThemeValue | undefined>(undefined)
