import mongoose from 'mongoose'

import { env, isProduction } from './env.js'

/**
 * Human-readable connection target with credentials stripped.
 *
 * The raw MONGO_URI usually embeds a username and password, so it must never
 * reach a log, an error message or a response. Only the host and database name
 * are safe to surface; anything that cannot be parsed confidently is withheld
 * entirely rather than logged on a best-effort basis.
 */
export function describeConnectionTarget(uri: string): string {
  try {
    const url = new URL(uri)
    const database = url.pathname.replace(/^\//, '')
    return database ? `${url.host}/${database}` : url.host
  } catch {
    // Multi-host URIs (replica sets) are not valid WHATWG URLs. Rather than
    // risk echoing credentials from a partial parse, disclose nothing.
    return '(connection target hidden)'
  }
}

/**
 * Opens the MongoDB connection.
 *
 * Rejects if the initial connection cannot be established, so the caller can
 * refuse to start the HTTP listener. Mongoose buffers queries by default and
 * would otherwise let the server accept traffic it cannot serve.
 */
export async function connectDatabase(): Promise<void> {
  // Strip query keys not present in the schema instead of silently matching all.
  mongoose.set('strictQuery', true)

  // Index builds are convenient in development and an unwanted startup cost in
  // production, where indexes are expected to exist already.
  mongoose.set('autoIndex', !isProduction)

  // Fail fast instead of queueing operations against a connection that is down.
  mongoose.set('bufferCommands', false)

  registerConnectionListeners()

  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  })
}

/**
 * Closes the MongoDB connection. Safe to call when already disconnected.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return
  await mongoose.connection.close()
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1
}

let listenersRegistered = false

/**
 * Reports connection loss and recovery after the initial handshake.
 *
 * The driver retries on its own, so these are informational: the process stays
 * up and recovers rather than exiting on a transient network blip.
 */
function registerConnectionListeners(): void {
  if (listenersRegistered) return
  listenersRegistered = true

  mongoose.connection.on('error', (error: unknown) => {
    // Log the message only — a driver error can carry the full URI in its
    // properties, and dumping the object would leak credentials.
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[db] connection error: ${message}`)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected')
  })

  mongoose.connection.on('reconnected', () => {
    console.log('[db] reconnected')
  })
}
