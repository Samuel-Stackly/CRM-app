import { useCallback, useEffect, useState } from 'react'

export type AsyncStatus = 'loading' | 'success' | 'error'

interface AsyncSnapshot<T> {
  status: AsyncStatus
  data: T | undefined
  error: Error | undefined
}

export interface AsyncState<T> extends AsyncSnapshot<T> {
  reload: () => void
}

const LOADING: AsyncSnapshot<never> = {
  status: 'loading',
  data: undefined,
  error: undefined,
}

/**
 * Runs an async fetcher and tracks loading, success and error.
 *
 * The fetcher identity is the query: pass a `useCallback` whose dependencies
 * are the values the request is built from, and changing any of them refetches.
 * An unmemoised fetcher would request on every render, so callers must memoise.
 *
 * Deliberately small — the app needs loading and error states on every view,
 * and a full query library is not warranted for the reads here.
 */
export function useAsync<T>(fetcher: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [snapshot, setSnapshot] = useState<AsyncSnapshot<T>>(LOADING)
  const [attempt, setAttempt] = useState(0)

  // Tracks which fetcher the current snapshot belongs to, so a new one resets
  // to loading during render rather than in an effect.
  const [activeFetcher, setActiveFetcher] = useState(() => fetcher)

  if (fetcher !== activeFetcher) {
    setActiveFetcher(() => fetcher)
    setSnapshot(LOADING)
  }

  useEffect(() => {
    const controller = new AbortController()

    activeFetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setSnapshot({ status: 'success', data: result, error: undefined })
      })
      .catch((caught: unknown) => {
        // An aborted request is a superseded render, not a failure to report.
        if (controller.signal.aborted) return
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setSnapshot({
          status: 'error',
          data: undefined,
          error: caught instanceof Error ? caught : new Error('Request failed'),
        })
      })

    // Supersedes the in-flight request when the query changes or the component
    // unmounts, so a slow earlier response cannot overwrite a newer one.
    return () => controller.abort()
  }, [activeFetcher, attempt])

  const reload = useCallback(() => {
    setSnapshot(LOADING)
    setAttempt((value) => value + 1)
  }, [])

  return { ...snapshot, reload }
}
