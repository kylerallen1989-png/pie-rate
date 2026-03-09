import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ClipboardList, Camera, MapPin, FileText, LogOut } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Cut Table' },
    { to: '/audits', icon: ClipboardList, label: 'Audits' },
    { to: '/grade', icon: Camera, label: 'Grade' },
    { to: '/locations', icon: MapPin, label: 'Locations' },
    { to: '/reports', icon: FileText, label: 'Reports' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#CC0000] text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍕</span>
          <div>
            <div className="font-bold text-base leading-tight">Pie-Rate</div>
            <div className="text-xs opacity-75 leading-tight">Pizza Quality Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium">{user?.name}</div>
            <div className="text-xs opacity-75 capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-all " +
                (isActive ? "text-[#CC0000]" : "text-gray-400 hover:text-gray-600")
              }
            >
              {({ isActive }) => (
                <>
                  <div className={"p-1 rounded-lg transition " + (isActive ? "bg-red-50" : "")}>
                    <Icon size={20} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}