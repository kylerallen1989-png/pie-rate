import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import OpenAI from 'openai'
import { Download, Sparkles, FileText, ChevronRight, Clock } from 'lucide-react'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const ALL_STORES = ['957','1183','1963','3175','3309','3407','3999','4037','4106','4109','4870','4929','5070','5143']
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const DAY_PARTS = [
  { key: 'breakfast', label: 'Breakfast',  start: 6,  end: 11 },
  { key: 'lunch',     label: 'Lunch',      start: 11, end: 14 },
  { key: 'afternoon', label: 'Afternoon',  start: 14, end: 17 },
  { key: 'dinner',    label: 'Dinner',     start: 17, end: 21 },
  { key: 'late',      label: 'Late Night', start: 21, end: 24 },
]

const TEMPLATES = [
  {
    id: 'weekly',   title: 'Weekly Store Summary',  desc: 'WTD pass rates across all stores',
    config: { metric: 'pass_rate' as Metric, period: 'wtd' as Period, days: [], dayPart: 'all' as DayPart, groupBy: 'store' as GroupBy },
  },
  {
    id: 'daypart',  title: 'Day Part Performance',  desc: 'Pass rate by time of day (last 30 days)',
    config: { metric: 'pass_rate' as Metric, period: '30d' as Period, days: [], dayPart: 'all' as DayPart, groupBy: 'daypart' as GroupBy },
  },
  {
    id: 'worst',    title: 'Worst Time Slots',      desc: 'Avg score by day part (last 30 days)',
    config: { metric: 'avg_score' as Metric, period: '30d' as Period, days: [], dayPart: 'all' as DayPart, groupBy: 'daypart' as GroupBy },
  },
  {
    id: 'rankings', title: 'Store Rankings',        desc: 'Month-to-date pass rate by store',
    config: { metric: 'pass_rate' as Metric, period: 'mtd' as Period, days: [], dayPart: 'all' as DayPart, groupBy: 'store' as GroupBy },
  },
  {
    id: 'monthly',  title: 'Monthly Trend',         desc: 'Avg score by day of week (MTD)',
    config: { metric: 'avg_score' as Metric, period: 'mtd' as Period, days: [], dayPart: 'all' as DayPart, groupBy: 'dayofweek' as GroupBy },
  },
]

type Tab     = 'templates' | 'builder' | 'scheduled'
type Metric  = 'pass_rate' | 'avg_score' | 'total'
type Period  = 'today' | 'wtd' | 'mtd' | '30d' | 'custom'
type DayPart = 'all' | 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'late' | 'custom'
type GroupBy = 'store' | 'daypart' | 'dayofweek'

interface Config {
  stores: string[]
  metric: Metric
  period: Period
  customStart: string
  customEnd: string
  days: number[]
  dayPart: DayPart
  customHourStart: number
  customHourEnd: number
  groupBy: GroupBy
}

interface ChartEntry { label: string; value: number; count: number }
interface GradeRow   { store_id: string; score: number; passed: boolean; graded_at: string }

const DEFAULT_CFG: Config = {
  stores: [], metric: 'pass_rate', period: 'wtd',
  customStart: '', customEnd: '',
  days: [], dayPart: 'all', customHourStart: 0, customHourEnd: 24,
  groupBy: 'store',
}

// ── helpers ────────────────────────────────────────────────────────────────────

function computeMetric(grades: GradeRow[], metric: Metric): number {
  if (!grades.length) return 0
  if (metric === 'pass_rate') return Math.round(grades.filter(g => g.passed).length / grades.length * 100)
  if (metric === 'avg_score') return parseFloat((grades.reduce((s, g) => s + g.score, 0) / grades.length).toFixed(1))
  return grades.length
}

function buildEntries(grades: GradeRow[], cfg: Config, storeFilter: string[]): ChartEntry[] {
  if (cfg.groupBy === 'store') {
    return storeFilter
      .map(id => {
        const sg = grades.filter(g => g.store_id === id)
        return { label: '#' + id, value: computeMetric(sg, cfg.metric), count: sg.length }
      })
      .filter(e => e.count > 0)
      .sort((a, b) => b.value - a.value)
  }
  if (cfg.groupBy === 'daypart') {
    return DAY_PARTS
      .map(dp => {
        const dg = grades.filter(g => { const h = new Date(g.graded_at).getHours(); return h >= dp.start && h < dp.end })
        return { label: dp.label, value: computeMetric(dg, cfg.metric), count: dg.length }
      })
      .filter(e => e.count > 0)
  }
  // dayofweek — preserve Mon→Sun order (skip Sun index 0, append at end)
  return [1,2,3,4,5,6,0].map(i => {
    const dg = grades.filter(g => new Date(g.graded_at).getDay() === i)
    return { label: DOW[i], value: computeMetric(dg, cfg.metric), count: dg.length }
  }).filter(e => e.count > 0)
}

function getDateRange(cfg: Config): [Date, Date] {
  const now = new Date()
  if (cfg.period === 'today') {
    return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), now]
  }
  if (cfg.period === 'wtd') {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return [s, now]
  }
  if (cfg.period === 'mtd') return [new Date(now.getFullYear(), now.getMonth(), 1), now]
  if (cfg.period === '30d') { const s = new Date(now); s.setDate(now.getDate() - 30); return [s, now] }
  const e = new Date(cfg.customEnd); e.setHours(23,59,59,999)
  return [new Date(cfg.customStart), e]
}

function metricLabel(m: Metric) {
  return m === 'pass_rate' ? 'Pass Rate (%)' : m === 'avg_score' ? 'Avg Score (/10)' : 'Total Graded'
}

function barColor(value: number, metric: Metric): string {
  if (metric === 'pass_rate') return value >= 80 ? '#16a34a' : value >= 70 ? '#ca8a04' : '#CC0000'
  if (metric === 'avg_score') return value >= 8  ? '#16a34a' : value >= 7  ? '#ca8a04' : '#CC0000'
  return '#CC0000'
}

function valueColor(value: number, metric: Metric): string {
  const c = barColor(value, metric)
  if (c === '#16a34a') return 'text-green-600'
  if (c === '#ca8a04') return 'text-yellow-600'
  return 'text-red-600'
}

function buildTitle(c: Config): string {
  const p: Record<Period, string> = { today: 'Today', wtd: 'WTD', mtd: 'MTD', '30d': 'Last 30 Days', custom: 'Custom Range' }
  const g: Record<GroupBy, string> = { store: 'by Store', daypart: 'by Day Part', dayofweek: 'by Day of Week' }
  return `${metricLabel(c.metric)} ${g[c.groupBy]} — ${p[c.period]}`
}

// ── component ──────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useAuth()
  const [tab, setTab]               = useState<Tab>('templates')
  const [cfg, setCfg]               = useState<Config>(DEFAULT_CFG)
  const [entries, setEntries]       = useState<ChartEntry[] | null>(null)
  const [reportTitle, setTitle]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [insights, setInsights]     = useState<string | null>(null)
  const [aiLoading, setAiLoading]   = useState(false)

  const availableStores =
    user?.role === 'store' && user.storeId ? [user.storeId] :
    user?.role === 'admin'                 ? ALL_STORES :
    user?.storeId                          ? [user.storeId] :
    ALL_STORES

  // ── generate ────────────────────────────────────────────────────────────────

  async function generate(override: Partial<Config> = {}, title?: string) {
    const c: Config = { ...cfg, ...override }
    setLoading(true)
    setEntries(null)
    setInsights(null)
    setTitle(title ?? buildTitle(c))
    setTab('builder')

    const [start, end] = getDateRange(c)
    const storeFilter = c.stores.length > 0 ? c.stores : availableStores

    const { data: raw } = await supabase
      .from('grades')
      .select('store_id,score,passed,graded_at')
      .gte('graded_at', start.toISOString())
      .lte('graded_at', end.toISOString())
      .in('store_id', storeFilter)

    let grades: GradeRow[] = raw || []

    if (c.days.length > 0) {
      grades = grades.filter(g => c.days.includes(new Date(g.graded_at).getDay()))
    }

    if (c.dayPart !== 'all') {
      const dp = c.dayPart === 'custom'
        ? { start: c.customHourStart, end: c.customHourEnd }
        : DAY_PARTS.find(d => d.key === c.dayPart)!
      grades = grades.filter(g => { const h = new Date(g.graded_at).getHours(); return h >= dp.start && h < dp.end })
    }

    setEntries(buildEntries(grades, c, storeFilter))
    setLoading(false)
  }

  // ── AI insights ─────────────────────────────────────────────────────────────

  async function getInsights() {
    if (!entries?.length) return
    setAiLoading(true)
    const ml = metricLabel(cfg.metric)
    const dataStr = entries.map(e => `  ${e.label}: ${e.value}${cfg.metric === 'pass_rate' ? '%' : ''} (${e.count} graded)`).join('\n')
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a Papa John's pizza quality analyst. Report: "${reportTitle}"\nMetric: ${ml}\n\nData:\n${dataStr}\n\nPass target: 8/10 score (80% pass rate). Provide:\n\n**OBSERVATIONS**\n- [2–3 specific data-driven observations referencing actual values]\n\n**RECOMMENDATIONS**\n- [2–3 specific, actionable steps to improve quality]\n\nBe concise and direct.`
        }]
      })
      setInsights(resp.choices[0].message.content || '')
    } catch (e) { console.error(e) }
    setAiLoading(false)
  }

  // ── exports ─────────────────────────────────────────────────────────────────

  function exportCSV() {
    if (!entries) return
    const ml = metricLabel(cfg.metric)
    const csv = `Label,${ml},Count\n` + entries.map(e => `${e.label},${e.value},${e.count}`).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = reportTitle.replace(/\s+/g, '_') + '.csv'
    a.click()
  }

  function exportPDF() {
    if (!entries) return
    const ml = metricLabel(cfg.metric)
    const suffix = cfg.metric === 'pass_rate' ? '%' : ''
    const rows = entries.map(e =>
      `<tr><td>${e.label}</td><td style="text-align:right"><b>${e.value}${suffix}</b></td><td style="text-align:right;color:#666">${e.count}</td></tr>`
    ).join('')
    const html = `<html><head><title>${reportTitle}</title><style>
      body{font-family:sans-serif;padding:28px;color:#111}
      h1{color:#CC0000;font-size:20px;margin:0 0 4px}
      p{color:#888;font-size:12px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f5f5f5;padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600}
      td{padding:8px 12px;border-bottom:1px solid #f0f0f0}
    </style></head><body>
      <h1>${reportTitle}</h1>
      <p>Generated ${new Date().toLocaleString()} · Pie-Rate</p>
      <table><thead><tr><th>Label</th><th style="text-align:right">${ml}</th><th style="text-align:right">Grades</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  // ── UI helpers ───────────────────────────────────────────────────────────────

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  function renderInsights(text: string) {
    return text.split('\n').map((line, i) => {
      if (/^\*\*.*\*\*$/.test(line.trim()))
        return <div key={i} className="font-bold text-gray-900 mt-3 mb-1 first:mt-0 text-sm">{line.replace(/\*\*/g, '')}</div>
      if (line.startsWith('- '))
        return <div key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed"><span className="text-[#CC0000] font-bold shrink-0">•</span><span>{line.slice(2)}</span></div>
      return line.trim() ? <div key={i} className="text-sm text-gray-700">{line}</div> : null
    })
  }

  function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
        active ? 'bg-[#CC0000] text-white border-[#CC0000]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
      }`}>{children}</button>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(['templates','builder','scheduled'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? 'bg-white text-[#CC0000] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Templates ─────────────────────────────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">One-click pre-built reports</p>
          {TEMPLATES.map(tmpl => (
            <button key={tmpl.id}
              onClick={() => {
                const override = { ...tmpl.config, stores: [] as string[] }
                setCfg(c => ({ ...c, ...override }))
                generate(override, tmpl.title)
              }}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between text-left hover:border-red-200 active:bg-red-50 transition">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{tmpl.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tmpl.desc}</div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ── Builder ───────────────────────────────────────────────────────────── */}
      {tab === 'builder' && (
        <div className="space-y-3">

          {/* Stores */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-900">Stores</span>
              <button onClick={() => setCfg(c => ({ ...c, stores: [] }))} className="text-xs text-[#CC0000] font-medium">All</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableStores.map(id => (
                <Chip key={id} active={cfg.stores.includes(id)} onClick={() => setCfg(c => ({ ...c, stores: toggle(c.stores, id) }))}>
                  #{id}
                </Chip>
              ))}
            </div>
            {cfg.stores.length === 0 && <p className="text-xs text-gray-400 mt-2">All stores selected</p>}
          </div>

          {/* Metric */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-900 mb-3">Metric</div>
            <div className="flex gap-2">
              {([['pass_rate','Pass Rate'], ['avg_score','Avg Score'], ['total','Total Graded']] as [Metric,string][]).map(([k, label]) => (
                <Chip key={k} active={cfg.metric === k} onClick={() => setCfg(c => ({ ...c, metric: k }))}>{label}</Chip>
              ))}
            </div>
          </div>

          {/* Time Period */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-900 mb-3">Time Period</div>
            <div className="flex flex-wrap gap-2">
              {([['today','Today'], ['wtd','WTD'], ['mtd','MTD'], ['30d','Last 30 Days'], ['custom','Custom']] as [Period,string][]).map(([k, label]) => (
                <Chip key={k} active={cfg.period === k} onClick={() => setCfg(c => ({ ...c, period: k }))}>{label}</Chip>
              ))}
            </div>
            {cfg.period === 'custom' && (
              <div className="flex gap-2 mt-3">
                <input type="date" value={cfg.customStart}
                  onChange={e => setCfg(c => ({ ...c, customStart: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300" />
                <input type="date" value={cfg.customEnd}
                  onChange={e => setCfg(c => ({ ...c, customEnd: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300" />
              </div>
            )}
          </div>

          {/* Day of Week */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-900">Day of Week</span>
              <button onClick={() => setCfg(c => ({ ...c, days: [] }))} className="text-xs text-[#CC0000] font-medium">Any</button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DOW.map((name, i) => (
                <Chip key={i} active={cfg.days.includes(i)} onClick={() => setCfg(c => ({ ...c, days: toggle(c.days, i) }))}>{name}</Chip>
              ))}
            </div>
            {cfg.days.length === 0 && <p className="text-xs text-gray-400 mt-2">Any day</p>}
          </div>

          {/* Day Part */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-900 mb-3">Day Part</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={cfg.dayPart === 'all'} onClick={() => setCfg(c => ({ ...c, dayPart: 'all' }))}>All Day</Chip>
              {DAY_PARTS.map(dp => (
                <Chip key={dp.key} active={cfg.dayPart === dp.key} onClick={() => setCfg(c => ({ ...c, dayPart: dp.key as DayPart }))}>{dp.label}</Chip>
              ))}
              <Chip active={cfg.dayPart === 'custom'} onClick={() => setCfg(c => ({ ...c, dayPart: 'custom' }))}>Custom</Chip>
            </div>
            {cfg.dayPart !== 'all' && cfg.dayPart !== 'custom' && (() => {
              const dp = DAY_PARTS.find(d => d.key === cfg.dayPart)!
              return <p className="text-xs text-gray-400 mt-2">{dp.start}:00 – {dp.end}:00</p>
            })()}
            {cfg.dayPart === 'custom' && (
              <div className="flex items-center gap-2 mt-3">
                <input type="number" min={0} max={23} value={cfg.customHourStart}
                  onChange={e => setCfg(c => ({ ...c, customHourStart: +e.target.value }))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-300" />
                <span className="text-xs text-gray-400">to</span>
                <input type="number" min={1} max={24} value={cfg.customHourEnd}
                  onChange={e => setCfg(c => ({ ...c, customHourEnd: +e.target.value }))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-300" />
                <span className="text-xs text-gray-400">hour (0–24)</span>
              </div>
            )}
          </div>

          {/* Group By */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm font-semibold text-gray-900 mb-3">Group By</div>
            <div className="flex gap-2">
              {([['store','Store'], ['daypart','Day Part'], ['dayofweek','Day of Week']] as [GroupBy,string][]).map(([k, label]) => (
                <Chip key={k} active={cfg.groupBy === k} onClick={() => setCfg(c => ({ ...c, groupBy: k }))}>{label}</Chip>
              ))}
            </div>
          </div>

          <button onClick={() => generate()} disabled={loading}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm shadow-sm disabled:opacity-50 active:bg-red-700 transition">
            {loading ? 'Generating…' : 'Generate Report'}
          </button>

          {/* ── Results ──────────────────────────────────────────────────────── */}
          {loading && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100 text-sm">
              Loading data…
            </div>
          )}

          {entries !== null && !loading && (
            <div className="space-y-3">

              {/* Report header + export */}
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900 leading-snug">{reportTitle}</div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={exportCSV}
                    className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:border-gray-300 transition">
                    <Download size={12} /> CSV
                  </button>
                  <button onClick={exportPDF}
                    className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:border-gray-300 transition">
                    <FileText size={12} /> PDF
                  </button>
                </div>
              </div>

              {entries.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100 text-sm">
                  No data for this selection
                </div>
              ) : (
                <>
                  {/* Chart */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={entries} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          domain={cfg.metric === 'pass_rate' ? [0, 100] : cfg.metric === 'avg_score' ? [0, 10] : undefined}
                        />
                        <Tooltip
                          formatter={(v: number | string | undefined) => [String(v ?? 0) + (cfg.metric === 'pass_rate' ? '%' : ''), metricLabel(cfg.metric)]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                          cursor={{ fill: '#fef2f2' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {entries.map((e, i) => (
                            <Cell key={i} fill={barColor(e.value, cfg.metric)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Insights button */}
                  <button onClick={getInsights} disabled={aiLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#CC0000] to-red-700 text-white py-2.5 rounded-xl font-medium text-sm shadow-sm disabled:opacity-60 active:from-red-700 active:to-red-800 transition">
                    <Sparkles size={14} />
                    {aiLoading ? 'Analyzing…' : 'AI Insights'}
                  </button>

                  {/* AI Insights card */}
                  {insights && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                        <Sparkles size={14} className="text-[#CC0000]" />
                        <span className="text-sm font-semibold text-gray-900">AI Insights</span>
                      </div>
                      <div className="space-y-1">{renderInsights(insights)}</div>
                    </div>
                  )}

                  {/* Data Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="py-2.5 px-4 text-left font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                          <th className="py-2.5 px-4 text-right font-semibold text-gray-500 uppercase tracking-wide">{metricLabel(cfg.metric)}</th>
                          <th className="py-2.5 px-4 text-right font-semibold text-gray-500 uppercase tracking-wide">Grades</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {entries.map((e, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            <td className="py-2.5 px-4 font-medium text-gray-900">{e.label}</td>
                            <td className="py-2.5 px-4 text-right">
                              <span className={`font-bold ${cfg.metric === 'total' ? 'text-gray-900' : valueColor(e.value, cfg.metric)}`}>
                                {e.value}{cfg.metric === 'pass_rate' ? '%' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-gray-400">{e.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Scheduled ─────────────────────────────────────────────────────────── */}
      {tab === 'scheduled' && (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3">
          <Clock size={36} className="text-gray-200" />
          <div className="font-semibold text-gray-700">Scheduled Reports</div>
          <div className="text-xs text-gray-400 max-w-xs">Coming soon — set up automatic delivery of reports to email or Slack on a recurring schedule.</div>
        </div>
      )}
    </div>
  )
}
