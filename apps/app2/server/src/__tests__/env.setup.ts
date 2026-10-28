// Set before any application module loads: config/env.ts validates and calls
// process.exit at import time, so these cannot be assigned in a test body.
//
// MONGO_URI is a placeholder that satisfies the schema and is never dialled —
// the suite connects to an in-memory server instead (see setup.ts), so running
// tests needs no Atlas credentials.
process.env.NODE_ENV = 'test'
process.env.CLIENT_URL = 'http://localhost:5174'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/shopdesk-test-placeholder'
process.env.JWT_SECRET = 'test-secret-value-not-used-in-production'

// Pinned to false so the suite keeps verifying the CLIENT_URL allowlist, which
// is the posture production should run with. The allow-all mode is covered by
// unit tests in config/cors.test.ts.
process.env.CORS_ALLOW_ALL = 'false'
