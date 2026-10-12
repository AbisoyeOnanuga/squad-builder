import { Client, Query, TablesDB } from 'node-appwrite'
import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'

const MODEL = 'openai/gpt-oss-20b'
const DATABASE_ID = 'squad_desk'
const PROFILES = 'profiles'

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST' || (req.path !== '/bio' && req.path !== '/match')) {
    return res.json({ ok: false, error: 'Unknown path.' })
  }

  const userId = req.headers['x-appwrite-user-id']
  if (!userId) {
    return res.json({ ok: false, error: 'Sign in before asking the desk.' })
  }

  try {
    if (req.path === '/bio') {
      const bio = await draftBio(req.bodyJson ?? {})
      return res.json({ ok: true, bio })
    }
    const matches = await explainMatches(userId, log)
    return res.json({ ok: true, matches })
  } catch (caught) {
    error(caught instanceof Error ? caught.message : String(caught))
    return res.json({
      ok: false,
      error: caught instanceof Error ? caught.message : 'The desk agent could not answer.',
    })
  }
}

function requireKey() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set on the squad-agent function.')
  }
}

async function draftBio(fields) {
  requireKey()
  const facts = {
    name: fields.displayName,
    role: fields.role,
    skills: fields.skills,
    event: fields.event,
    availability: fields.availability,
    intent: fields.intent,
    timezone: fields.timezone,
  }
  const result = await generateText({
    model: groqModel(),
    prompt: `Write one or two sentences, under 280 characters, in first person. Explain why a hackathon team should invite this person. Use only these facts. No hashtags. No wrapping quotation marks.\n${JSON.stringify(facts)}`,
  })
  return clean(result.text, 500)
}

async function explainMatches(userId, log) {
  const tables = new TablesDB(adminClient())
  const listed = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: PROFILES,
    queries: [Query.equal('open', true), Query.limit(100)],
  })
  const rows = listed.rows ?? []
  const me = rows.find((row) => row.$id === userId)
  if (!me) throw new Error('Save your card before asking for suggestions.')

  const mine = new Set((me.skills ?? []).map((skill) => String(skill).toLowerCase()))
  const ranked = rows
    .filter((row) => row.$id !== userId && String(row.event).toLowerCase() === String(me.event).toLowerCase())
    .map((row) => {
      const skills = Array.isArray(row.skills) ? row.skills.map(String) : []
      const theyBring = skills.filter((skill) => !mine.has(skill.toLowerCase()))
      let score = theyBring.length * 3
      if (row.availability === me.availability) score += 2
      if (me.intent === 'seeking' && row.intent === 'hosting') score += 4
      if (me.intent === 'hosting' && row.intent === 'seeking') score += 4
      const reason = theyBring.length
        ? `Brings ${theyBring.slice(0, 3).join(', ')}.`
        : `Same ${row.event} event.`
      return {
        userId: row.$id,
        name: row.displayName,
        role: row.role,
        skills,
        availability: row.availability,
        intent: row.intent,
        reason,
        score,
      }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (ranked.length === 0) return []
  requireKey()
  log(`Scoring ${ranked.length} matches for ${userId}`)
  const result = await generateText({
    model: groqModel(),
    prompt: `Rewrite each reason as one sentence under 180 characters. Use only the facts given. Return JSON only: {"matches":[{"userId":"...","why":"..."}]}\nCaller: ${JSON.stringify({ role: me.role, skills: me.skills, availability: me.availability, intent: me.intent })}\nCandidates: ${JSON.stringify(ranked)}`,
  })
  const parsed = parseMatches(result.text)
  if (parsed.length === 0) {
    return ranked.map((row) => ({ userId: row.userId, why: row.reason }))
  }
  return parsed
}

function groqModel() {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
  return groq(MODEL)
}

function adminClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY)
}

function clean(text, max) {
  return text.trim().replace(/^["']|["']$/g, '').slice(0, max)
}

function parseMatches(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!parsed || !Array.isArray(parsed.matches)) return []
    return parsed.matches
      .filter((match) => match && typeof match.userId === 'string' && typeof match.why === 'string')
      .map((match) => ({ userId: match.userId, why: clean(match.why, 180) }))
  } catch {
    return []
  }
}
