import { useEffect, useState, type ReactNode } from 'react'
import * as desk from '../lib/desk'
import type { DeskUser } from '../lib/profile'
import { AuthContext, type AuthContextValue } from './context'

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
