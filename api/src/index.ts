import { serve } from '@hono/node-server'
import { app } from './app.js'

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001)

console.log(`Unlockladder API on http://localhost:${PORT}`)
serve({ fetch: app.fetch, port: PORT })