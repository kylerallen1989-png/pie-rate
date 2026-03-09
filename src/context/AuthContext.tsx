import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'worker' | 'manager' | 'admin'
  locationId?: string
  locationName?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Demo users for testing
const DEMO_USERS: (User & { password: string })[] = [
  {
    id: '1',
    name: 'John Manager',
    email: 'manager@papajohns.com',
    password: 'demo123',
    role: 'manager',
  },
  {
    id: '2',
    name: 'Sarah Worker',
    email: 'worker@papajohns.com',
    password: 'demo123',
    role: 'worker',
    locationId: 'loc1',
    locationName: 'Papa Johns - Chicago Loop',
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@papajohns.com',
    password: 'demo123',
    role: 'admin',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('pie_rate_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (email: string, password: string): Promise<boolean> => {
    const found = DEMO_USERS.find(
      u => u.email === email && u.password === password
    )
    if (found) {
      const { password: _, ...userWithoutPassword } = found
      setUser(userWithoutPassword)
      sessionStorage.setItem('pie_rate_user', JSON.stringify(userWithoutPassword))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('pie_rate_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}