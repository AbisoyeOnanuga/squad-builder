import { createContext } from 'react'
import type { DeskUser } from '../lib/profile'

export type AuthContextValue = {
  user: DeskUser | null
  ready: boolean
  signInOpen: boolean
  openSignIn: () => void
  closeSignIn: () => void
  register: (input: { email: string; password: string; name: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
