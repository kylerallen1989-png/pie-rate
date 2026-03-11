import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STORES = ['957','1183','1963','3175','3309','3407','3999','4037','4106','4109','4870','4929','5070','5143']
const STYLES = ['Original Crust','Thin Crust','Pan Pizza','Stuffed Crust','Gluten Free','NY Style']

const MANUAL_CHECKS = [
  'Toppings within spec',
  'Crust hand-stretched correctly',
  'Proper bake time',
  'Box presentation correct',
  'Pepperoncini and garlic sauce included',
  'Correct pizza size',
  'Proper cut',
  'Toppings per slice correct',
]

export default function Grade() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [store, setStore] = useState('')
  const [employee, setEmployee] = useState('')
  const [style, setStyle] = useState('')
  const [photo, setPhoto] = useState(null as string | null)
  const [checks, setChecks] = useState<Record<string,boolean>>({})
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setPhoto(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const toggleCheck = (check: string) => {
    setChecks(prev => ({ ...prev, [check]: !prev[check] }))
  }

  const allChecksPassed = MANUAL_CHECKS.every(c => checks[c] === true)

  const handleSubmit = async () => {
    setSaving(true)
    const crust = 2
    const cheeseCov = 2
    const cheeseLock = 1
    const toppings = 3.5
    const total = crust + cheeseCov + cheeseLock + toppings
    const passed = total >= 8 && allChecksPassed

    const { error } = await supabase.from('grades').insert({
      store_id: store,
      score: total,
      passed,
      mode: 'audit',
      image_url: null,
      graded_at: new Date().toISOString(),
    })

    if (error) console.error('Save error:', error.message)

    setResult({ crust, cheeseCov, cheeseLock, toppings, total, passed, allChecksPassed })
    setSaving(false)
    setSubmitted(true)
  }

  const reset = () => {
    setStep(1); setStore(''); setEmployee(''); setStyle('')
    setPhoto(null); setChecks({}); setNotes(''); setSubmitted(false); setResult(null)
  }

  if (submitted && result) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className={"w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 " + (result.passed ? "bg-green-100" : "bg-red-100")}>
            {result.passed ? <CheckCircle size={32} className="text-green-500" /> : <AlertTriangle size={32} className="text-red-500" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{result.passed ? "PASS" : "FAIL"}</h2>
          <p className="text-gray-500 text-sm mb-2">#{store} · {employee} · {style}</p>
          <div className={"text-5xl font-bold mb-6 " + (result.passed ? "text-green-600" : "text-red-600")}>
            {result.total}/10
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Crust', score: result.crust, max: 2 },
              { label: 'Cheese Coverage', score: result.cheeseCov, max: 2 },
              { label: 'Cheese Lock', score: result.cheeseLock, max: 2 },
              { label: 'Toppings', score: result.toppings, max: 4 },
            ].map(cat => (
              <div key={cat.label} className={"rounded-xl p-3 " + (cat.score === cat.max ? "bg-green-50" : cat.score === 0 ? "bg-red-50" : "bg-yellow-50")}>
                <div className={"text-xl font-bold " + (cat.score === cat.max ? "text-green-600" : cat.score === 0 ? "text-red-600" : "text-yellow-600")}>
                  {cat.score}/{cat.max}
                </div>
                <div className="text-xs text-gray-500">{cat.label}</div>
              </div>
            ))}
          </div>
          {!result.allChecksPassed && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-left">
              <div className="text-red-700 text-sm font-semibold">Manual checks failed</div>
              <div className="text-red-600 text-xs mt-1">One or more required checks were not met. Pizza automatically fails.</div>
            </div>
          )}
          <button onClick={reset} className="w-full bg-[#CC0000] hover:bg-[#aa0000] text-white font-semibold py-3 rounded-xl transition">
            Grade Another Pizza
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-1.5 bg-gray-100">
          <div className="h-1.5 bg-[#CC0000] transition-all" style={{ width: (step / 4 * 100) + "%" }} />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-gray-900">Manager Audit</h1>
            <span className="text-xs text-gray-400">Step {step} of 4</span>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Store</label>
                <select value={store} onChange={e => setStore(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]">
                  <option value="">Select store...</option>
                  {STORES.map(s => <option key={s} value={s}>#{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Name</label>
                <input type="text" value={employee} onChange={e => setEmployee(e.target.value)}
                  placeholder="Who made this pizza?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pizza Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)}
                      className={"py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition " +
                        (style === s ? "border-[#CC0000] bg-red-50 text-[#CC0000]" : "border-gray-200 text-gray-600")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button disabled={!store || !employee || !style} onClick={() => setStep(2)}
                className="w-full bg-[#CC0000] hover:bg-[#aa0000] text-white font-semibold py-3 rounded-xl transition disabled:opacity-40">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pizza Photo</label>
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Pizza" className="w-full h-56 object-cover rounded-xl" />
                  <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-lg">Retake</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#CC0000] bg-gray-50">
                  <Camera size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 font-medium">Take photo or upload</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                </label>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-[#CC0000] text-white font-semibold py-3 rounded-xl">
                  {photo ? "Next" : "Skip Photo"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-3">Check all that apply to this pizza</p>
              {MANUAL_CHECKS.map(check => (
                <div key={check} onClick={() => toggleCheck(check)}
                  className={"flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition " +
                    (checks[check] ? "border-green-500 bg-green-50" : "border-gray-200 bg-white")}>
                  <div className={"w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 " +
                    (checks[check] ? "border-green-500 bg-green-500" : "border-gray-300")}>
                    {checks[check] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className={"text-sm " + (checks[check] ? "text-green-700 font-medium" : "text-gray-700")}>{check}</span>
                </div>
              ))}
              {!allChecksPassed && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                  All checks must pass for the pizza to pass audit
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl">Back</button>
                <button onClick={() => setStep(4)} className="flex-1 bg-[#CC0000] text-white font-semibold py-3 rounded-xl">Next</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Store</span><span className="font-semibold">#{store}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Employee</span><span className="font-semibold">{employee}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Style</span><span className="font-semibold">{style}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Graded by</span><span className="font-semibold">{user?.name || 'Manager'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Manual Checks</span>
                  <span className={"font-semibold " + (allChecksPassed ? "text-green-600" : "text-red-600")}>
                    {allChecksPassed ? "All Passed" : "Some Failed"}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Any additional observations..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl">Back</button>
                <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-[#CC0000] text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                  {saving ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}