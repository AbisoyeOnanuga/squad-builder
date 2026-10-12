const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT?.trim() ?? ''
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID?.trim() ?? ''

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId: 'squad_desk',
  profilesTableId: 'profiles',
  teamsTableId: 'teams',
  requestsTableId: 'join_requests',
  functionId: 'squad-agent',
}

export const isConfigured = endpoint.length > 0 && projectId.length > 0
