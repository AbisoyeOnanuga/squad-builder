import { isConfigured } from './config'
import * as appwriteDesk from './appwriteDesk'
import * as previewDesk from './previewDesk'

const desk = isConfigured ? appwriteDesk : previewDesk

export const currentUser = desk.currentUser
export const register = desk.register
export const login = desk.login
export const logout = desk.logout
export const listProfiles = desk.listProfiles
export const getProfile = desk.getProfile
export const saveProfile = desk.saveProfile
export const listTeams = desk.listTeams
export const getTeam = desk.getTeam
export const createTeam = desk.createTeam
export const listRequests = desk.listRequests
export const createJoinRequest = desk.createJoinRequest
export const updateRequestStatus = desk.updateRequestStatus
export const draftBio = desk.draftBio
export const explainMatches = desk.explainMatches
