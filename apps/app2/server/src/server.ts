import { app } from './app.js'
import { connectDatabase, describeConnectionTarget } from './config/db.js'
import { env } from './config/env.js'

/**
 * Starts the API.
 *
 * The database connection is opened before the listener binds. Mongoose would
 * otherwise buffer queries against a connection that is down, so the server
 * would accept traffic it cannot serve and fail one request at a time instead
 * of refusing to start.
 */
async function start(): Promise<void> {
  try {
    await connectDatabase()
    console.log(`[db] connected to ${describeConnectionTarget(env.MONGO_URI)}`)
  } catch (error) {
    // The message only — a driver error can carry the full URI in its
    // properties, and dumping the object would leak credentials.
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[db] could not connect: ${message}`)
    process.exit(1)
  }

  app.listen(env.PORT, () => {
    console.log(`ShopDesk server listening on http://localhost:${env.PORT}`)
  })
}

void start()
