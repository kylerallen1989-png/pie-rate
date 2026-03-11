import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StoreStats {
  todayRate: number
  wtdRate: number
  lastScore: number
  lastPassed: boolean
  todayGrades: number
}

export default function StoreView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [data, setData] = useState<StoreStats | null>(null)
  const [loading, setLoading] = useState(true)
  const storeId = user?.storeId || ''

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [storeId])

  const fetchData = async () => {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('store_id', storeId)
      .gte('graded_at', weekStart.toISOString())
      .order('graded_at', { ascending: false })

    if (!grades) { setLoading(false); return }

    const todayGrades = grades.filter(g => new Date(g.graded_at) >= todayStart)
    const todayPassed = todayGrades.filter(g => g.passed).length
    const wtdPassed = grades.filter(g => g.passed).length
    const last = grades[0]

    setData({
      todayGrades: todayGrades.length,
      todayRate: todayGrades.length ? Math.round((todayPassed / todayGrades.length) * 100) : 0,
      wtdRate: grades.length ? Math.round((wtdPassed / grades.length) * 100) : 0,
      lastScore: last ? last.score : 0,
      lastPassed: last ? last.passed : false,
    })
    setLoading(false)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍕</span>
          <div>
            <div className="text-white font-bold">Pie-Rate</div>
            <div className="text-gray-400 text-xs">Store #{storeId} — Cut Table</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-gray-400 text-xs font-mono">{time.toLocaleTimeString()}</div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white transition">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {data && data.todayGrades > 0 ? (
          <>
            <div className={'w-56 h-56 rounded-full flex flex-col items-center justify-center border-8 ' + (data.lastPassed ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')}>
              <div className={'text-7xl font-bold ' + (data.lastPassed ? 'text-green-400' : 'text-red-400')}>{data.lastScore}</div>
              <div className={'text-xl font-bold mt-1 ' + (data.lastPassed ? 'text-green-400' : 'text-red-400')}>{data.lastPassed ? '✓ PASS' : '✗ FAIL'}</div>
              <div className="text-gray-500 text-xs mt-1">Last Pizza</div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Today</div>
                <div className={'text-4xl font-bold ' + (data.todayRate >= 80 ? 'text-green-400' : data.todayRate >= 70 ? 'text-yellow-400' : 'text-red-400')}>{data.todayRate}%</div>
                <div className="text-gray-500 text-xs mt-1">{data.todayGrades} graded</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">WTD</div>
                <div className={'text-4xl font-bold ' + (data.wtdRate >= 80 ? 'text-green-400' : data.wtdRate >= 70 ? 'text-yellow-400' : 'text-red-400')}>{data.wtdRate}%</div>
                <div className="text-gray-500 text-xs mt-1">This week</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-56 h-56 rounded-full border-8 border-gray-700 flex flex-col items-center justify-center mx-auto mb-8">
              <div className="text-6xl mb-2">🍕</div>
              <div className="text-gray-500 text-sm">Waiting for first grade</div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Today</div>
                <div className="text-4xl font-bold text-gray-600">—</div>
                <div className="text-gray-500 text-xs mt-1">No grades yet</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">WTD</div>
                <div className="text-4xl font-bold text-gray-600">—</div>
                <div className="text-gray-500 text-xs mt-1">This week</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}