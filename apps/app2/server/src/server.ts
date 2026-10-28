import { createApp } from './app.js'
import { env } from './env.js'

createApp().listen(env.PORT, () => {
  console.log(`app2 server listening on http://localhost:${env.PORT}`)
})
