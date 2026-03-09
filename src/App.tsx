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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/kiosk/:storeId" element={<Kiosk />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<CutTableDashboard />} />
          <Route path="audits" element={<AuditDashboard />} />
          <Route path="grade" element={<Grade />} />
          <Route path="locations" element={<Locations />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App