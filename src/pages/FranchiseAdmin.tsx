import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Ban, CheckCircle, X, Store, Users, Search } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type FTab = 'stores' | 'users'

interface StoreRow { id: string; town: string; region: string; manager_name: string; phone: string; company_id?: string; active?: boolean }
interface UserRow  { id: string; name: string; email: string; role: string; company_id?: string; store_id?: string; active?: boolean }

// Franchise owners can assign these roles only (not franchise_owner or super_admin)
const FRANCHISE_ROLES = ['director','area_supervisor','gm','store']
const REGIONS         = ['City','North','South','West','East','Central']
const ROLE_LABEL: Record<string, string> = {
  director: 'Director', area_supervisor: 'Area Supervisor', gm: 'GM',
  store: 'Store', franchise_owner: 'Franchise Owner',
}

// ── Auth user creation (same helper as SuperAdmin) ─────────────────────────────
async function createAuthUser(email: string, password: string): Promise<string | null> {
  const { data: { session: prev } } = await supabase.auth.getSession()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  const uid = data.user?.id ?? null
  if (prev?.access_token) {
    await supabase.auth.setSession({ access_token: prev.access_token, refresh_token: prev.refresh_token })
  }
  return uid
}

// ── Small UI helpers ───────────────────────────────────────────────────────────
function FModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={17} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function FInp({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] bg-white" {...props} />
    </div>
  )
}

function FSel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] bg-white">
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const palette: Record<string, string> = {
    franchise_owner: 'bg-blue-100 text-blue-700', director: 'bg-indigo-100 text-indigo-700',
    area_supervisor: 'bg-cyan-100 text-cyan-700', gm: 'bg-green-100 text-green-700',
    store: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${palette[role] ?? 'bg-gray-100 text-gray-500'}`}>{ROLE_LABEL[role] ?? role}</span>
}

function Spinner() { return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div> }
function Empty({ text }: { text: string }) {
  return <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100 text-sm">{text}</div>
}

// ── Franchise Admin Page ───────────────────────────────────────────────────────
export default function FranchiseAdmin() {
  const { user } = useAuth()
  const companyId = user?.companyId

  const [tab, setTab]         = useState<FTab>('stores')
  const [stores, setStores]   = useState<StoreRow[]>([])
  const [users, setUsers]     = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [toast, setToast]     = useState<string | null>(null)

  type ModalType = 'edit-store' | 'add-user' | 'edit-user' | null
  const [modalType, setModalType]   = useState<ModalType>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm]             = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)

  const f  = (k: string) => form[k] ?? ''
  const sf = (k: string, v: string) => setForm(d => ({ ...d, [k]: v }))
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Fetching ───────────────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('stores').select('*').eq('company_id', companyId).order('id')
    setStores(data ?? []); setLoading(false)
  }, [companyId])

  const fetchUsers = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('company_id', companyId).order('name')
    setUsers(data ?? []); setLoading(false)
  }, [companyId])

  useEffect(() => {
    if (tab === 'stores') fetchStores()
    if (tab === 'users')  fetchUsers()
  }, [tab, companyId])

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openModal(type: ModalType, target?: any) {
    setModalType(type); setEditTarget(target ?? null); setForm(target ? { ...target } : {})
  }
  const closeModal = () => { setModalType(null); setEditTarget(null) }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function saveStore() {
    if (!editTarget) return
    setSaving(true)
    try {
      const { error } = await supabase.from('stores').update({
        town: f('town'), region: f('region'), manager_name: f('manager_name'), phone: f('phone'),
      }).eq('id', editTarget.id).eq('company_id', companyId!)
      if (error) throw error
      closeModal(); fetchStores(); showToast('Store updated.')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setSaving(false)
  }

  async function saveUser() {
    setSaving(true)
    try {
      if (modalType === 'add-user') {
        const uid = await createAuthUser(f('email'), f('password'))
        if (!uid) throw new Error('Auth user creation returned no ID.')
        const { error } = await supabase.from('profiles').insert({
          id: uid, name: f('name'), email: f('email'),
          role: f('role') || 'store', company_id: companyId, store_id: f('store_id') || null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('profiles').update({
          name: f('name'), role: f('role'), store_id: f('store_id') || null,
        }).eq('id', editTarget.id).eq('company_id', companyId!)
        if (error) throw error
      }
      closeModal(); fetchUsers(); showToast('User saved.')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setSaving(false)
  }

  async function toggleUser(u: UserRow) {
    const next = !(u.active ?? true)
    await supabase.from('profiles').update({ active: next }).eq('id', u.id).eq('company_id', companyId!)
    fetchUsers(); showToast(next ? 'User activated.' : 'User deactivated.')
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtStores = stores.filter(s => !search || s.id.includes(search) || s.town.toLowerCase().includes(search.toLowerCase()))
  const filtUsers  = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  const TABS = [
    { key: 'stores', label: 'Stores', icon: Store },
    { key: 'users',  label: 'Users',  icon: Users },
  ] as const

  if (!companyId) return (
    <div className="p-6 text-center text-gray-400 text-sm">No company associated with your account.</div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Franchise Admin</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your company's stores and team</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key as FTab); setSearch('') }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === key ? 'bg-[#CC0000] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Stores ────────────────────────────────────────────────────────── */}
      {tab === 'stores' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stores…"
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]" />
          </div>
          <span className="text-xs text-gray-500">{filtStores.length} stores</span>
          {loading ? <Spinner /> : filtStores.length === 0 ? <Empty text="No stores found." /> : (
            <div className="space-y-2">
              {filtStores.map(s => (
                <div key={s.id} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${s.active === false ? 'opacity-55' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">#{s.id}</span>
                        {s.active === false && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.town} · {s.region}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.manager_name}</div>
                      {s.phone && <div className="text-xs text-gray-400 mt-0.5">{s.phone}</div>}
                    </div>
                    <button onClick={() => openModal('edit-store', s)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Users ─────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]" />
            </div>
            <button onClick={() => openModal('add-user')}
              className="flex items-center gap-1.5 bg-[#CC0000] text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm shrink-0">
              <Plus size={13} /> Add User
            </button>
          </div>
          <span className="text-xs text-gray-500">{filtUsers.length} team members</span>
          {loading ? <Spinner /> : filtUsers.length === 0 ? <Empty text="No users found." /> : (
            <div className="space-y-2">
              {filtUsers.map(u => (
                <div key={u.id} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${u.active === false ? 'opacity-55' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{u.name || '—'}</span>
                        <RoleBadge role={u.role} />
                        {u.active === false && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      {u.store_id && <div className="text-xs text-gray-400">Store #{u.store_id}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openModal('edit-user', u)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <Edit2 size={14} className="text-gray-400" />
                      </button>
                      <button onClick={() => toggleUser(u)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        {u.active === false
                          ? <CheckCircle size={14} className="text-green-500" />
                          : <Ban size={14} className="text-red-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Store Modal ───────────────────────────────────────────────── */}
      {modalType === 'edit-store' && (
        <FModal title="Edit Store" onClose={closeModal}>
          <div className="text-xs text-gray-400 mb-1">Store #{editTarget?.id}</div>
          <FInp label="Town / City" value={f('town')} onChange={e => sf('town', e.target.value)} placeholder="Shorewood" />
          <FSel label="Region" value={f('region')} onChange={v => sf('region', v)} options={REGIONS.map(r => ({ value: r, label: r }))} />
          <FInp label="Manager Name" value={f('manager_name')} onChange={e => sf('manager_name', e.target.value)} placeholder="Jane Doe" />
          <FInp label="Phone" type="tel" value={f('phone')} onChange={e => sf('phone', e.target.value)} placeholder="(555) 000-0000" />
          <button onClick={saveStore} disabled={saving || !f('town')}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm mt-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Store'}
          </button>
        </FModal>
      )}

      {/* ── Add / Edit User Modal ──────────────────────────────────────────── */}
      {(modalType === 'add-user' || modalType === 'edit-user') && (
        <FModal title={modalType === 'add-user' ? 'Add Team Member' : 'Edit Team Member'} onClose={closeModal}>
          <FInp label="Full Name" value={f('name')} onChange={e => sf('name', e.target.value)} placeholder="Jane Doe" />
          {modalType === 'add-user' && <>
            <FInp label="Email" type="email" value={f('email')} onChange={e => sf('email', e.target.value)} placeholder="jane@franchise.com" />
            <FInp label="Temporary Password" type="password" value={f('password')} onChange={e => sf('password', e.target.value)} placeholder="min 6 characters" />
          </>}
          <FSel label="Role" value={f('role')} onChange={v => sf('role', v)}
            options={FRANCHISE_ROLES.map(r => ({ value: r, label: ROLE_LABEL[r] ?? r }))} />
          <FInp label="Store ID (if applicable)" value={f('store_id') ?? ''} onChange={e => sf('store_id', e.target.value)} placeholder="3407" />
          <button onClick={saveUser} disabled={saving || !f('name')}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm mt-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save User'}
          </button>
        </FModal>
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl text-center z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
