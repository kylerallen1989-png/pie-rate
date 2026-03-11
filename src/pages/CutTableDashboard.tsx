import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STORE_IDS = ['957','1183','1963','3175','3309','3407','3999','4037','4106','4109','4870','4929','5070','5143']

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={color + " h-2 rounded-full"} style={{ width: rate + "%" }} />
      </div>
      <span className={"text-sm font-bold w-10 text-right " + (rate >= 80 ? "text-green-600" : rate >= 70 ? "text-yellow-600" : "text-red-600")}>
        {rate}%
      </span>
    </div>
  )
}

interface StoreStats {
  id: string
  todayGrades: number
  todayPassed: number
  passRate: number
  wtdGrades: number
  wtdPassed: number
  wtdRate: number
  failed: number
}

export default function CutTableDashboard() {
  const [time, setTime] = useState(new Date())
  const [stores, setStores] = useState<StoreStats[]>([])
  const [hourly, setHourly] = useState<{hour: string, passRate: number}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

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
      .gte('graded_at', weekStart.toISOString())

    if (!grades) { setLoading(false); return }

    const storeStats: StoreStats[] = STORE_IDS.map(id => {
      const todayGrades = grades.filter(g => g.store_id === id && new Date(g.graded_at) >= todayStart)
      const wtdGrades = grades.filter(g => g.store_id === id)
      const todayPassed = todayGrades.filter(g => g.passed).length
      const wtdPassed = wtdGrades.filter(g => g.passed).length
      return {
        id,
        todayGrades: todayGrades.length,
        todayPassed,
        passRate: todayGrades.length ? Math.round((todayPassed / todayGrades.length) * 100) : 0,
        wtdGrades: wtdGrades.length,
        wtdPassed,
        wtdRate: wtdGrades.length ? Math.round((wtdPassed / wtdGrades.length) * 100) : 0,
        failed: todayGrades.filter(g => !g.passed).length,
      }
    })

    const hourlyMap: Record<number, {total: number, passed: number}> = {}
    grades.filter(g => new Date(g.graded_at) >= todayStart).forEach(g => {
      const h = new Date(g.graded_at).getHours()
      if (!hourlyMap[h]) hourlyMap[h] = { total: 0, passed: 0 }
      hourlyMap[h].total++
      if (g.passed) hourlyMap[h].passed++
    })
    const hourlyData = Object.entries(hourlyMap).map(([h, v]) => ({
      hour: parseInt(h) >= 12 ? (parseInt(h) === 12 ? '12pm' : (parseInt(h) - 12) + 'pm') : (parseInt(h) + 'am'),
      passRate: Math.round((v.passed / v.total) * 100)
    })).sort((a, b) => {
      const toNum = (s: string) => parseInt(s) + (s.includes('pm') && !s.startsWith('12') ? 12 : 0)
      return toNum(a.hour) - toNum(b.hour)
    })

    setStores(storeStats)
    setHourly(hourlyData)
    setLoading(false)
  }

  const activeStores = stores.filter(s => s.todayGrades > 0)
  const totalGrades = stores.reduce((s, x) => s + x.todayGrades, 0)
  const totalFailed = stores.reduce((s, x) => s + x.failed, 0)
  const overallPassRate = totalGrades ? Math.round(((totalGrades - totalFailed) / totalGrades) * 100) : 0
  const avgWtd = stores.filter(s => s.wtdGrades > 0).length
    ? Math.round(stores.filter(s => s.wtdGrades > 0).reduce((s, x) => s + x.wtdRate, 0) / stores.filter(s => s.wtdGrades > 0).length)
    : 0
  const belowThreshold = activeStores.filter(s => s.passRate < 70).length
  const sorted = [...stores].filter(s => s.todayGrades > 0).sort((a, b) => b.passRate - a.passRate)
  const alerts = activeStores.filter(s => s.passRate < 70)
  const bestHour = hourly.length ? hourly.reduce((a, b) => a.passRate > b.passRate ? a : b) : null
  const worstHour = hourly.length ? hourly.reduce((a, b) => a.passRate < b.passRate ? a : b) : null
  const maxRate = hourly.length ? Math.max(...hourly.map(h => h.passRate)) : 100
  const minRate = hourly.length ? Math.min(...hourly.map(h => h.passRate)) : 0

  if (loading) return <div className="p-8 text-center text-gray-400">Loading dashboard...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cut Table</h1>
          <p className="text-gray-500 text-xs mt-0.5 font-mono">{time.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 shadow-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Today Pass Rate</div>
          <div className={"text-3xl font-bold " + (overallPassRate >= 80 ? "text-green-600" : overallPassRate >= 70 ? "text-yellow-600" : "text-red-600")}>
            {totalGrades ? overallPassRate + '%' : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{totalGrades} pizzas graded</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">WTD Pass Rate</div>
          <div className={"text-3xl font-bold " + (avgWtd >= 80 ? "text-green-600" : avgWtd >= 70 ? "text-yellow-600" : "text-red-600")}>
            {avgWtd ? avgWtd + '%' : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Week to date</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Failed Today</div>
          <div className="text-3xl font-bold text-red-600">{totalFailed}</div>
          <div className="text-xs text-gray-400 mt-1">across all stores</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Below Threshold</div>
          <div className={"text-3xl font-bold " + (belowThreshold > 0 ? "text-red-600" : "text-green-600")}>
            {belowThreshold}
          </div>
          <div className="text-xs text-gray-400 mt-1">stores under 70%</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className="text-red-500" />
            Active Alerts
          </h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="p-3 rounded-lg border-l-4 bg-red-50 border-red-500">
                <div className="font-semibold text-sm text-gray-900">#{a.id}</div>
                <div className="text-xs text-gray-600 mt-0.5">Pass rate dropped to {a.passRate}% — below 70% threshold</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hourly.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1 text-sm">Pass Rate by Hour</h2>
          {bestHour && worstHour && (
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <span className="text-green-600 font-medium">Best: {bestHour.hour} ({bestHour.passRate}%)</span>
              <span className="text-red-500 font-medium">Worst: {worstHour.hour} ({worstHour.passRate}%)</span>
            </div>
          )}
          <div className="flex items-end gap-1.5 h-28">
            {hourly.map((h) => {
              const height = maxRate === minRate ? 80 : ((h.passRate - minRate + 2) / (maxRate - minRate + 4)) * 100
              const color = h.passRate >= 80 ? "bg-green-500" : h.passRate >= 70 ? "bg-yellow-500" : "bg-red-500"
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-gray-700">{h.passRate}%</div>
                  <div className="w-full flex items-end" style={{ height: "70px" }}>
                    <div className={"w-full " + color + " rounded-t-md"} style={{ height: height + "%" }} />
                  </div>
                  <div className="text-xs text-gray-400">{h.hour}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Store Pass Rates</h2>
        {sorted.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">No grades recorded today yet</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((store, i) => (
              <div key={store.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <span className="font-bold text-gray-900 text-sm">#{store.id}</span>
                    {store.passRate < 70 && <AlertTriangle size={12} className="text-red-500" />}
                  </div>
                  <span className="text-xs text-gray-500">WTD {store.wtdRate}%</span>
                </div>
                <PassRateBar rate={store.passRate} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}