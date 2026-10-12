import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as desk from '../lib/desk'
import type { DeskUser } from '../lib/profile'

type AuthContextValue = {
  user: DeskUser | null
  ready: boolean
  signInOpen: boolean
  openSignIn: () => void
  closeSignIn: () => void
  register: (input: { email: string; password: string; name: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DeskUser | null>(null)
  const [ready, setReady] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    desk.currentUser()
      .then((next) => {
        if (!cancelled) setUser(next)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value: AuthContextValue = {
    user,
    ready,
    signInOpen,
    openSignIn: () => setSignInOpen(true),
    closeSignIn: () => setSignInOpen(false),
    register: async (input) => {
      setUser(await desk.register(input))
      setSignInOpen(false)
    },
    login: async (input) => {
      setUser(await desk.login(input))
      setSignInOpen(false)
    },
    logout: async () => {
      await desk.logout()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
