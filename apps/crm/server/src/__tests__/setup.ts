import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll } from 'vitest'

/**
 * Real MongoDB semantics without an external server.
 *
 * Env vars are set before any application module loads, because config/env.ts
 * validates and exits at import time.
 */
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  // monitorCommands lets tests observe the commands actually issued, which is
  // how the dashboard's round-trip count is asserted.
  await mongoose.connect(mongod.getUri(), { monitorCommands: true })
  // autoIndex is disabled outside development, so the unique email index has to
  // be built explicitly or duplicate-registration tests would pass wrongly.
  await mongoose.connection.syncIndexes()
})

afterEach(async () => {
  // Each test starts from an empty database, so ordering cannot matter.
  const { collections } = mongoose.connection
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  )
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})
