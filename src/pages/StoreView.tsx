import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Camera, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { gradeWithAI } from '../lib/gradeWithAI'

interface StoreStats {
  todayRate: number
  wtdRate: number
  lastScore: number
  lastPassed: boolean
  todayGrades: number
  lastImageUrl: string | null
}

export default function StoreView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())
  const [data, setData] = useState<StoreStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [lastResult, setLastResult] = useState<{score: number, passed: boolean, imageUrl: string | null} | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const storeId = user?.storeId || ''

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchData()
      const interval = setInterval(fetchData, 15000)
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
      lastImageUrl: last ? last.image_url : null,
    })
    setLoading(false)
  }

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGrading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const results = await gradeWithAI(base64, storeId, 'cut_table')
        if (results.length > 0) {
          setLastResult({ score: results[0].score, passed: results[0].passed, imageUrl: results[0].imageUrl })
          await fetchData()
        }
      } catch (e) {
        console.error('Grading error:', e)
      }
      setGrading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const display = lastResult || (data && data.todayGrades > 0 ? { score: data.lastScore, passed: data.lastPassed, imageUrl: data.lastImageUrl } : null)

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

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {grading ? (
          <div className="text-center">
            <Loader size={64} className="text-[#CC0000] animate-spin mx-auto mb-4" />
            <div className="text-white font-bold text-xl">Grading...</div>
            <div className="text-gray-400 text-sm mt-1">AI is analyzing the pizza</div>
          </div>
        ) : (
          <>
            {display?.imageUrl ? (
              <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-gray-700">
                <img src={display.imageUrl} alt="Last graded pizza" className="w-full object-cover" style={{maxHeight: '280px'}} />
              </div>
            ) : (
              <div className="w-full max-w-sm h-48 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🍕</div>
                  <div className="text-gray-500 text-sm">No photo yet</div>
                </div>
              </div>
            )}

            {display ? (
              <div className={'w-44 h-44 rounded-full flex flex-col items-center justify-center border-8 ' + (display.passed ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')}>
                <div className={'text-6xl font-bold ' + (display.passed ? 'text-green-400' : 'text-red-400')}>{display.score}</div>
                <div className={'text-lg font-bold mt-1 ' + (display.passed ? 'text-green-400' : 'text-red-400')}>{display.passed ? '✓ PASS' : '✗ FAIL'}</div>
                <div className="text-gray-500 text-xs mt-1">Last Pizza</div>
              </div>
            ) : (
              <div className="w-44 h-44 rounded-full border-8 border-gray-700 flex flex-col items-center justify-center">
                <div className="text-gray-500 text-sm text-center px-4">Waiting for first grade</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Today</div>
                <div className={'text-4xl font-bold ' + ((data?.todayRate || 0) >= 80 ? 'text-green-400' : (data?.todayRate || 0) >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                  {data?.todayGrades ? data.todayRate + '%' : '—'}
                </div>
                <div className="text-gray-500 text-xs mt-1">{data?.todayGrades || 0} graded</div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 text-center border border-gray-800">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">WTD</div>
                <div className={'text-4xl font-bold ' + ((data?.wtdRate || 0) >= 80 ? 'text-green-400' : (data?.wtdRate || 0) >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                  {data?.wtdRate ? data.wtdRate + '%' : '—'}
                </div>
                <div className="text-gray-500 text-xs mt-1">This week</div>
              </div>
            </div>

            <label className={'w-full max-w-sm flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg cursor-pointer transition ' + (grading ? 'bg-gray-800 text-gray-600' : 'bg-[#CC0000] hover:bg-[#aa0000] text-white')}>
              <Camera size={24} />
              📷 Fixed Camera Test
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} disabled={grading} />
            </label>
          </>
        )}
      </div>
    </div>
  )
}