import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'franchise_owner' | 'director' | 'area_supervisor' | 'gm' | 'worker' | 'manager' | 'admin' | 'store'
  storeId?: string
  companyId?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (emailOrStore: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORE_PASSWORDS: Record<string, string> = {
  '957': 'waukegan1', '1183': 'grayslake1', '1963': 'mchenry1',
  '3175': 'dekalb1', '3309': 'elgin1', '3407': 'shorewood1',
  '3999': 'lincolnpark1', '4037': 'burbank1', '4106': 'southloop1',
  '4109': 'rivernorth1', '4870': 'ottawa1', '4929': 'yorkville1',
  '5070': 'aurora1', '5143': 'bolingbrook1',
}

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) { console.error('Profile fetch error:', error); return null }
  return { id: data.id, name: data.name, email: data.email, role: data.role, storeId: data.store_id, companyId: data.company_id }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('pie_rate_store')
    if (stored) {
      setUser(JSON.parse(stored))
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && mounted) {
        const profile = await fetchProfile(session.user.id)
        if (mounted) setUser(profile)
      }
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const login = async (emailOrStore: string, password: string): Promise<boolean> => {
    if (STORE_PASSWORDS[emailOrStore] === password) {
      const u: User = { id: emailOrStore, name: 'Store #' + emailOrStore, email: emailOrStore, role: 'store', storeId: emailOrStore }
      setUser(u)
      sessionStorage.setItem('pie_rate_store', JSON.stringify(u))
      return true
    }
    // Check stores table for dynamically added stores
    const { data: storeRow } = await supabase
      .from('stores')
      .select('id')
      .eq('id', emailOrStore)
      .eq('password', password)
      .eq('active', true)
      .maybeSingle()
    if (storeRow) {
      const u: User = { id: storeRow.id, name: 'Store #' + storeRow.id, email: emailOrStore, role: 'store', storeId: storeRow.id }
      setUser(u)
      sessionStorage.setItem('pie_rate_store', JSON.stringify(u))
      return true
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrStore, password })
    if (error) { console.error('Login error:', error.message); return false }
    if (data.user) {
      const profile = await fetchProfile(data.user.id)
      if (profile) { setUser(profile); return true }
    }
    return false
  }

  const logout = async () => {
    sessionStorage.removeItem('pie_rate_store')
    setUser(null)
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}