import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STORE_IDS = ['957','1183','1963','3175','3309','3407','3999','4037','4106','4109','4870','4929','5070','5143']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function Cell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-xs">—</span>
  const bg = score >= 80 ? 'bg-green-100 text-green-700' : score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={'inline-block px-1.5 py-0.5 rounded text-xs font-bold ' + bg}>{score}%</span>
}

interface StoreRow {
  id: string
  days: (number | null)[]
  wtd: number | null
}

export default function Reports() {
  const [period, setPeriod] = useState('wtd')
  const [loading, setLoading] = useState(true)
  const [storeRows, setStoreRows] = useState<StoreRow[]>([])
  const [totalGrades, setTotalGrades] = useState(0)
  const [totalFailed, setTotalFailed] = useState(0)
  const [weekTrend, setWeekTrend] = useState<{week: string, rate: number}[]>([])

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    let startDate = new Date(weekStart)
    if (period === 'mtd') { startDate = new Date(now.getFullYear(), now.getMonth(), 1) }
    if (period === '30d') { startDate = new Date(now); startDate.setDate(now.getDate() - 30) }

    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .gte('graded_at', startDate.toISOString())

    if (!grades) { setLoading(false); return }

    setTotalGrades(grades.length)
    setTotalFailed(grades.filter(g => !g.passed).length)

    const rows: StoreRow[] = STORE_IDS.map(id => {
      const storeGrades = grades.filter(g => g.store_id === id)
      const days = [0,1,2,3,4,5,6].map(dayIndex => {
        const dayGrades = storeGrades.filter(g => new Date(g.graded_at).getDay() === (dayIndex + 1) % 7)
        if (!dayGrades.length) return null
        return Math.round((dayGrades.filter(g => g.passed).length / dayGrades.length) * 100)
      })
      const wtd = storeGrades.length ? Math.round((storeGrades.filter(g => g.passed).length / storeGrades.length) * 100) : null
      return { id, days, wtd }
    })

    setStoreRows(rows.sort((a, b) => (b.wtd || 0) - (a.wtd || 0)))

    // Build 8-week trend
    const trend = []
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(now)
      wStart.setDate(now.getDate() - now.getDay() - i * 7)
      wStart.setHours(0, 0, 0, 0)
      const wEnd = new Date(wStart)
      wEnd.setDate(wStart.getDate() + 7)
      const wGrades = grades.filter(g => {
        const d = new Date(g.graded_at)
        return d >= wStart && d < wEnd
      })
      if (wGrades.length) {
        trend.push({
          week: 'W' + (8 - i),
          rate: Math.round((wGrades.filter(g => g.passed).length / wGrades.length) * 100)
        })
      }
    }
    setWeekTrend(trend)
    setLoading(false)
  }

  const avgWtd = storeRows.filter(s => s.wtd !== null).length
    ? Math.round(storeRows.filter(s => s.wtd !== null).reduce((a, s) => a + (s.wtd || 0), 0) / storeRows.filter(s => s.wtd !== null).length)
    : 0
  const passing = storeRows.filter(s => s.wtd !== null && s.wtd >= 80).length
  const failing = storeRows.filter(s => s.wtd !== null && s.wtd < 70).length
  const maxT = weekTrend.length ? Math.max(...weekTrend.map(w => w.rate)) : 100
  const minT = weekTrend.length ? Math.min(...weekTrend.map(w => w.rate)) : 0
  const overallPassRate = totalGrades ? Math.round(((totalGrades - totalFailed) / totalGrades) * 100) : 0

  if (loading) return <div className="p-8 text-center text-gray-400">Loading reports...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-xs mt-0.5">{totalGrades} total grades · {overallPassRate}% pass rate</p>
        </div>
        <button className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium shadow-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className={'text-2xl font-bold ' + (avgWtd >= 80 ? 'text-green-600' : 'text-yellow-600')}>{avgWtd}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Avg Pass Rate</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-green-600">{passing}</div>
          <div className="text-xs text-gray-500 mt-0.5">Above 80%</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-red-600">{failing}</div>
          <div className="text-xs text-gray-500 mt-0.5">Below 70%</div>
        </div>
      </div>

      <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden w-fit">
        {['wtd','mtd','30d'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={'px-3 py-2 text-xs font-medium transition ' + (period === p ? 'bg-[#CC0000] text-white' : 'text-gray-600')}>{p.toUpperCase()}</button>
        ))}
      </div>

      {weekTrend.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Pass Rate Trend</h2>
          <div className="flex items-end gap-2 h-24">
            {weekTrend.map((w) => {
              const h = maxT === minT ? 80 : ((w.rate - minT + 2) / (maxT - minT + 4)) * 100
              const c = w.rate >= 80 ? 'bg-green-500' : 'bg-yellow-500'
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-gray-700">{w.rate}%</div>
                  <div className="w-full flex items-end" style={{ height: '60px' }}>
                    <div className={'w-full ' + c + ' rounded-t-md'} style={{ height: h + '%' }} />
                  </div>
                  <div className="text-xs text-gray-400">{w.week}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Store Pass Rates by Day</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left font-medium text-gray-500">Store</th>
                {DAY_LABELS.map(d => <th key={d} className="pb-2 text-center font-medium text-gray-500">{d}</th>)}
                <th className="pb-2 text-center font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {storeRows.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-2 font-bold text-gray-900">#{s.id}</td>
                  {s.days.map((d, i) => <td key={i} className="py-2 text-center"><Cell score={d} /></td>)}
                  <td className="py-2 text-center"><Cell score={s.wtd} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}