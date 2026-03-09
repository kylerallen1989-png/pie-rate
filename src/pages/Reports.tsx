import { useState } from 'react'
import { Download } from 'lucide-react'

const STORE_WEEKLY = [
  { id: '957',  mon:95,tue:93,wed:94,thu:96,fri:95,sat:92,sun:93,wtd:94.0 },
  { id: '1183', mon:72,tue:74,wed:70,thu:73,fri:71,sat:69,sun:72,wtd:71.6 },
  { id: '1963', mon:88,tue:90,wed:89,thu:91,fri:89,sat:87,sun:88,wtd:88.9 },
  { id: '3175', mon:83,tue:82,wed:84,thu:83,fri:85,sat:81,sun:82,wtd:82.9 },
  { id: '3309', mon:87,tue:89,wed:88,thu:90,fri:88,sat:86,sun:87,wtd:87.9 },
  { id: '3407', mon:84,tue:86,wed:85,thu:87,fri:86,sat:83,sun:84,wtd:85.0 },
  { id: '3999', mon:77,tue:76,wed:78,thu:75,fri:77,sat:74,sun:76,wtd:76.1 },
  { id: '4037', mon:82,tue:84,wed:83,thu:85,fri:84,sat:81,sun:82,wtd:83.0 },
  { id: '4106', mon:75,tue:73,wed:74,thu:76,fri:74,sat:72,sun:73,wtd:73.9 },
  { id: '4109', mon:91,tue:92,wed:90,thu:93,fri:92,sat:89,sun:91,wtd:91.1 },
  { id: '4870', mon:93,tue:94,wed:92,thu:95,fri:94,sat:91,sun:93,wtd:93.1 },
  { id: '4929', mon:78,tue:77,wed:79,thu:76,fri:78,sat:75,sun:77,wtd:77.1 },
  { id: '5070', mon:67,tue:69,wed:66,thu:70,fri:68,sat:65,sun:67,wtd:67.4 },
  { id: '5143', mon:89,tue:91,wed:90,thu:92,fri:91,sat:88,sun:89,wtd:90.0 },
]

const FAILURE_REASONS = [
  { reason: 'Crust color out of range', count: 47, pct: 31 },
  { reason: 'Cheese coverage below 75%', count: 38, pct: 25 },
  { reason: 'Toppings per slice insufficient', count: 29, pct: 19 },
  { reason: 'Cheese lock below 75%', count: 22, pct: 14 },
  { reason: 'Slices not fully cut', count: 17, pct: 11 },
]

const WEEKLY_TREND = [
  { week: 'W1', rate: 81 },{ week: 'W2', rate: 83 },{ week: 'W3', rate: 80 },
  { week: 'W4', rate: 84 },{ week: 'W5', rate: 82 },{ week: 'W6', rate: 85 },
  { week: 'W7', rate: 83 },{ week: 'W8', rate: 86 },
]

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function Cell({ score }: { score: number }) {
  const bg = score >= 80 ? 'bg-green-100 text-green-700' : score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={'inline-block px-1.5 py-0.5 rounded text-xs font-bold ' + bg}>{score}%</span>
}

export default function Reports() {
  const [period, setPeriod] = useState('wtd')
  // store filter coming soon
  const sorted = [...STORE_WEEKLY].sort((a, b) => b.wtd - a.wtd)
  const avgWtd = Math.round(STORE_WEEKLY.reduce((s, x) => s + x.wtd, 0) / STORE_WEEKLY.length)
  const passing = STORE_WEEKLY.filter(s => s.wtd >= 80).length
  const failing = STORE_WEEKLY.filter(s => s.wtd < 70).length
  const maxT = Math.max(...WEEKLY_TREND.map(w => w.rate))
  const minT = Math.min(...WEEKLY_TREND.map(w => w.rate))
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-xs mt-0.5">Week of Mar 3 - Mar 9, 2026</p>
        </div>
        <button className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium shadow-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className={'text-2xl font-bold ' + (avgWtd >= 80 ? 'text-green-600' : 'text-yellow-600')}>{avgWtd}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Avg WTD</div>
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
      <div className="flex gap-2">
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
          {['wtd','mtd','30d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={'px-3 py-2 text-xs font-medium transition ' + (period === p ? 'bg-[#CC0000] text-white' : 'text-gray-600')}>{p.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">8-Week Pass Rate Trend</h2>
        <div className="flex items-end gap-2 h-24">
          {WEEKLY_TREND.map((w) => {
            const h = ((w.rate - minT + 2) / (maxT - minT + 4)) * 100
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
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Top Failure Reasons This Week</h2>
        <div className="space-y-3">
          {FAILURE_REASONS.map(f => (
            <div key={f.reason}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-700">{f.reason}</span>
                <span className="font-bold text-gray-900">{f.count} fails ({f.pct}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: f.pct + '%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Store Pass Rates by Day</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              <th className="pb-2 text-left font-medium text-gray-500">Store</th>
              {DAY_LABELS.map(d => <th key={d} className="pb-2 text-center font-medium text-gray-500">{d}</th>)}
              <th className="pb-2 text-center font-medium text-gray-500">WTD</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-2 font-bold text-gray-900">#{s.id}</td>
                  {DAYS.map(d => <td key={d} className="py-2 text-center"><Cell score={s[d as keyof typeof s] as number} /></td>)}
                  <td className="py-2 text-center"><Cell score={Math.round(s.wtd)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}