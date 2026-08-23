import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { AdminMobileSidebar } from './AdminMobileSidebar'
import { AdminTopbar } from './AdminTopbar'

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <AdminMobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
