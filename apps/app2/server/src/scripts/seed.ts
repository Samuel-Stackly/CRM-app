/**
 * Idempotent demo seed.
 *
 * Creates one demo account, 30 products and 50 orders spread over the last 14
 * days. Safe to run repeatedly: every write is keyed on a natural identifier
 * (the account's email, a product's name, an order's number) and upserted, so a
 * second run updates in place rather than duplicating.
 *
 * It never drops a collection, never deletes a document and never touches data
 * it did not create. Running it against a populated database adds the demo
 * records alongside whatever is already there.
 *
 *   npm run seed
 */
import mongoose from 'mongoose'

import { connectDatabase, describeConnectionTarget, disconnectDatabase } from '../config/db.js'
import { env } from '../config/env.js'
import { Order, ORDER_STATUSES, type OrderStatus } from '../models/Order.js'
import { PRODUCT_CATEGORIES, Product, type ProductCategory } from '../models/Product.js'
import { User } from '../models/User.js'
import { hashPassword } from '../modules/auth/auth.service.js'

const DEMO_EMAIL = 'admin@shopdesk.dev'
const DEMO_PASSWORD = 'Admin@123'

const PRODUCT_NAMES: Record<ProductCategory, string[]> = {
  Apparel: ['Merino Crew Jumper', 'Oxford Shirt', 'Selvedge Denim', 'Linen Overshirt', 'Wool Peacoat', 'Chino Trousers', 'Knit Beanie'],
  Electronics: ['Studio Headphones', 'Mechanical Keyboard', 'Portable SSD 1TB', 'USB-C Dock', '4K Webcam', 'Noise Meter', 'Desk Microphone', 'E-Ink Reader'],
  Home: ['Cast Iron Skillet', 'Pour-Over Kettle', 'Linen Bedding Set', 'Ceramic Dinner Plates', 'Walnut Chopping Board', 'Storage Basket', 'Table Lamp'],
  Outdoors: ['Trail Backpack 30L', 'Insulated Flask', 'Folding Camp Stool', 'Headtorch', 'Rain Shell', 'Trekking Poles', 'Dry Bag 20L', 'Camp Stove'],
}

const CUSTOMERS = [
  'Natali Craig', 'Drew Cano', 'Orlando Diggs', 'Andi Lane', 'Kate Morrison',
  'Koray Okumus', 'Melody Macy', 'Max Mustermann', 'Lena Fischer', 'Sofia Rossi',
]

/**
 * Deterministic pseudo-random generator.
 *
 * A fixed seed means a re-run produces the same figures, so the dashboard does
 * not change shape every time someone reseeds and the demo stays comparable.
 */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

const random = createRandom(20_261_028)

function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)]!
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

async function seedUser(): Promise<void> {
  const existing = await User.findOne({ email: DEMO_EMAIL })

  if (existing) {
    console.log(`  user     ${DEMO_EMAIL} already present, left unchanged`)
    return
  }

  await User.create({
    name: 'ShopDesk Admin',
    email: DEMO_EMAIL,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    avatarUrl: 'https://i.pravatar.cc/128?u=shopdesk-admin',
  })
  console.log(`  user     created ${DEMO_EMAIL}`)
}

async function seedProducts(): Promise<string[]> {
  const operations = []

  for (const category of PRODUCT_CATEGORIES) {
    for (const name of PRODUCT_NAMES[category]) {
      operations.push({
        updateOne: {
          filter: { name },
          update: {
            $set: {
              category,
              price: round2(12 + random() * 240),
              // A deliberate slice lands at or below the low-stock threshold so
              // the dashboard's low-stock figure is not always zero.
              stock: Math.floor(random() * 60),
              imageUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`,
            },
          },
          upsert: true,
        },
      })
    }
  }

  const result = await Product.bulkWrite(operations)
  console.log(
    `  products ${result.upsertedCount} created, ${result.modifiedCount} updated (${operations.length} total)`,
  )

  const products = await Product.find({}).select('_id name price')
  return products.map((product) => product.id as string)
}

async function seedOrders(): Promise<void> {
  const products = await Product.find({}).select('_id name price')

  if (products.length === 0) {
    throw new Error('No products to build orders from')
  }

  const operations = []

  for (let index = 0; index < 50; index += 1) {
    // Spread across the last 14 days, newest first, at a varied time of day.
    const daysAgo = Math.floor((index / 50) * 14)
    const placedAt = new Date()
    placedAt.setUTCDate(placedAt.getUTCDate() - daysAgo)
    placedAt.setUTCHours(Math.floor(random() * 24), Math.floor(random() * 60), 0, 0)

    const items = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
      const product = pick(products)
      return {
        product: product._id,
        name: product.name,
        quantity: 1 + Math.floor(random() * 3),
        price: product.price,
      }
    })

    const total = round2(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    )

    const orderNo = `SD-${String(4000 + index).padStart(4, '0')}`

    operations.push({
      updateOne: {
        filter: { orderNo },
        update: {
          $set: {
            customerName: pick(CUSTOMERS),
            items,
            total,
            status: pick([...ORDER_STATUSES]) as OrderStatus,
            createdAt: placedAt,
            updatedAt: placedAt,
          },
        },
        upsert: true,
      },
    })
  }

  // timestamps:true would overwrite the backdated createdAt on insert.
  const result = await Order.bulkWrite(operations, { timestamps: false })
  console.log(
    `  orders   ${result.upsertedCount} created, ${result.modifiedCount} updated (${operations.length} total)`,
  )
}

async function run(): Promise<void> {
  console.log(`Seeding ${describeConnectionTarget(env.MONGO_URI)}`)

  await connectDatabase()
  await mongoose.connection.syncIndexes()

  await seedUser()
  await seedProducts()
  await seedOrders()

  await disconnectDatabase()

  console.log('\nDone. Sign in with:')
  console.log(`  email    ${DEMO_EMAIL}`)
  console.log(`  password ${DEMO_PASSWORD}`)
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error'
  console.error(`Seed failed: ${message}`)
  process.exitCode = 1
  void disconnectDatabase()
})
