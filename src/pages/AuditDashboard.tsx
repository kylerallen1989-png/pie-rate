import { useState } from 'react'
import { AlertTriangle, User } from 'lucide-react'

const AUDITS = [
  { id: '1', store: '3407', employee: 'Carlos M.', style: 'Original Crust', score: 9, crust: 2, cheeseCov: 2, cheeseLock: 2, toppings: 3, passed: true, manager: 'John Manager', time: '2 hr ago', checksFailed: [] },
  { id: '2', store: '5070', employee: 'James R.', style: 'Thin Crust', score: 4, crust: 0, cheeseCov: 2, cheeseLock: 0, toppings: 2, passed: false, manager: 'John Manager', time: '3 hr ago', checksFailed: ['Crust not fully cut', 'Cheese lock below 75%'] },
  { id: '3', store: '1183', employee: 'Maria S.', style: 'Pan Pizza', score: 8, crust: 2, cheeseCov: 2, cheeseLock: 2, toppings: 2, passed: true, manager: 'John Manager', time: '4 hr ago', checksFailed: [] },
  { id: '4', store: '4929', employee: 'Tyler B.', style: 'Original Crust', score: 6, crust: 2, cheeseCov: 0, cheeseLock: 2, toppings: 2, passed: false, manager: 'John Manager', time: '5 hr ago', checksFailed: ['Cheese coverage below 75%'] },
  { id: '5', store: '3407', employee: 'Ana L.', style: 'Stuffed Crust', score: 10, crust: 2, cheeseCov: 2, cheeseLock: 2, toppings: 4, passed: true, manager: 'John Manager', time: '6 hr ago', checksFailed: [] },
]

export default function AuditDashboard() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? AUDITS : filter === 'passed' ? AUDITS.filter(a => a.passed) : AUDITS.filter(a => !a.passed)
  const passCount = AUDITS.filter(a => a.passed).length
  const failCount = AUDITS.filter(a => !a.passed).length
  // passRate calculated but shown in future UI

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Results</h1>
        <p className="text-gray-500 text-xs mt-0.5">Manager pizza audits by employee</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-gray-900">{AUDITS.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Audits</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-green-600">{passCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Passed</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-red-600">{failCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Failed</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all','passed','failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={"px-4 py-2 rounded-xl text-sm font-medium transition border " +
              (filter === f ? "bg-[#CC0000] text-white border-[#CC0000]" : "bg-white text-gray-600 border-gray-200")}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(audit => (
          <div key={audit.id} className={"bg-white rounded-xl p-4 shadow-sm border-2 " +
            (audit.passed ? "border-green-100" : "border-red-100")}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="font-semibold text-gray-900 text-sm">{audit.employee}</span>
                  <span className="text-xs text-gray-400">#{audit.store}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{audit.style} · {audit.time}</div>
              </div>
              <div className="text-right">
                <div className={"text-2xl font-bold " + (audit.passed ? "text-green-600" : "text-red-600")}>
                  {audit.score}/10
                </div>
                <div className={"text-xs font-medium " + (audit.passed ? "text-green-500" : "text-red-500")}>
                  {audit.passed ? "PASS" : "FAIL"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Crust', score: audit.crust, max: 2 },
                { label: 'Cheese Cov.', score: audit.cheeseCov, max: 2 },
                { label: 'Cheese Lock', score: audit.cheeseLock, max: 2 },
                { label: 'Toppings', score: audit.toppings, max: 4 },
              ].map(cat => (
                <div key={cat.label} className={"rounded-lg p-2 text-center " +
                  (cat.score === cat.max ? "bg-green-50" : cat.score === 0 ? "bg-red-50" : "bg-yellow-50")}>
                  <div className={"text-sm font-bold " +
                    (cat.score === cat.max ? "text-green-600" : cat.score === 0 ? "text-red-600" : "text-yellow-600")}>
                    {cat.score}/{cat.max}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{cat.label}</div>
                </div>
              ))}
            </div>

            {audit.checksFailed.length > 0 && (
              <div className="mt-3 space-y-1">
                {audit.checksFailed.map((fail, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle size={11} />
                    {fail}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}