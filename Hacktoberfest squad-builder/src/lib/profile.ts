import { z } from 'zod'

export const availabilityValues = ['weekday-evenings', 'weekends', 'full-event', 'flexible'] as const
export const intentValues = ['seeking', 'hosting', 'either'] as const
export const requestStatusValues = ['pending', 'accepted', 'declined'] as const

export const availabilityLabel: Record<(typeof availabilityValues)[number], string> = {
  'weekday-evenings': 'Weekday evenings',
  weekends: 'Weekends',
  'full-event': 'The whole event',
  flexible: 'Flexible',
}

export const intentLabel: Record<(typeof intentValues)[number], string> = {
  seeking: 'Looking for a squad',
  hosting: 'Hosting a squad',
  either: 'Either side of the table',
}

const githubPattern = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9-]+\/?$/

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Add the name people should call you.').max(80),
  role: z.string().trim().min(2, 'Add a role, like frontend or design.').max(40),
  skills: z.array(z.string().trim().min(1).max(32)).min(1, 'Add at least one skill.').max(12),
  event: z.string().trim().min(2, 'Name the event.').max(80),
  timezone: z.string().trim().min(1, 'Pick a timezone.').max(64),
  availability: z.enum(availabilityValues),
  intent: z.enum(intentValues),
  github: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === '' || githubPattern.test(value), 'Use a GitHub profile URL.'),
  discord: z.string().trim().max(40),
  bio: z.string().trim().max(500, 'Keep the invite line under 500 characters.'),
  open: z.boolean(),
})

export const teamSchema = z.object({
  name: z.string().trim().min(2, 'Name the squad.').max(60),
  event: z.string().trim().min(2, 'Name the event.').max(80),
  pitch: z.string().trim().min(10, 'Say what this squad is building.').max(400),
  seats: z.number().int().min(2, 'A squad needs at least two seats.').max(8),
  neededRoles: z.array(z.string().trim().min(1).max(32)).min(1, 'List a role you still need.').max(6),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type Profile = ProfileInput & { id: string }
export type TeamInput = z.infer<typeof teamSchema>
export type Team = TeamInput & { id: string; ownerId: string; ownerName: string }
export type RequestStatus = (typeof requestStatusValues)[number]

export type JoinRequest = {
  id: string
  teamId: string
  teamName: string
  requesterId: string
  requesterName: string
  ownerId: string
  message: string
  status: RequestStatus
}

export type DeskUser = {
  id: string
  email: string
  name: string
}

export type Match = {
  profile: Profile
  score: number
  reason: string
  theyBring: string[]
}

export type BoardFilters = {
  query: string
  role: string
  event: string
  availability: string
  intent: string
}

export const emptyFilters: BoardFilters = {
  query: '',
  role: '',
  event: '',
  availability: '',
  intent: '',
}

export function parseSkills(text: string): string[] {
  const seen = new Set<string>()
  const skills: string[] = []
  for (const part of text.split(',')) {
    const skill = part.trim()
    if (!skill) continue
    const key = skill.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    skills.push(skill)
  }
  return skills
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

export function localDraft(input: ProfileInput): string {
  const skills = input.skills.slice(0, 3).join(', ')
  return `${input.displayName} is a ${input.role.toLowerCase()} for ${input.event}, free ${availabilityLabel[input.availability].toLowerCase()}, bringing ${skills}. Ask them in if the squad needs that mix.`
}

export function matchesFilters(profile: Profile, filters: BoardFilters): boolean {
  const query = filters.query.trim().toLowerCase()
  if (query) {
    const haystack = [profile.displayName, profile.role, profile.bio, profile.event, ...profile.skills]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(query)) return false
  }
  if (filters.role && profile.role.toLowerCase() !== filters.role.toLowerCase()) return false
  if (filters.event && !profile.event.toLowerCase().includes(filters.event.trim().toLowerCase())) return false
  if (filters.availability && profile.availability !== filters.availability) return false
  if (filters.intent && profile.intent !== filters.intent) return false
  return true
}

export function scoreMatches(me: Profile, others: Profile[]): Match[] {
  const mine = new Set(me.skills.map((skill) => skill.toLowerCase()))
  const matches: Match[] = []

  for (const profile of others) {
    if (profile.id === me.id || !profile.open) continue
    if (profile.event.toLowerCase() !== me.event.toLowerCase()) continue

    const theirs = new Set(profile.skills.map((skill) => skill.toLowerCase()))
    const theyBring = profile.skills.filter((skill) => !mine.has(skill.toLowerCase()))
    const shared = profile.skills.filter((skill) => mine.has(skill.toLowerCase()))
    let score = theyBring.length * 3
    if (profile.availability === me.availability) score += 2
    if (me.intent === 'seeking' && profile.intent === 'hosting') score += 4
    if (me.intent === 'hosting' && profile.intent === 'seeking') score += 4
    if (me.intent === 'either' || profile.intent === 'either') score += 1
    if (score === 0 && shared.length === 0) continue

    const reason = theyBring.length
      ? `Brings ${theyBring.slice(0, 3).join(', ')}, which is not on your card.`
      : `Same ${profile.event} desk, with ${shared.length} shared skill${shared.length === 1 ? '' : 's'}.`

    matches.push({ profile, score, reason, theyBring })
  }

  matches.sort((a, b) => b.score - a.score || a.profile.displayName.localeCompare(b.profile.displayName))
  return matches.slice(0, 5)
}

export function timezoneOptions(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    return Intl.supportedValuesOf('timeZone')
  }
  return ['UTC']
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
