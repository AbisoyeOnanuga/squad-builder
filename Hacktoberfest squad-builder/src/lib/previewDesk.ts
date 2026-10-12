import {
  localDraft,
  profileSchema,
  teamSchema,
  type DeskUser,
  type JoinRequest,
  type Profile,
  type ProfileInput,
  type RequestStatus,
  type Team,
  type TeamInput,
} from './profile'

const STORAGE_KEY = 'squad-desk-preview'

type PreviewDb = {
  users: { id: string; email: string; password: string; name: string }[]
  sessionUserId: string | null
  profiles: Profile[]
  teams: Team[]
  requests: JoinRequest[]
}

const sampleProfiles: Profile[] = [
  {
    id: 'sample-mina',
    displayName: 'Mina Cho',
    role: 'Frontend',
    skills: ['React', 'CSS', 'Accessibility'],
    event: 'Hacktoberfest',
    timezone: 'America/Toronto',
    availability: 'weekday-evenings',
    intent: 'hosting',
    github: 'https://github.com/minacho',
    discord: 'mina',
    bio: 'I keep the interface honest and the focus states visible. Ask me in when the squad needs a calm frontend lead.',
    open: true,
  },
  {
    id: 'sample-jonah',
    displayName: 'Jonah Adeyemi',
    role: 'Backend',
    skills: ['Node', 'Appwrite', 'SQL'],
    event: 'Hacktoberfest',
    timezone: 'Europe/London',
    availability: 'weekends',
    intent: 'seeking',
    github: 'https://github.com/jonahadeyemi',
    discord: 'jonah',
    bio: 'I wire the data so the board stays fast. Free on weekends, looking for a squad that already has a frontend.',
    open: true,
  },
  {
    id: 'sample-laila',
    displayName: 'Laila Rahman',
    role: 'Design',
    skills: ['Figma', 'Type', 'Prototyping'],
    event: 'Hacktoberfest',
    timezone: 'Asia/Dhaka',
    availability: 'flexible',
    intent: 'either',
    github: 'https://github.com/lailarahman',
    discord: 'laila',
    bio: 'I design the card before the code exists. Flexible hours, happy to host or join.',
    open: true,
  },
  {
    id: 'sample-otto',
    displayName: 'Otto Berg',
    role: 'ML',
    skills: ['Python', 'Embeddings', 'Evaluation'],
    event: 'Hacktoberfest',
    timezone: 'Europe/Berlin',
    availability: 'full-event',
    intent: 'seeking',
    github: 'https://github.com/ottoberg',
    discord: 'otto',
    bio: 'I can sit with a model all weekend and tell you when it is guessing. Looking for builders, not another slide deck.',
    open: true,
  },
]

function seed(): PreviewDb {
  return {
    users: [],
    sessionUserId: null,
    profiles: sampleProfiles,
    teams: [
      {
        id: 'sample-team-lumen',
        name: 'Lumen',
        event: 'Hacktoberfest',
        pitch: 'A public board of open-source issues with a human on each one. We have frontend. We need backend and a designer who likes dense type.',
        seats: 4,
        neededRoles: ['Backend', 'Design'],
        ownerId: 'sample-mina',
        ownerName: 'Mina Cho',
      },
    ],
    requests: [],
  }
}

function loadDb(): PreviewDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const fresh = seed()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      return fresh
    }
    const parsed = JSON.parse(raw) as PreviewDb
    if (!Array.isArray(parsed.profiles) || !Array.isArray(parsed.teams) || !Array.isArray(parsed.users)) {
      throw new Error('Preview store was unreadable.')
    }
    return parsed
  } catch {
    const fresh = seed()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    return fresh
  }
}

function saveDb(db: PreviewDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function nextId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export async function currentUser(): Promise<DeskUser | null> {
  const db = loadDb()
  const user = db.users.find((item) => item.id === db.sessionUserId)
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name }
}

export async function register(input: { email: string; password: string; name: string }): Promise<DeskUser> {
  const db = loadDb()
  const email = input.email.trim().toLowerCase()
  if (input.password.length < 8) throw new Error('Use at least 8 characters.')
  if (db.users.some((user) => user.email === email)) throw new Error('That email already has a preview card.')
  const user = { id: nextId('local'), email, password: input.password, name: input.name.trim() }
  db.users.push(user)
  db.sessionUserId = user.id
  saveDb(db)
  return { id: user.id, email: user.email, name: user.name }
}

export async function login(input: { email: string; password: string }): Promise<DeskUser> {
  const db = loadDb()
  const email = input.email.trim().toLowerCase()
  const user = db.users.find((item) => item.email === email && item.password === input.password)
  if (!user) throw new Error('That email and password do not match a preview account.')
  db.sessionUserId = user.id
  saveDb(db)
  return { id: user.id, email: user.email, name: user.name }
}

export async function logout(): Promise<void> {
  const db = loadDb()
  db.sessionUserId = null
  saveDb(db)
}

export async function listProfiles(): Promise<Profile[]> {
  return loadDb().profiles.filter((profile) => profile.open)
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return loadDb().profiles.find((profile) => profile.id === userId) ?? null
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const data = profileSchema.parse(input)
  const db = loadDb()
  const profile: Profile = { id: userId, ...data }
  const index = db.profiles.findIndex((item) => item.id === userId)
  if (index === -1) db.profiles.push(profile)
  else db.profiles[index] = profile
  saveDb(db)
  return profile
}

export async function listTeams(): Promise<Team[]> {
  return loadDb().teams
}

export async function getTeam(teamId: string): Promise<Team | null> {
  return loadDb().teams.find((team) => team.id === teamId) ?? null
}

export async function createTeam(owner: DeskUser, input: TeamInput): Promise<Team> {
  const data = teamSchema.parse(input)
  const db = loadDb()
  const team: Team = { id: nextId('team'), ...data, ownerId: owner.id, ownerName: owner.name || data.name }
  db.teams.push(team)
  db.requests.push({
    id: nextId('request'),
    teamId: team.id,
    teamName: team.name,
    requesterId: 'sample-jonah',
    requesterName: 'Jonah Adeyemi',
    ownerId: owner.id,
    message: 'Preview request from Jonah. Accept or decline it to try the owner controls.',
    status: 'pending',
  })
  saveDb(db)
  return team
}

export async function listRequests(teamId: string): Promise<JoinRequest[]> {
  const db = loadDb()
  const userId = db.sessionUserId
  return db.requests.filter((request) => {
    if (request.teamId !== teamId) return false
    return request.requesterId === userId || request.ownerId === userId
  })
}

export async function createJoinRequest(input: {
  team: Team
  requester: DeskUser
  message: string
}): Promise<JoinRequest> {
  const db = loadDb()
  const request: JoinRequest = {
    id: nextId('request'),
    teamId: input.team.id,
    teamName: input.team.name,
    requesterId: input.requester.id,
    requesterName: input.requester.name,
    ownerId: input.team.ownerId,
    message: input.message.trim().slice(0, 280),
    status: 'pending',
  }
  db.requests.push(request)
  saveDb(db)
  return request
}

export async function updateRequestStatus(requestId: string, status: RequestStatus): Promise<JoinRequest> {
  const db = loadDb()
  const request = db.requests.find((item) => item.id === requestId)
  if (!request) throw new Error('That request is no longer on the desk.')
  request.status = status
  saveDb(db)
  return request
}

export async function draftBio(input: ProfileInput): Promise<{ text: string; notice: string | null }> {
  const data = profileSchema.parse(input)
  return {
    text: localDraft(data),
    notice: 'Local draft only. The Groq key lives on the Appwrite function, not in this browser.',
  }
}

export async function explainMatches(): Promise<{ whys: Record<string, string>; notice: string | null }> {
  return {
    whys: {},
    notice: 'The squad agent is not connected. Showing skill overlap instead.',
  }
}
