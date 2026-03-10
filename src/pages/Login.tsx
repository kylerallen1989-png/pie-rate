import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'manager' | 'store'>('manager')
  const switchMode = (m: 'manager' | 'store') => { setMode(m); setEmail(''); setStoreId(''); setPassword(''); setError('') }
  const [email, setEmail] = useState('')
  const [storeId, setStoreId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const identifier = mode === 'store' ? storeId : email
    const success = await login(identifier, password)
    if (success) {
      const user = JSON.parse(sessionStorage.getItem('pie_rate_user') || '{}')
      navigate(user.role === 'store' ? '/store' : '/')
    } else {
      setError('Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#CC0000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🍕</div>
          <h1 className="text-3xl font-bold text-gray-900">Pie-Rate</h1>
          <p className="text-gray-500 mt-1 text-sm">Pizza Quality Platform</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button onClick={() => switchMode('manager')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition ' + (mode === 'manager' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}>
            Manager Login
          </button>
          <button onClick={() => switchMode('store')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition ' + (mode === 'store' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}>
            Store Login
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'manager' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
                placeholder="you@email.com" required />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Number</label>
              <input type="text" value={storeId} onChange={e => setStoreId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
                placeholder="e.g. 3407" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]"
              placeholder="••••••••" required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#CC0000] hover:bg-[#aa0000] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
          <div className="font-semibold mb-2 text-gray-600">Demo Accounts:</div>
          <div>👔 Manager: manager@papajohns.com / demo123</div>
          <div>⚙️ Admin: admin@papajohns.com / demo123</div>
          <div>🏪 Store: enter store # + town password (e.g. 3407 / shorewood1)</div>
        </div>
      </div>
    </div>
  )
}