import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Kiosk() {
  const { storeId } = useParams()
  const [lastScore, setLastScore] = useState<number | null>(88)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const passed = lastScore !== null && lastScore >= 80

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <div className="text-white text-center mb-8">
        <div className="text-2xl font-bold">🍕 Pie-Rate</div>
        <div className="text-gray-400 text-sm">Store #{storeId} — Cut Table</div>
        <div className="text-gray-500 text-xs font-mono mt-1">{time.toLocaleTimeString()}</div>
      </div>

      {lastScore !== null ? (
        <div className={"w-72 h-72 rounded-full flex flex-col items-center justify-center border-8 " +
          (passed ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10")}>
          <div className={"text-8xl font-bold " + (passed ? "text-green-400" : "text-red-400")}>
            {lastScore}
          </div>
          <div className={"text-2xl font-bold mt-2 " + (passed ? "text-green-400" : "text-red-400")}>
            {passed ? "✓ PASS" : "✗ FAIL"}
          </div>
          <div className="text-gray-400 text-sm mt-1">Last Pizza</div>
        </div>
      ) : (
        <div className="w-72 h-72 rounded-full flex items-center justify-center border-8 border-gray-600 bg-gray-800">
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm">Waiting for pizza...</div>
          </div>
        </div>
      )}

      <div className="mt-8 text-gray-500 text-xs text-center">
        Grading automatically — no action required
      </div>
    </div>
  )
}