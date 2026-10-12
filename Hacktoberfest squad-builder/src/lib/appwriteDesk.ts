import { ExecutionMethod, ID, Permission, Query, Role } from 'appwrite'
import { account, functions, tablesDB } from './appwrite'
import { appwriteConfig } from './config'
import { errorMessage, isNotFound } from './errors'
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

type ProfileRow = ProfileInput & { $id: string }
type TeamRow = TeamInput & { $id: string; ownerId: string; ownerName: string }
type RequestRow = Omit<JoinRequest, 'id'> & { $id: string }

function asProfile(row: ProfileRow): Profile | null {
  const parsed = profileSchema.safeParse({
    displayName: row.displayName,
    role: row.role,
    skills: Array.isArray(row.skills) ? row.skills : [],
    event: row.event,
    timezone: row.timezone,
    availability: row.availability,
    intent: row.intent,
    github: row.github ?? '',
    discord: row.discord ?? '',
    bio: row.bio ?? '',
    open: Boolean(row.open),
  })
  if (!parsed.success) return null
  return { id: row.$id, ...parsed.data }
}

function asTeam(row: TeamRow): Team | null {
  const parsed = teamSchema.safeParse({
    name: row.name,
    event: row.event,
    pitch: row.pitch,
    seats: Number(row.seats),
    neededRoles: Array.isArray(row.neededRoles) ? row.neededRoles : [],
  })
  if (!parsed.success || typeof row.ownerId !== 'string') return null
  return { id: row.$id, ownerId: row.ownerId, ownerName: row.ownerName, ...parsed.data }
}

function asRequest(row: RequestRow): JoinRequest | null {
  if (
    row.status !== 'pending' &&
    row.status !== 'accepted' &&
    row.status !== 'declined'
  ) {
    return null
  }
  return {
    id: row.$id,
    teamId: row.teamId,
    teamName: row.teamName,
    requesterId: row.requesterId,
    requesterName: row.requesterName,
    ownerId: row.ownerId,
    message: row.message ?? '',
    status: row.status,
  }
}

export async function currentUser(): Promise<DeskUser | null> {
  try {
    const user = await account.get()
    return { id: user.$id, email: user.email, name: user.name }
  } catch (error) {
    if (isNotFound(error) || (typeof error === 'object' && error !== null && 'code' in error && error.code === 401)) {
      return null
    }
    throw error
  }
}

export async function register(input: { email: string; password: string; name: string }): Promise<DeskUser> {
  await account.create({ userId: ID.unique(), email: input.email, password: input.password, name: input.name })
  return login(input)
}

export async function login(input: { email: string; password: string }): Promise<DeskUser> {
  await account.createEmailPasswordSession({ email: input.email, password: input.password })
  const user = await currentUser()
  if (!user) throw new Error('The session did not stick. Try signing in again.')
  return user
}

export async function logout(): Promise<void> {
  await account.deleteSession({ sessionId: 'current' })
}

export async function listProfiles(): Promise<Profile[]> {
  const result = await tablesDB.listRows<ProfileRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.profilesTableId,
    queries: [Query.equal('open', true), Query.limit(100)],
  })
  return result.rows.flatMap((row) => {
    const profile = asProfile(row)
    return profile ? [profile] : []
  })
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const row = await tablesDB.getRow<ProfileRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.profilesTableId,
      rowId: userId,
    })
    return asProfile(row)
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const data = profileSchema.parse(input)
  const existing = await getProfile(userId)
  if (existing) {
    const row = await tablesDB.updateRow<ProfileRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.profilesTableId,
      rowId: userId,
      data,
    })
    const profile = asProfile(row)
    if (!profile) throw new Error('The card saved, but it came back unreadable.')
    return profile
  }

  const row = await tablesDB.createRow<ProfileRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.profilesTableId,
    rowId: userId,
    data,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  })
  const profile = asProfile(row)
  if (!profile) throw new Error('The card saved, but it came back unreadable.')
  return profile
}

export async function listTeams(): Promise<Team[]> {
  const result = await tablesDB.listRows<TeamRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.teamsTableId,
    queries: [Query.limit(50)],
  })
  return result.rows.flatMap((row) => {
    const team = asTeam(row)
    return team ? [team] : []
  })
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const row = await tablesDB.getRow<TeamRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.teamsTableId,
      rowId: teamId,
    })
    return asTeam(row)
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function createTeam(owner: DeskUser, input: TeamInput): Promise<Team> {
  const data = teamSchema.parse(input)
  const row = await tablesDB.createRow<TeamRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.teamsTableId,
    rowId: ID.unique(),
    data: { ...data, ownerId: owner.id, ownerName: owner.name || data.name },
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(owner.id)),
      Permission.delete(Role.user(owner.id)),
    ],
  })
  const team = asTeam(row)
  if (!team) throw new Error('The squad was created, but it came back unreadable.')
  return team
}

export async function listRequests(teamId: string): Promise<JoinRequest[]> {
  const result = await tablesDB.listRows<RequestRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.requestsTableId,
    queries: [Query.equal('teamId', teamId), Query.limit(50)],
  })
  return result.rows.flatMap((row) => {
    const request = asRequest(row)
    return request ? [request] : []
  })
}

export async function createJoinRequest(input: {
  team: Team
  requester: DeskUser
  message: string
}): Promise<JoinRequest> {
  const message = input.message.trim().slice(0, 280)
  const row = await tablesDB.createRow<RequestRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.requestsTableId,
    rowId: ID.unique(),
    data: {
      teamId: input.team.id,
      teamName: input.team.name,
      requesterId: input.requester.id,
      requesterName: input.requester.name,
      ownerId: input.team.ownerId,
      message,
      status: 'pending' satisfies RequestStatus,
    },
    permissions: [
      Permission.read(Role.user(input.requester.id)),
      Permission.read(Role.user(input.team.ownerId)),
      Permission.update(Role.user(input.team.ownerId)),
      Permission.delete(Role.user(input.requester.id)),
    ],
  })
  const request = asRequest(row)
  if (!request) throw new Error('The request was sent, but it came back unreadable.')
  return request
}

export async function updateRequestStatus(requestId: string, status: RequestStatus): Promise<JoinRequest> {
  const row = await tablesDB.updateRow<RequestRow>({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.requestsTableId,
    rowId: requestId,
    data: { status },
  })
  const request = asRequest(row)
  if (!request) throw new Error('The request updated, but it came back unreadable.')
  return request
}

async function runAgent(path: string, body: unknown): Promise<{ ok: boolean; error?: string; bio?: string; matches?: { userId: string; why: string }[] }> {
  const execution = await functions.createExecution({
    functionId: appwriteConfig.functionId,
    body: JSON.stringify(body),
    async: false,
    xpath: path,
    method: ExecutionMethod.POST,
  })
  try {
    return JSON.parse(execution.responseBody) as {
      ok: boolean
      error?: string
      bio?: string
      matches?: { userId: string; why: string }[]
    }
  } catch {
    throw new Error(execution.responseBody || 'The squad agent returned an empty reply.')
  }
}

export async function draftBio(input: ProfileInput): Promise<{ text: string; notice: string | null }> {
  const data = profileSchema.parse(input)
  try {
    const result = await runAgent('/bio', data)
    if (!result.ok || !result.bio) {
      return {
        text: localDraft(data),
        notice: result.error ?? 'The squad agent is offline. This line is a local draft. Edit it before you save.',
      }
    }
    return { text: result.bio, notice: 'Draft from the squad agent. Edit it before you save.' }
  } catch (error) {
    return {
      text: localDraft(data),
      notice: `${errorMessage(error)} This line is a local draft.`,
    }
  }
}

export async function explainMatches(): Promise<{ whys: Record<string, string>; notice: string | null }> {
  try {
    const result = await runAgent('/match', {})
    if (!result.ok || !result.matches) {
      return {
        whys: {},
        notice: result.error ?? 'The squad agent is offline. Showing skill overlap instead.',
      }
    }
    const whys: Record<string, string> = {}
    for (const match of result.matches) {
      if (match.userId && match.why) whys[match.userId] = match.why
    }
    return { whys, notice: null }
  } catch (error) {
    return { whys: {}, notice: errorMessage(error) }
  }
}
