import { useEffect, useState } from 'react'

/**
 * Delays a changing value until it has settled.
 *
 * Used for the search box: without it every keystroke is a request, and the
 * responses can arrive out of order.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
