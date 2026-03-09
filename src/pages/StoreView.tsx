import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

const STORE_DATA: Record<string, { todayRate: number, wtdRate: number, lastScore: number, lastPassed: boolean, todayGrades: number }> = {
  '957':  { todayRate: 94, wtdRate: 92, lastScore: 91, lastPassed: true,  todayGrades: 50 },
  '1183': { todayRate: 71, wtdRate: 74, lastScore: 68, lastPassed: false, todayGrades: 38 },
  '1963': { todayRate: 89, wtdRate: 88, lastScore: 85, lastPassed: true,  todayGrades: 45 },
  '3175': { todayRate: 82, wtdRate: 81, lastScore: 88, lastPassed: true,  todayGrades: 41 },
  '3309': { todayRate: 88, wtdRate: 86, lastScore: 90, lastPassed: true,  todayGrades: 43 },
  '3407': { todayRate: 85, wtdRate: 84, lastScore: 82, lastPassed: true,  todayGrades: 44 },
  '3999': { todayRate: 76, wtdRate: 78, lastScore: 74, lastPassed: false, todayGrades: 37 },
  '4037': { todayRate: 83, wtdRate: 82, lastScore: 86, lastPassed: true,  todayGrades: 42 },
  '4106': { todayRate: 74, wtdRate: 75, lastScore: 71, lastPassed: false, todayGrades: 35 },
  '4109': { todayRate: 91, wtdRate: 90, lastScore: 93, lastPassed: true,  todayGrades: 48 },
  '4870': { todayRate: 93, wtdRate: 91, lastScore: 95, lastPassed: true,  todayGrades: 49 },
  '4929': { todayRate: 77, wtdRate: 79, lastScore: 75, lastPassed: false, todayGrades: 36 },
  '5070': { todayRate: 68, wtdRate: 71, lastScore: 65, lastPassed: false, todayGrades: 32 },
  '5143': { todayRate: 90, wtdRate: 89, lastScore: 88, lastPassed: true,  todayGrades: 47 },
}

export default function StoreView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const storeId = user?.storeId || ''
  const data = STORE_DATA[storeId]

  const handleLogout = () => { logout(); navigate('/login') }

  if (!data) return <div className="p-8 text-center text-gray-500">Store data not found</div>

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
      </div>
    </div>
  )
}