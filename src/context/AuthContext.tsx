import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'worker' | 'manager' | 'admin' | 'store'
  storeId?: string
}

interface AuthContextType {
  user: User | null
  login: (emailOrStore: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_USERS: (User & { password: string })[] = [
  { id: '1', name: 'John Manager', email: 'manager@papajohns.com', password: 'demo123', role: 'manager' },
  { id: '2', name: 'Sarah Worker', email: 'worker@papajohns.com', password: 'demo123', role: 'worker', storeId: '3407' },
  { id: '3', name: 'Admin User', email: 'admin@papajohns.com', password: 'demo123', role: 'admin' },
]

const STORE_PASSWORDS: Record<string, string> = {
  '957': 'waukegan1', '1183': 'grayslake1', '1963': 'mchenry1',
  '3175': 'dekalb1', '3309': 'elgin1', '3407': 'shorewood1',
  '3999': 'lincolnpark1', '4037': 'burbank1', '4106': 'southloop1',
  '4109': 'rivernorth1', '4870': 'ottawa1', '4929': 'yorkville1',
  '5070': 'aurora1', '5143': 'bolingbrook1',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = sessionStorage.getItem('pie_rate_user'); return s ? JSON.parse(s) : null } catch { return null }
  })

  const login = async (emailOrStore: string, password: string): Promise<boolean> => {
    const found = DEMO_USERS.find(u => u.email === emailOrStore && u.password === password)
    if (found) {
      const { password: _, ...u } = found
      setUser(u)
      sessionStorage.setItem('pie_rate_user', JSON.stringify(u))
      return true
    }
    if (STORE_PASSWORDS[emailOrStore] === password) {
      const u: User = { id: emailOrStore, name: 'Store #' + emailOrStore, email: emailOrStore, role: 'store', storeId: emailOrStore }
      setUser(u)
      sessionStorage.setItem('pie_rate_user', JSON.stringify(u))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('pie_rate_user')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}