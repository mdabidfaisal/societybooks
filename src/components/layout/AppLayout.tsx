import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '../../store/uiStore'

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
        <footer className="h-8 border-t border-gray-200 bg-white flex items-center justify-center px-4 text-xs text-gray-400">
          Powered by <a href="https://www.codeprophet.tech" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">Code Prophet Inc.</a>
        </footer>
      </div>
    </div>
  )
}
