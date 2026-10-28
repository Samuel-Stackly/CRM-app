import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll } from 'vitest'

/**
 * Real MongoDB semantics without an external server.
 *
 * The suite never touches Atlas: an in-memory server is started here and the
 * application's models bind to it, so `npm test` works offline and with no
 * credentials configured.
 */
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  // autoIndex is disabled outside development, so the unique indexes have to be
  // built explicitly or duplicate-key tests would pass for the wrong reason.
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
