// Loaded by vitest before anything else; config/env.ts validates at import time.
process.env['NODE_ENV'] = 'test'
process.env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/placeholder'
process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-16-characters'
process.env['CLIENT_URL'] = 'http://localhost:5173'
