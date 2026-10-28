#!/usr/bin/env node
/**
 * Runs an npm script inside the active app, chosen by `activeApp` in
 * apps.config.json. Switching apps is a one-line code change there; nothing in
 * the running apps needs to know about it.
 *
 *   node scripts/run.mjs <script> [client|server]   run the script in one or both sides
 *   node scripts/run.mjs install                    install deps for both sides
 *   node scripts/run.mjs list                       print the configured apps
 *
 * The app can also be overridden per command with APP=app2 npm run dev.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(resolve(root, 'apps.config.json'), 'utf8'))

const name = process.env.APP || config.activeApp
const app = config.apps[name]
if (!app) {
  console.error(`Unknown app "${name}". Known apps: ${Object.keys(config.apps).join(', ')}`)
  process.exit(1)
}

const [script, sideArg] = process.argv.slice(2)
if (!script) {
  console.error('Usage: node scripts/run.mjs <script> [client|server]')
  process.exit(1)
}

if (script === 'list') {
  for (const [key, value] of Object.entries(config.apps)) {
    const mark = key === config.activeApp ? '*' : ' '
    console.log(`${mark} ${key.padEnd(10)} ${value.label} (${value.dir}) client:${value.clientPort} server:${value.serverPort}`)
  }
  process.exit(0)
}

const sides = sideArg ? [sideArg] : ['server', 'client']
const colors = { server: '\x1b[36m', client: '\x1b[35m' }

/** Runs one npm command in a side's folder, prefixing its output. */
function run(side) {
  const cwd = resolve(root, app.dir, side)
  if (!existsSync(cwd)) {
    console.error(`${app.dir}/${side} does not exist`)
    process.exit(1)
  }
  const args = script === 'install' ? ['install'] : ['run', script]
  const child = spawn('npm', args, {
    cwd,
    env: {
      ...process.env,
      APP_NAME: name,
      PORT: process.env.PORT ?? String(app.serverPort),
      VITE_PORT: String(app.clientPort),
    },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  const prefix = `${colors[side] ?? ''}[${name}:${side}]\x1b[0m `
  for (const stream of ['stdout', 'stderr']) {
    child[stream].on('data', (chunk) => {
      const lines = chunk.toString().split('\n')
      if (lines.at(-1) === '') lines.pop()
      process[stream === 'stdout' ? 'stdout' : 'stderr'].write(
        lines.map((line) => prefix + line).join('\n') + '\n',
      )
    })
  }
  return child
}

const children = sides.map(run)
let failed = 0

for (const child of children) {
  child.on('exit', (code) => {
    if (code) failed = code
    if (children.every((other) => other.exitCode !== null || other.killed)) process.exit(failed)
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal)
  })
}
