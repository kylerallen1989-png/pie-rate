import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

const STORES = [
  { id: '957',  passRate: 94, wtdRate: 92, todayGrades: 50, failed: 3,  trend: 'up' },
  { id: '1183', passRate: 71, wtdRate: 74, todayGrades: 38, failed: 11, trend: 'down' },
  { id: '1963', passRate: 89, wtdRate: 88, todayGrades: 45, failed: 5,  trend: 'up' },
  { id: '3175', passRate: 82, wtdRate: 81, todayGrades: 41, failed: 7,  trend: 'up' },
  { id: '3309', passRate: 88, wtdRate: 86, todayGrades: 43, failed: 5,  trend: 'up' },
  { id: '3407', passRate: 85, wtdRate: 84, todayGrades: 44, failed: 7,  trend: 'up' },
  { id: '3999', passRate: 76, wtdRate: 78, todayGrades: 37, failed: 9,  trend: 'down' },
  { id: '4037', passRate: 83, wtdRate: 82, todayGrades: 42, failed: 7,  trend: 'up' },
  { id: '4106', passRate: 74, wtdRate: 75, todayGrades: 35, failed: 9,  trend: 'down' },
  { id: '4109', passRate: 91, wtdRate: 90, todayGrades: 48, failed: 4,  trend: 'up' },
  { id: '4870', passRate: 93, wtdRate: 91, todayGrades: 49, failed: 3,  trend: 'up' },
  { id: '4929', passRate: 77, wtdRate: 79, todayGrades: 36, failed: 8,  trend: 'down' },
  { id: '5070', passRate: 68, wtdRate: 71, todayGrades: 32, failed: 10, trend: 'down' },
  { id: '5143', passRate: 90, wtdRate: 89, todayGrades: 47, failed: 5,  trend: 'up' },
]

const HOURLY = [
  { hour: '6am',  passRate: 91 },
  { hour: '7am',  passRate: 88 },
  { hour: '8am',  passRate: 85 },
  { hour: '9am',  passRate: 89 },
  { hour: '10am', passRate: 92 },
  { hour: '11am', passRate: 87 },
  { hour: '12pm', passRate: 79 },
  { hour: '1pm',  passRate: 76 },
  { hour: '2pm',  passRate: 83 },
  { hour: '3pm',  passRate: 88 },
]

const ALERTS = [
  { id: '1', store: '5070', message: 'Pass rate dropped to 68% below 70% threshold', severity: 'high', time: '14 min ago' },
  { id: '2', store: '1183', message: 'Pass rate at 71% approaching threshold', severity: 'medium', time: '1 hr ago' },
  { id: '3', store: '4106', message: 'Pass rate at 74% with 3 consecutive crust failures', severity: 'medium', time: '2 hr ago' },
]

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

export default function CutTableDashboard() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const totalGrades = STORES.reduce((s, x) => s + x.todayGrades, 0)
  const totalFailed = STORES.reduce((s, x) => s + x.failed, 0)
  const overallPassRate = Math.round(((totalGrades - totalFailed) / totalGrades) * 100)
  const avgWtd = Math.round(STORES.reduce((s, x) => s + x.wtdRate, 0) / STORES.length)
  const belowThreshold = STORES.filter(s => s.passRate < 70).length
  const sorted = [...STORES].sort((a, b) => b.passRate - a.passRate)
  const bestHour = HOURLY.reduce((a, b) => a.passRate > b.passRate ? a : b)
  const worstHour = HOURLY.reduce((a, b) => a.passRate < b.passRate ? a : b)
  const maxRate = Math.max(...HOURLY.map(h => h.passRate))
  const minRate = Math.min(...HOURLY.map(h => h.passRate))

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
            {overallPassRate}%
          </div>
          <div className="text-xs text-gray-400 mt-1">{totalGrades} pizzas graded</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">WTD Pass Rate</div>
          <div className={"text-3xl font-bold " + (avgWtd >= 80 ? "text-green-600" : avgWtd >= 70 ? "text-yellow-600" : "text-red-600")}>
            {avgWtd}%
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

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <AlertTriangle size={15} className="text-red-500" />
          Active Alerts
        </h2>
        <div className="space-y-2">
          {ALERTS.map(alert => (
            <div key={alert.id} className={"p-3 rounded-lg border-l-4 " + (alert.severity === "high" ? "bg-red-50 border-red-500" : "bg-yellow-50 border-yellow-500")}>
              <div className="font-semibold text-sm text-gray-900">#{alert.store}</div>
              <div className="text-xs text-gray-600 mt-0.5">{alert.message}</div>
              <div className="text-xs text-gray-400 mt-1">{alert.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-1 text-sm">Pass Rate by Hour</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="text-green-600 font-medium">Best: {bestHour.hour} ({bestHour.passRate}%)</span>
          <span className="text-red-500 font-medium">Worst: {worstHour.hour} ({worstHour.passRate}%)</span>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {HOURLY.map((h) => {
            const height = ((h.passRate - minRate + 2) / (maxRate - minRate + 4)) * 100
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

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Store Pass Rates</h2>
        <div className="space-y-3">
          {sorted.map((store, i) => (
            <div key={store.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="font-bold text-gray-900 text-sm">#{store.id}</span>
                  {store.passRate < 70 && <AlertTriangle size={12} className="text-red-500" />}
                </div>
                <span className={"text-xs flex items-center gap-0.5 " + (store.trend === "up" ? "text-green-600" : "text-red-500")}>
                  WTD {store.wtdRate}%
                </span>
              </div>
              <PassRateBar rate={store.passRate} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}