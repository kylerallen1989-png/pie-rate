import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import CutTableDashboard from './pages/CutTableDashboard'
import AuditDashboard from './pages/AuditDashboard'
import Grade from './pages/Grade'
import Locations from './pages/Locations'
import Reports from './pages/Reports'
import Kiosk from './pages/Kiosk'
import StoreView from './pages/StoreView'
import SuperAdmin from './pages/SuperAdmin'
import FranchiseAdmin from './pages/FranchiseAdmin'

const Loader = () => <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'store') return <Navigate to="/store" replace />
  return <>{children}</>
}

function StoreRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'store') return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function FranchiseRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'franchise_owner') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/kiosk/:storeId" element={<Kiosk />} />
        <Route path="/store" element={<StoreRoute><StoreView /></StoreRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<CutTableDashboard />} />
          <Route path="audits" element={<AuditDashboard />} />
          <Route path="grade" element={<Grade />} />
          <Route path="locations" element={<Locations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="admin" element={<AdminRoute><SuperAdmin /></AdminRoute>} />
          <Route path="franchise-admin" element={<FranchiseRoute><FranchiseAdmin /></FranchiseRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App