import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Store {
  id: string
  town: string
  region: string
  manager_name: string
  phone: string
  wtd?: number
  trend?: string
  flagged?: number
  grades?: number
}

const REGIONS = ['All','City','North','South','West']

export default function Locations() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('All')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('stores').select('id, town, region, manager_name, phone').order('id')
      .then(({ data, error }) => {
        if (!error && data) {
          const enriched = data.map(s => ({
            ...s,
            wtd: Math.floor(Math.random() * 30) + 65,
            trend: Math.random() > 0.4 ? 'up' : 'down',
            flagged: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
            grades: Math.floor(Math.random() * 50) + 30,
          }))
          setStores(enriched)
        }
        setLoading(false)
      })
  }, [])

  const filtered = stores.filter(s => {
    const matchSearch = s.id.includes(search) || s.manager_name.toLowerCase().includes(search.toLowerCase()) || s.town.toLowerCase().includes(search.toLowerCase())
    const matchRegion = region === 'All' || s.region === region
    return matchSearch && matchRegion
  })

  if (loading) return <div className="p-8 text-center text-gray-400">Loading stores...</div>

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Locations</h1>
        <p className="text-gray-500 text-xs mt-0.5">{stores.length} stores in your franchise group</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['City','North','South','West'].map(r => {
          const rs = stores.filter(s => s.region === r)
          const avg = rs.length ? (rs.reduce((a, s) => a + (s.wtd || 0), 0) / rs.length).toFixed(1) : '0'
          return (
            <div key={r} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <div className="text-xs text-gray-500 font-medium">{r}</div>
              <div className={'text-lg font-bold mt-1 ' + (parseFloat(avg) >= 80 ? 'text-green-600' : 'text-yellow-600')}>{avg}%</div>
              <div className="text-xs text-gray-400">{rs.length} stores</div>
            </div>
          )
        })}
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search store #, manager, town..."
          className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {REGIONS.map(r => (
          <button key={r} onClick={() => setRegion(r)}
            className={'px-3 py-1.5 rounded-xl text-xs font-medium border transition ' + (region === r ? 'bg-[#CC0000] text-white border-[#CC0000]' : 'bg-white text-gray-600 border-gray-200')}>
            {r}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(store => (
          <div key={store.id} onClick={() => setSelected(store.id === selected ? null : store.id)}
            className={'bg-white rounded-xl p-4 shadow-sm border-2 cursor-pointer transition ' + (selected === store.id ? 'border-[#CC0000]' : 'border-gray-100 hover:border-gray-300')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-700 text-xs text-center leading-tight">#{store.id}</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">#{store.id}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{store.town}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><User size={10} />{store.manager_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={'text-lg font-bold ' + ((store.wtd||0) >= 80 ? 'text-green-600' : (store.wtd||0) >= 70 ? 'text-yellow-600' : 'text-red-600')}>{store.wtd}%</div>
                <div className="flex items-center justify-end gap-1 text-xs mt-0.5">
                  {store.trend === 'up'
                    ? <span className="text-green-600 flex items-center gap-0.5"><TrendingUp size={11} />Up</span>
                    : <span className="text-red-500 flex items-center gap-0.5"><TrendingDown size={11} />Down</span>
                  }
                  {(store.flagged||0) > 0 && <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs font-medium">{store.flagged} flagged</span>}
                </div>
              </div>
            </div>
            {selected === store.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs">Region</span><div className="font-medium">{store.region}</div></div>
                <div><span className="text-gray-400 text-xs">Phone</span><div className="font-medium">{store.phone}</div></div>
                <div><span className="text-gray-400 text-xs">Grades This Week</span><div className="font-medium">{store.grades}</div></div>
                <div><span className="text-gray-400 text-xs">Flagged</span><div className={'font-medium ' + ((store.flagged||0) > 0 ? 'text-red-600' : 'text-green-600')}>{(store.flagged||0) > 0 ? store.flagged + ' issues' : 'None'}</div></div>
                <div className="col-span-2">
                  <a href={'/kiosk/' + store.id} target="_blank" className="block w-full text-center bg-[#CC0000] text-white text-xs font-semibold py-2 rounded-xl mt-1">Open Kiosk View</a>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">No stores match your search</div>}
      </div>
    </div>
  )
}