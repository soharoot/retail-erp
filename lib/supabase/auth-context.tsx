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
    try {
      const { data } = await supabase
        .from("profiles")
        .select("org_id, full_name")
        .eq("id", userId)
        .maybeSingle()
      const oid = data?.org_id ?? null
      setOrgId(oid)
      // Cache orgId for offline fallback
      if (oid) {
        try { window.localStorage.setItem("erp-cached-orgId", oid) } catch { /* ignore */ }
      }
      return oid
    } catch {
      // Offline — try cached orgId
      const cached = window.localStorage.getItem("erp-cached-orgId")
      if (cached) setOrgId(cached)
      return cached
    }
  }, [])

  useEffect(() => {
    // Get initial session — with offline fallback
    supabase.auth.getUser().then(({ data: { user: fetchedUser } }) => {
      setUser(fetchedUser)
      if (fetchedUser) {
        // Cache user for offline fallback
        try {
          window.localStorage.setItem("erp-cached-user", JSON.stringify({
            id: fetchedUser.id,
            email: fetchedUser.email,
            user_metadata: fetchedUser.user_metadata,
          }))
        } catch { /* ignore */ }
        fetchOrgId(fetchedUser.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }).catch(() => {
      // Offline: try to load cached user from localStorage
      try {
        const raw = window.localStorage.getItem("erp-cached-user")
        if (raw) {
          const cachedUser = JSON.parse(raw) as User
          setUser(cachedUser)
          const cachedOid = window.localStorage.getItem("erp-cached-orgId")
          if (cachedOid) setOrgId(cachedOid)
        }
      } catch { /* ignore */ }
      setLoading(false)
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
