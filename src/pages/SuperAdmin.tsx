import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Edit2, Ban, CheckCircle, X, Building2, Store, Users,
  BarChart3, Wand2, Search, ChevronRight, ArrowLeft, Check,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type SuperTab = 'companies' | 'stores' | 'users' | 'grades' | 'onboard'
type ModalType = 'add-company' | 'edit-company' | 'add-store' | 'edit-store' | 'add-user' | 'edit-user' | null

interface Company  { id: string; name: string; contact_name: string; email: string; phone: string; created_at: string }
interface StoreRow { id: string; town: string; region: string; manager_name: string; phone: string; company_id?: string; active?: boolean }
interface UserRow  { id: string; name: string; email: string; role: string; company_id?: string; store_id?: string; active?: boolean }
interface GradeRow { id: string; store_id: string; score: number; passed: boolean; mode: string; graded_at: string }
interface OBCompany { name: string; contact: string; email: string; phone: string }
interface OBStore   { storeId: string; town: string; region: string; manager: string; password: string }
interface OBOwner   { name: string; email: string; password: string }

// ── Constants ──────────────────────────────────────────────────────────────────
const ALL_ROLES = ['super_admin','franchise_owner','director','area_supervisor','gm','store','manager','worker']
const REGIONS   = ['City','North','South','West','East','Central']
const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', franchise_owner: 'Franchise Owner', director: 'Director',
  area_supervisor: 'Area Supervisor', gm: 'GM', store: 'Store', manager: 'Manager', worker: 'Worker',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function createAuthUser(email: string, password: string): Promise<string | null> {
  // Requires "Email Confirmations" to be DISABLED in Supabase Auth settings.
  const { data: { session: prev } } = await supabase.auth.getSession()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  const uid = data.user?.id ?? null
  // Restore the super-admin's session after signUp replaces it
  if (prev?.access_token) {
    await supabase.auth.setSession({ access_token: prev.access_token, refresh_token: prev.refresh_token })
  }
  return uid
}

// ── Small reusable UI ──────────────────────────────────────────────────────────
function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

function AdminInp({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] bg-white" {...props} />
    </div>
  )
}

function AdminSel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
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
    super_admin: 'bg-purple-100 text-purple-700', franchise_owner: 'bg-blue-100 text-blue-700',
    director: 'bg-indigo-100 text-indigo-700', area_supervisor: 'bg-cyan-100 text-cyan-700',
    gm: 'bg-green-100 text-green-700', store: 'bg-gray-100 text-gray-600',
    manager: 'bg-yellow-100 text-yellow-700', worker: 'bg-gray-100 text-gray-500',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${palette[role] ?? 'bg-gray-100 text-gray-500'}`}>{ROLE_LABEL[role] ?? role}</span>
}

function Spinner() { return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div> }
function Empty({ text }: { text: string }) {
  return <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100 text-sm">{text}</div>
}

// ── Super Admin Page ───────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [tab, setTab]             = useState<SuperTab>('companies')
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores]       = useState<StoreRow[]>([])
  const [users, setUsers]         = useState<UserRow[]>([])
  const [grades, setGrades]       = useState<GradeRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [toast, setToast]         = useState<string | null>(null)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm]           = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)

  // onboarding state
  const [obStep, setObStep]       = useState(1)
  const [obCompany, setObCompany] = useState<OBCompany>({ name: '', contact: '', email: '', phone: '' })
  const [obStores, setObStores]   = useState<OBStore[]>([{ storeId: '', town: '', region: 'City', manager: '', password: '' }])
  const [obOwner, setObOwner]     = useState<OBOwner>({ name: '', email: '', password: '' })
  const [obSaving, setObSaving]   = useState(false)
  const [obDone, setObDone]       = useState(false)

  const f  = (k: string) => form[k] ?? ''
  const sf = (k: string, v: string) => setForm(d => ({ ...d, [k]: v }))
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('name')
    setCompanies(data ?? []); setLoading(false)
  }, [])

  const fetchStores = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('stores').select('*').order('id')
    setStores(data ?? []); setLoading(false)
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('name')
    setUsers(data ?? []); setLoading(false)
  }, [])

  const fetchGrades = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('grades').select('*').order('graded_at', { ascending: false }).limit(300)
    setGrades(data ?? []); setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'companies') fetchCompanies()
    if (tab === 'stores')    { fetchCompanies(); fetchStores() }
    if (tab === 'users')     { fetchCompanies(); fetchUsers() }
    if (tab === 'grades')    fetchGrades()
  }, [tab])

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openModal(type: ModalType, target?: any) {
    setModalType(type); setEditTarget(target ?? null); setForm(target ? { ...target } : {})
  }
  const closeModal = () => { setModalType(null); setEditTarget(null) }

  // ── CRUD actions ───────────────────────────────────────────────────────────
  async function saveCompany() {
    setSaving(true)
    try {
      const p = { name: f('name'), contact_name: f('contact_name'), email: f('email'), phone: f('phone') }
      const { error } = modalType === 'add-company'
        ? await supabase.from('companies').insert(p)
        : await supabase.from('companies').update(p).eq('id', editTarget.id)
      if (error) throw error
      closeModal(); fetchCompanies(); showToast('Company saved.')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setSaving(false)
  }

  async function saveStore() {
    setSaving(true)
    try {
      if (modalType === 'add-store') {
        const { error } = await supabase.from('stores').insert({
          id: f('id'), town: f('town'), region: f('region'), manager_name: f('manager_name'),
          phone: f('phone'), password: f('password'), company_id: f('company_id') || null, active: true,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('stores').update({
          town: f('town'), region: f('region'), manager_name: f('manager_name'),
          phone: f('phone'), company_id: f('company_id') || null,
        }).eq('id', editTarget.id)
        if (error) throw error
      }
      closeModal(); fetchStores(); showToast('Store saved.')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setSaving(false)
  }

  async function toggleStore(s: StoreRow) {
    await supabase.from('stores').update({ active: !(s.active ?? true) }).eq('id', s.id)
    fetchStores(); showToast((s.active ?? true) ? 'Store deactivated.' : 'Store activated.')
  }

  async function saveUser() {
    setSaving(true)
    try {
      if (modalType === 'add-user') {
        const uid = await createAuthUser(f('email'), f('password'))
        if (!uid) throw new Error('Auth user creation returned no ID.')
        const { error } = await supabase.from('profiles').insert({
          id: uid, name: f('name'), email: f('email'),
          role: f('role') || 'store', company_id: f('company_id') || null, store_id: f('store_id') || null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('profiles').update({
          name: f('name'), role: f('role'),
          company_id: f('company_id') || null, store_id: f('store_id') || null,
        }).eq('id', editTarget.id)
        if (error) throw error
      }
      closeModal(); fetchUsers(); showToast('User saved.')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setSaving(false)
  }

  async function toggleUser(u: UserRow) {
    const next = !(u.active ?? true)
    await supabase.from('profiles').update({ active: next }).eq('id', u.id)
    fetchUsers(); showToast(next ? 'User activated.' : 'User deactivated.')
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  async function submitOnboard() {
    setObSaving(true)
    try {
      const { data: co, error: coErr } = await supabase.from('companies')
        .insert({ name: obCompany.name, contact_name: obCompany.contact, email: obCompany.email, phone: obCompany.phone })
        .select().single()
      if (coErr) throw coErr

      for (const s of obStores.filter(s => s.storeId)) {
        await supabase.from('stores').insert({
          id: s.storeId, town: s.town, region: s.region, manager_name: s.manager,
          password: s.password, company_id: co.id, active: true, phone: '',
        })
      }

      const uid = await createAuthUser(obOwner.email, obOwner.password)
      if (uid) {
        await supabase.from('profiles').insert({
          id: uid, name: obOwner.name, email: obOwner.email,
          role: 'franchise_owner', company_id: co.id,
        })
      }
      setObDone(true); fetchCompanies(); showToast('Onboarding complete!')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setObSaving(false)
  }

  function resetOnboard() {
    setObStep(1); setObDone(false)
    setObCompany({ name: '', contact: '', email: '', phone: '' })
    setObStores([{ storeId: '', town: '', region: 'City', manager: '', password: '' }])
    setObOwner({ name: '', email: '', password: '' })
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const companyName  = (id?: string) => companies.find(c => c.id === id)?.name ?? '—'
  const filtStores   = stores.filter(s => !search || s.id.includes(search) || s.town.toLowerCase().includes(search.toLowerCase()))
  const filtUsers    = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  const filtGrades   = grades.filter(g => gradeFilter === 'all' || (gradeFilter === 'passed' ? g.passed : !g.passed))

  const TABS = [
    { key: 'companies', label: 'Companies', icon: Building2 },
    { key: 'stores',    label: 'Stores',    icon: Store },
    { key: 'users',     label: 'Users',     icon: Users },
    { key: 'grades',    label: 'Grades',    icon: BarChart3 },
    { key: 'onboard',   label: 'Onboard',   icon: Wand2 },
  ] as const

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-xs text-gray-500 mt-0.5">Platform-wide management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key as SuperTab); setSearch('') }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition ${
              tab === key ? 'bg-[#CC0000] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ── Companies tab ─────────────────────────────────────────────────── */}
      {tab === 'companies' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{companies.length} companies</span>
            <button onClick={() => openModal('add-company')}
              className="flex items-center gap-1.5 bg-[#CC0000] text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm">
              <Plus size={13} /> Add Company
            </button>
          </div>
          {loading ? <Spinner /> : companies.length === 0 ? <Empty text="No companies yet — use Onboard to add one." /> : (
            <div className="space-y-2">
              {companies.map(c => (
                <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.contact_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.email} · {c.phone}</div>
                      <div className="text-xs text-blue-500 mt-1">{stores.filter(s => s.company_id === c.id).length} stores</div>
                    </div>
                    <button onClick={() => openModal('edit-company', c)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Stores tab ────────────────────────────────────────────────────── */}
      {tab === 'stores' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stores…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]" />
            </div>
            <button onClick={() => openModal('add-store')}
              className="flex items-center gap-1.5 bg-[#CC0000] text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm shrink-0">
              <Plus size={13} /> Add
            </button>
          </div>
          <span className="text-xs text-gray-500">{filtStores.length} stores</span>
          {loading ? <Spinner /> : filtStores.length === 0 ? <Empty text="No stores found." /> : (
            <div className="space-y-2">
              {filtStores.map(s => (
                <div key={s.id} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition ${s.active === false ? 'opacity-55' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">#{s.id}</span>
                        {s.active === false && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.town} · {s.region}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.manager_name}</div>
                      <div className="text-xs text-blue-500 mt-0.5">{companyName(s.company_id)}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openModal('edit-store', s)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <Edit2 size={14} className="text-gray-400" />
                      </button>
                      <button onClick={() => toggleStore(s)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        {s.active === false
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

      {/* ── Users tab ─────────────────────────────────────────────────────── */}
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
              <Plus size={13} /> Add
            </button>
          </div>
          <span className="text-xs text-gray-500">{filtUsers.length} users</span>
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
                      <div className="text-xs text-gray-400">
                        {companyName(u.company_id)}{u.store_id ? ` · Store #${u.store_id}` : ''}
                      </div>
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

      {/* ── Grades tab ────────────────────────────────────────────────────── */}
      {tab === 'grades' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {['all','passed','failed'].map(v => (
              <button key={v} onClick={() => setGradeFilter(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  gradeFilter === v ? 'bg-[#CC0000] text-white border-[#CC0000]' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">{filtGrades.length} grades</span>
          {loading ? <Spinner /> : filtGrades.length === 0 ? <Empty text="No grades found." /> : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-2.5 px-4 text-left font-semibold text-gray-500">Store</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-gray-500">Score</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-500">Result</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-500">Mode</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtGrades.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 transition">
                      <td className="py-2.5 px-4 font-medium text-gray-900">#{g.store_id}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${g.passed ? 'text-green-600' : 'text-red-600'}`}>{g.score}/10</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${g.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {g.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 capitalize">{g.mode}</td>
                      <td className="py-2.5 px-3 text-gray-400">{new Date(g.graded_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Onboard tab ───────────────────────────────────────────────────── */}
      {tab === 'onboard' && (
        <OnboardWizard
          step={obStep} setStep={setObStep}
          company={obCompany} setCompany={setObCompany}
          stores={obStores} setStores={setObStores}
          owner={obOwner} setOwner={setObOwner}
          saving={obSaving} done={obDone}
          onSubmit={submitOnboard} onReset={resetOnboard}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {(modalType === 'add-company' || modalType === 'edit-company') && (
        <AdminModal title={modalType === 'add-company' ? 'Add Company' : 'Edit Company'} onClose={closeModal}>
          <AdminInp label="Company Name" value={f('name')} onChange={e => sf('name', e.target.value)} placeholder="Midwest Pizza Group LLC" />
          <AdminInp label="Contact Name" value={f('contact_name')} onChange={e => sf('contact_name', e.target.value)} placeholder="John Smith" />
          <AdminInp label="Email" type="email" value={f('email')} onChange={e => sf('email', e.target.value)} placeholder="owner@company.com" />
          <AdminInp label="Phone" type="tel" value={f('phone')} onChange={e => sf('phone', e.target.value)} placeholder="(555) 000-0000" />
          <button onClick={saveCompany} disabled={saving || !f('name')}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm mt-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Company'}
          </button>
        </AdminModal>
      )}

      {(modalType === 'add-store' || modalType === 'edit-store') && (
        <AdminModal title={modalType === 'add-store' ? 'Add Store' : 'Edit Store'} onClose={closeModal}>
          {modalType === 'add-store' && (
            <AdminInp label="Store ID (number)" value={f('id')} onChange={e => sf('id', e.target.value)} placeholder="3407" />
          )}
          <AdminInp label="Town / City" value={f('town')} onChange={e => sf('town', e.target.value)} placeholder="Shorewood" />
          <AdminSel label="Region" value={f('region')} onChange={v => sf('region', v)} options={REGIONS.map(r => ({ value: r, label: r }))} />
          <AdminInp label="Manager Name" value={f('manager_name')} onChange={e => sf('manager_name', e.target.value)} placeholder="Jane Doe" />
          <AdminInp label="Phone" type="tel" value={f('phone')} onChange={e => sf('phone', e.target.value)} placeholder="(555) 000-0000" />
          {modalType === 'add-store' && (
            <AdminInp label="Store Login Password" type="password" value={f('password')} onChange={e => sf('password', e.target.value)} placeholder="shorewood1" />
          )}
          <AdminSel label="Company" value={f('company_id') ?? ''} onChange={v => sf('company_id', v)} options={companies.map(c => ({ value: c.id, label: c.name }))} />
          <button onClick={saveStore} disabled={saving || !f('town')}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm mt-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Store'}
          </button>
        </AdminModal>
      )}

      {(modalType === 'add-user' || modalType === 'edit-user') && (
        <AdminModal title={modalType === 'add-user' ? 'Add User' : 'Edit User'} onClose={closeModal}>
          <AdminInp label="Full Name" value={f('name')} onChange={e => sf('name', e.target.value)} placeholder="Jane Doe" />
          {modalType === 'add-user' && <>
            <AdminInp label="Email" type="email" value={f('email')} onChange={e => sf('email', e.target.value)} placeholder="jane@company.com" />
            <AdminInp label="Temporary Password" type="password" value={f('password')} onChange={e => sf('password', e.target.value)} placeholder="min 6 characters" />
          </>}
          <AdminSel label="Role" value={f('role')} onChange={v => sf('role', v)} options={ALL_ROLES.map(r => ({ value: r, label: ROLE_LABEL[r] ?? r }))} />
          <AdminSel label="Company" value={f('company_id') ?? ''} onChange={v => sf('company_id', v)} options={companies.map(c => ({ value: c.id, label: c.name }))} />
          <AdminInp label="Store ID (if applicable)" value={f('store_id') ?? ''} onChange={e => sf('store_id', e.target.value)} placeholder="3407" />
          <button onClick={saveUser} disabled={saving || !f('name')}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm mt-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save User'}
          </button>
        </AdminModal>
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl text-center z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Onboarding Wizard (defined after main component; uses AdminInp/AdminSel above) ──
function OnboardWizard({
  step, setStep, company, setCompany, stores, setStores, owner, setOwner, saving, done, onSubmit, onReset,
}: {
  step: number; setStep: (s: number) => void
  company: OBCompany; setCompany: (c: OBCompany) => void
  stores: OBStore[]; setStores: (s: OBStore[]) => void
  owner: OBOwner; setOwner: (o: OBOwner) => void
  saving: boolean; done: boolean; onSubmit: () => void; onReset: () => void
}) {
  const updateStore = (i: number, k: keyof OBStore, v: string) => {
    const next = [...stores]; next[i] = { ...next[i], [k]: v }; setStores(next)
  }

  if (done) return (
    <div className="bg-white rounded-2xl p-10 shadow-sm border border-green-100 text-center space-y-3">
      <div className="text-5xl">🎉</div>
      <div className="font-bold text-gray-900 text-lg">Onboarding Complete!</div>
      <p className="text-sm text-gray-500">Company, stores, and franchise owner account created successfully.</p>
      <button onClick={onReset} className="bg-[#CC0000] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
        Onboard Another
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {[1,2,3,4].map(s => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
              step > s ? 'bg-green-500 text-white' : step === s ? 'bg-[#CC0000] text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {step > s ? <Check size={12} /> : s}
            </div>
            {s < 4 && <div className={`flex-1 h-0.5 rounded transition ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 font-medium">
        {['Company Details', 'Add Stores', 'Franchise Owner', 'Review & Confirm'][step - 1]}
      </p>

      {step === 1 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Building2 size={15} className="text-[#CC0000]" /> Company Details
          </h2>
          <AdminInp label="Company Name" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} placeholder="Midwest Pizza Group LLC" />
          <AdminInp label="Primary Contact" value={company.contact} onChange={e => setCompany({ ...company, contact: e.target.value })} placeholder="John Smith" />
          <AdminInp label="Email" type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} placeholder="owner@franchise.com" />
          <AdminInp label="Phone" type="tel" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} placeholder="(555) 000-0000" />
          <button onClick={() => setStep(2)} disabled={!company.name || !company.email}
            className="w-full bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Store size={15} className="text-[#CC0000]" /> Add Stores
          </h2>
          {stores.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Store {i + 1}</span>
                {stores.length > 1 && (
                  <button onClick={() => setStores(stores.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 transition">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AdminInp label="Store #" value={s.storeId} onChange={e => updateStore(i, 'storeId', e.target.value)} placeholder="3407" />
                <AdminInp label="Town" value={s.town} onChange={e => updateStore(i, 'town', e.target.value)} placeholder="Shorewood" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Region</label>
                  <select value={s.region} onChange={e => updateStore(i, 'region', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000] bg-white">
                    {['City','North','South','West','East','Central'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <AdminInp label="Manager" value={s.manager} onChange={e => updateStore(i, 'manager', e.target.value)} placeholder="Jane Doe" />
              </div>
              <AdminInp label="Login Password" type="password" value={s.password} onChange={e => updateStore(i, 'password', e.target.value)} placeholder="storetown1" />
            </div>
          ))}
          <button onClick={() => setStores([...stores, { storeId: '', town: '', region: 'City', manager: '', password: '' }])}
            className="w-full border-2 border-dashed border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:border-red-200 hover:text-[#CC0000] transition">
            + Add Another Store
          </button>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(3)} disabled={stores.every(s => !s.storeId)}
              className="flex-1 bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Users size={15} className="text-[#CC0000]" /> Franchise Owner Account
          </h2>
          <AdminInp label="Full Name" value={owner.name} onChange={e => setOwner({ ...owner, name: e.target.value })} placeholder="Jane Smith" />
          <AdminInp label="Email" type="email" value={owner.email} onChange={e => setOwner({ ...owner, email: e.target.value })} placeholder="owner@franchise.com" />
          <AdminInp label="Temporary Password" type="password" value={owner.password} onChange={e => setOwner({ ...owner, password: e.target.value })} placeholder="min 6 characters" />
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(4)} disabled={!owner.name || !owner.email || owner.password.length < 6}
              className="flex-1 bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Check size={15} className="text-[#CC0000]" /> Review & Confirm
          </h2>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Company</div>
            <div className="font-semibold text-gray-900 text-sm">{company.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{company.contact} · {company.email}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Stores ({stores.filter(s => s.storeId).length})
            </div>
            {stores.filter(s => s.storeId).map((s, i) => (
              <div key={i} className="text-sm text-gray-700">#{s.storeId} — {s.town} ({s.region}) · {s.manager}</div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Franchise Owner</div>
            <div className="font-semibold text-gray-900 text-sm">{owner.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{owner.email}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={onSubmit} disabled={saving}
              className="flex-1 bg-[#CC0000] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Everything'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
