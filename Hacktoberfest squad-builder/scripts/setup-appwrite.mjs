import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { Client, Functions, Permission, Role, Runtime, TablesDB } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATABASE_ID = 'squad_desk'
const FUNCTION_ID = 'squad-agent'

await loadEnv(path.join(root, '.env.local'))
await loadEnv(path.join(root, '.env'))

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !projectId || !apiKey) {
  console.error('Set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env.local.')
  process.exit(1)
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const tablesDB = new TablesDB(client)
const functions = new Functions(client)

await ignoreConflict(tablesDB.create({ databaseId: DATABASE_ID, name: 'Squad desk' }))

await ensureTable('profiles', 'Profiles', [
  Permission.read(Role.any()),
  Permission.create(Role.users()),
])
await columns('profiles', [
  () => varchar('profiles', 'displayName', 80, true),
  () => varchar('profiles', 'role', 40, true),
  () => varchar('profiles', 'skills', 32, true, true),
  () => varchar('profiles', 'event', 80, true),
  () => varchar('profiles', 'timezone', 64, true),
  () => enumColumn('profiles', 'availability', ['weekday-evenings', 'weekends', 'full-event', 'flexible'], true),
  () => enumColumn('profiles', 'intent', ['seeking', 'hosting', 'either'], true),
  () => varchar('profiles', 'github', 200, false),
  () => varchar('profiles', 'discord', 40, false),
  () => varchar('profiles', 'bio', 500, false),
  () => booleanColumn('profiles', 'open', true),
])
await waitForTable('profiles')
await ignoreConflict(index('profiles', 'idx_open', ['open']))
await ignoreConflict(index('profiles', 'idx_event', ['event']))

await ensureTable('teams', 'Teams', [
  Permission.read(Role.any()),
  Permission.create(Role.users()),
])
await columns('teams', [
  () => varchar('teams', 'name', 60, true),
  () => varchar('teams', 'event', 80, true),
  () => varchar('teams', 'pitch', 400, true),
  () => integerColumn('teams', 'seats', true),
  () => varchar('teams', 'neededRoles', 32, true, true),
  () => varchar('teams', 'ownerId', 36, true),
  () => varchar('teams', 'ownerName', 80, true),
])
await waitForTable('teams')
await ignoreConflict(index('teams', 'idx_owner', ['ownerId']))

await ensureTable('join_requests', 'Join requests', [Permission.create(Role.users())])
await columns('join_requests', [
  () => varchar('join_requests', 'teamId', 36, true),
  () => varchar('join_requests', 'teamName', 60, true),
  () => varchar('join_requests', 'requesterId', 36, true),
  () => varchar('join_requests', 'requesterName', 80, true),
  () => varchar('join_requests', 'ownerId', 36, true),
  () => varchar('join_requests', 'message', 280, false),
  () => enumColumn('join_requests', 'status', ['pending', 'accepted', 'declined'], true),
])
await waitForTable('join_requests')
await ignoreConflict(index('join_requests', 'idx_team', ['teamId']))
await ignoreConflict(index('join_requests', 'idx_owner', ['ownerId']))

await ensureFunction()
if (process.env.GROQ_API_KEY) {
  await ensureGroqVariable(process.env.GROQ_API_KEY)
} else {
  console.log('GROQ_API_KEY is empty. Invite drafts and match reasons stay on local templates until you set it on the function.')
}
await deployFunction()
console.log('Squad desk tables are ready.')

async function ensureTable(tableId, name, permissions) {
  await ignoreConflict(
    tablesDB.createTable({
      databaseId: DATABASE_ID,
      tableId,
      name,
      permissions,
      rowSecurity: true,
      enabled: true,
    }),
  )
}

async function columns(tableId, builders) {
  for (const build of builders) {
    await ignoreConflict(build())
  }
}

function varchar(tableId, key, size, required, array = false) {
  return tablesDB.createVarcharColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    size,
    required,
    array,
  })
}

function enumColumn(tableId, key, elements, required) {
  return tablesDB.createEnumColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    elements,
    required,
  })
}

function booleanColumn(tableId, key, required) {
  return tablesDB.createBooleanColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    required,
  })
}

function integerColumn(tableId, key, required) {
  return tablesDB.createIntegerColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    required,
    min: 2,
    max: 8,
  })
}

function index(tableId, key, columns) {
  return tablesDB.createIndex({
    databaseId: DATABASE_ID,
    tableId,
    key,
    type: 'key',
    columns,
  })
}

async function waitForTable(tableId) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId })
    const failed = table.columns.find((column) => column.status === 'failed' || column.status === 'stuck')
    if (failed) throw new Error(`Column ${failed.key} on ${tableId} is ${failed.status}: ${failed.error}`)
    const ready = table.columns.length > 0 && table.columns.every((column) => column.status === 'available')
    if (ready) return
    await delay(750)
  }
  throw new Error(`Timed out waiting for ${tableId} columns.`)
}

async function ensureFunction() {
  const params = {
    name: 'Squad agent',
    runtime: Runtime.Node22,
    execute: ['users'],
    events: [],
    timeout: 15,
    enabled: true,
    logging: true,
    entrypoint: 'src/main.js',
    commands: 'npm install',
    scopes: ['rows.read'],
  }
  try {
    await functions.get({ functionId: FUNCTION_ID })
    await functions.update({ functionId: FUNCTION_ID, ...params })
  } catch (error) {
    if (!error || error.code !== 404) throw error
    await functions.create({ functionId: FUNCTION_ID, ...params })
  }
}

async function ensureGroqVariable(value) {
  const listed = await functions.listVariables({ functionId: FUNCTION_ID })
  const existing = listed.variables.find((variable) => variable.key === 'GROQ_API_KEY')
  if (existing) {
    await functions.updateVariable({
      functionId: FUNCTION_ID,
      variableId: existing.$id,
      key: 'GROQ_API_KEY',
      value,
      secret: true,
    })
    return
  }
  await functions.createVariable({
    functionId: FUNCTION_ID,
    variableId: 'groq-api-key',
    key: 'GROQ_API_KEY',
    value,
    secret: true,
  })
}

async function deployFunction() {
  const directory = await mkdtemp(path.join(tmpdir(), 'squad-agent-'))
  const archive = path.join(directory, 'code.tar.gz')
  const functionDir = path.join(root, 'functions', 'squad-agent')
  try {
    await tar(archive, functionDir)
    const deployment = await functions.createDeployment({
      functionId: FUNCTION_ID,
      code: InputFile.fromPath(archive, 'code.tar.gz'),
      activate: true,
      entrypoint: 'src/main.js',
      commands: 'npm install',
    })
    console.log(`Deployment ${deployment.$id} started. Wait in the Appwrite console until the build is ready.`)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function tar(archive, functionDir) {
  return new Promise((resolve, reject) => {
    execFile(
      'tar',
      ['-czf', archive, '-C', functionDir, 'package.json', 'package-lock.json', 'src'],
      (error) => (error ? reject(error) : resolve()),
    )
  })
}

async function ignoreConflict(work) {
  try {
    return await work
  } catch (error) {
    if (error && error.code === 409) return null
    throw error
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadEnv(file) {
  let text = ''
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return
    throw error
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}
