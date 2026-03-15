"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "./client"
import { logAction } from "@/lib/activity/log-action"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  orgId: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  orgId: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOrgId = useCallback(async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("org_id, full_name")
      .eq("id", userId)
      .maybeSingle()
    const oid = data?.org_id ?? null
    setOrgId(oid)
    return oid
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchOrgId(user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        fetchOrgId(newUser.id).then((oid) => {
          // Log login only on actual sign-in, not on session refresh
          if (event === "SIGNED_IN" && oid) {
            logAction({
              action: "auth.login",
              module: "auth",
              description: `User signed in`,
              userId: newUser.id,
              orgId: oid,
              userName: newUser.email ?? undefined,
            })
          }
        }).finally(() => setLoading(false))
      } else {
        setOrgId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setOrgId(null)
    window.location.href = "/login"
  }, [])

  return (
    <AuthContext.Provider value={{ user, orgId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
