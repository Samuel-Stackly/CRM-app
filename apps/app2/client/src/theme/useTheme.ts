import { useContext } from 'react'

import { ThemeContext, type ThemeValue } from './ThemeContext'

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
