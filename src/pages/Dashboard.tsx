import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'

const STORES = [
  { id: '3407', todayScore: 8.4, wtdScore: 8.2, grades: 14, flagged: 0, trend: 'up' },
  { id: '4929', todayScore: 7.6, wtdScore: 7.8, grades: 11, flagged: 1, trend: 'down' },
  { id: '4870', todayScore: 8.9, wtdScore: 8.6, grades: 13, flagged: 0, trend: 'up' },
  { id: '5070', todayScore: 7.1, wtdScore: 7.4, grades: 9,  flagged: 2, trend: 'down' },
  { id: '5143', todayScore: 8.6, wtdScore: 8.5, grades: 12, flagged: 0, trend: 'up' },
  { id: '3999', todayScore: 7.9, wtdScore: 8.0, grades: 10, flagged: 1, trend: 'down' },
  { id: '4037', todayScore: 8.2, wtdScore: 8.1, grades: 11, flagged: 0, trend: 'up' },
  { id: '957',  todayScore: 9.1, wtdScore: 8.9, grades: 15, flagged: 0, trend: 'up' },
  { id: '1183', todayScore: 7.3, wtdScore: 7.5, grades: 8,  flagged: 2, trend: 'down' },
  { id: '1963', todayScore: 8.7, wtdScore: 8.4, grades: 13, flagged: 0, trend: 'up' },
  { id: '3175', todayScore: 8.0, wtdScore: 7.9, grades: 10, flagged: 1, trend: 'down' },
  { id: '3309', todayScore: 8.3, wtdScore: 8.2, grades: 12, flagged: 0, trend: 'up' },
  { id: '4106', todayScore: 7.5, wtdScore: 7.6, grades: 9,  flagged: 1, trend: 'down' },
  { id: '4109', todayScore: 8.8, wtdScore: 8.7, grades: 14, flagged: 0, trend: 'up' },
]

const HOURLY = [
  { hour: '6am', score: 8.1 },
  { hour: '7am', score: 8.3 },
  { hour: '8am', score: 7.9 },
  { hour: '9am', score: 8.0 },
  { hour: '10am', score: 8.4 },
  { hour: '11am', score: 8.2 },
  { hour: '12pm', score: 7.8 },
  { hour: '1pm', score: 7.6 },
  { hour: '2pm', score: 8.1 },
  { hour: '3pm', score: 8.5 },
]

const ALERTS = [
  { id: '1', store: '#5070', message: '3 consecutive pizzas scored below 6.0', severity: 'high', time: '14 min ago' },
  { id: '2', store: '#1183', message: 'Cheese coverage below standard for 2 hours', severity: 'high', time: '38 min ago' },
  { id: '3', store: '#4929', message: 'Crust score dropped 1.5 points vs yesterday', severity: 'medium', time: '1 hr ago' },
  { id: '4', store: '#3999', message: 'WTD score trending below 8.0 target', severity: 'medium', time: '2 hr ago' },
]

function ScoreBar({ score }: { score: number }) {
  const color = score >= 8.5 ? 'bg-green-500' : score >= 7.0 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-sm font-bold w-8 text-right">{score}</span>
    </div>
  )
}

export default function Dashboard() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const totalGrades = STORES.reduce((sum, s) => sum + s.grades, 0)
  const totalFlagged = STORES.reduce((sum, s) => sum + s.flagged, 0)
  const avgToday = (STORES.reduce((sum, s) => sum + s.todayScore, 0) / STORES.length).toFixed(1)
  const avgWtd = (STORES.reduce((sum, s) => sum + s.wtdScore, 0) / STORES.length).toFixed(1)
  const todayDelta = (parseFloat(avgToday) - parseFloat(avgWtd)).toFixed(1)

  const maxScore = Math.max(...HOURLY.map(h => h.score))
  const minScore = Math.min(...HOURLY.map(h => h.score))

  const sorted = [...STORES].sort((a, b) => b.todayScore - a.todayScore)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            <span className="font-mono">{time.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 shadow-sm flex items-center gap-2">
          Live · Updates every 30s
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Today's Avg Score</div>
          <div className="text-3xl font-bold text-gray-900">{avgToday}</div>
          <div className={`flex items-center gap-1 text-sm mt-1 ${parseFloat(todayDelta) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {parseFloat(todayDelta) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {parseFloat(todayDelta) >= 0 ? '+' : ''}{todayDelta} vs WTD
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">WTD Avg Score</div>
          <div className="text-3xl font-bold text-gray-900">{avgWtd}</div>
          <div className="text-sm text-gray-400 mt-1">Week to date</div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Grades Today</div>
          <div className="text-3xl font-bold text-gray-900">{totalGrades}</div>
          <div className="flex items-center gap-1 text-sm mt-1 text-gray-500">
            <CheckCircle size={14} className="text-green-500" />
            {STORES.length} stores reporting
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Flagged Today</div>
          <div className="text-3xl font-bold text-red-600">{totalFlagged}</div>
          <div className="flex items-center gap-1 text-sm mt-1 text-red-500">
            <AlertTriangle size={14} />
            Need attention
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Today's Score by Hour — All Stores</h2>
          <div className="flex items-end gap-2 h-36">
            {HOURLY.map((h) => {
              const height = ((h.score - minScore + 0.5) / (maxScore - minScore + 1)) * 100
              const color = h.score >= 8.5 ? 'bg-green-500' : h.score >= 7.0 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-gray-700">{h.score}</div>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div className={`w-full ${color} rounded-t-md`} style={{ height: `${height}%` }} />
                  </div>
                  <div className="text-xs text-gray-400">{h.hour}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Active Alerts
          </h2>
          <div className="space-y-3">
            {ALERTS.map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.severity === 'high'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="font-semibold text-sm text-gray-900">{alert.store}</div>
                <div className="text-xs text-gray-600 mt-0.5">{alert.message}</div>
                <div className="text-xs text-gray-400 mt-1">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store Breakdown */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Store Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3 font-medium">Store</th>
                <th className="pb-3 font-medium">Today's Score</th>
                <th className="pb-3 font-medium">WTD Score</th>
                <th className="pb-3 font-medium">Grades</th>
                <th className="pb-3 font-medium">Flagged</th>
                <th className="pb-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(store => (
                <tr key={store.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 font-bold text-gray-900">#{store.id}</td>
                  <td className="py-3 w-44"><ScoreBar score={store.todayScore} /></td>
                  <td className="py-3 w-44"><ScoreBar score={store.wtdScore} /></td>
                  <td className="py-3 text-gray-600">{store.grades}</td>
                  <td className="py-3">
                    {store.flagged > 0
                      ? <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">{store.flagged}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="py-3">
                    {store.trend === 'up'
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><TrendingUp size={14} /> Up</span>
                      : <span className="flex items-center gap-1 text-red-500 text-xs"><TrendingDown size={14} /> Down</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}