import type { Server } from 'node:http'

import { app } from './app.js'
import {
  connectDatabase,
  describeConnectionTarget,
  disconnectDatabase,
} from './config/db.js'
import { env } from './config/env.js'

/** Grace period for in-flight requests before the process is forced down. */
const SHUTDOWN_TIMEOUT_MS = 10_000

let httpServer: Server | undefined
let shuttingDown = false

/**
 * Boots the process: database first, HTTP listener second.
 *
 * The ordering is deliberate. If the listener opened first, the service would
 * briefly accept requests it could not serve and return errors that look like
 * application faults rather than a cold start.
 */
async function bootstrap(): Promise<void> {
  try {
    console.log(`[db] connecting to ${describeConnectionTarget(env.MONGO_URI)}`)
    await connectDatabase()
    console.log('[db] connected')
  } catch (error) {
    // Never log the error object itself — driver errors can carry the URI,
    // credentials included.
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[db] connection failed: ${message}`)
    process.exit(1)
  }

  httpServer = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`)
  })

  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    const reason =
      error.code === 'EADDRINUSE'
        ? `port ${env.PORT} is already in use`
        : error.message
    console.error(`[http] server error: ${reason}`)
    void shutdown('server error', 1)
  })
}

/**
 * Stops accepting connections, drains in-flight requests, then closes MongoDB.
 *
 * Ordering matters here too: closing the database first would fail any request
 * still being served.
 */
async function shutdown(signal: string, exitCode = 0): Promise<void> {
  // A second SIGINT (an impatient Ctrl-C) should not start a parallel shutdown.
  if (shuttingDown) return
  shuttingDown = true

  console.log(`${signal} received, shutting down`)

  // Hard deadline so a hung connection cannot keep the process alive forever.
  const forceExit = setTimeout(() => {
    console.error('[shutdown] grace period expired, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  try {
    if (httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => (error ? reject(error) : resolve()))
      })
      console.log('[http] closed')
    }

    await disconnectDatabase()
    console.log('[db] closed')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[shutdown] error during shutdown: ${message}`)
    process.exit(1)
  }

  clearTimeout(forceExit)
  process.exit(exitCode)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// A rejection or exception that reaches here means the process is in an unknown
// state; shut down rather than continue serving from it.
process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  console.error(`[process] unhandled rejection: ${message}`)
  void shutdown('unhandledRejection', 1)
})

process.on('uncaughtException', (error: Error) => {
  console.error(`[process] uncaught exception: ${error.message}`)
  void shutdown('uncaughtException', 1)
})

void bootstrap()
