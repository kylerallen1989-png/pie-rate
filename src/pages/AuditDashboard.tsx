import { useState, useEffect } from 'react'
import { AlertTriangle, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Audit {
  id: string
  store_id: string
  score: number
  passed: boolean
  graded_at: string
  mode: string
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago'
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago'
  return Math.floor(diff / 86400) + ' days ago'
}

export default function AuditDashboard() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchAudits()
  }, [])

  const fetchAudits = async () => {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('mode', 'audit')
      .order('graded_at', { ascending: false })
      .limit(50)
    if (!error && data) setAudits(data)
    setLoading(false)
  }

  const filtered = filter === 'all' ? audits : filter === 'passed' ? audits.filter(a => a.passed) : audits.filter(a => !a.passed)
  const passCount = audits.filter(a => a.passed).length
  const failCount = audits.filter(a => !a.passed).length

  if (loading) return <div className="p-8 text-center text-gray-400">Loading audits...</div>

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Results</h1>
        <p className="text-gray-500 text-xs mt-0.5">Manager pizza audits</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="text-2xl font-bold text-gray-900">{audits.length}</div>
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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
          No audits found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(audit => (
            <div key={audit.id} className={"bg-white rounded-xl p-4 shadow-sm border-2 " +
              (audit.passed ? "border-green-100" : "border-red-100")}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span className="font-semibold text-gray-900 text-sm">Store #{audit.store_id}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{timeAgo(audit.graded_at)}</div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}