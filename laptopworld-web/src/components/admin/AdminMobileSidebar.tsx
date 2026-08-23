import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ADMIN_NAV, type AdminNavItem } from './adminNav'
import { useAdminUi } from '@/stores/adminUi'
import { usePendingCounts } from '@/hooks/api/useAdminDashboard'
import { useAuthStore } from '@/stores/auth'

function badgeFor(item: AdminNavItem, counts?: {
  ordersPending: number; ordersPreparing: number; goodsIssuesPending: number
}): number {
  if (!counts) return 0
  switch (item.badgeKey) {
    case 'ordersPending': return counts.ordersPending
    case 'ordersPreparing': return counts.ordersPreparing
    case 'goodsIssuesPending': return counts.goodsIssuesPending
    case 'ordersSales': return counts.ordersPending + counts.ordersPreparing
    default: return 0
  }
}

export function AdminMobileSidebar() {
  const open = useAdminUi((s) => s.mobileOpen)
  const setOpen = useAdminUi((s) => s.setMobileOpen)
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  const { data: counts } = usePendingCounts(isAdmin)

  const canSee = (item: AdminNavItem): boolean => {
    if (item.requiredPermission) return hasPermission(item.requiredPermission)
    if (item.requiredAnyPermission && item.requiredAnyPermission.length > 0) {
      return hasAnyPermission(...item.requiredAnyPermission)
    }
    return true
  }
  const visibleGroups = ADMIN_NAV
    .map((g) => ({ ...g, items: g.items.filter(canSee) }))
    .filter((g) => g.items.length > 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-14 border-b px-4">
          <SheetTitle className="flex items-center gap-2 text-left text-base">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs">
              LW
            </span>
            LaptopWorld <span className="text-muted-foreground">Admin</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="overflow-y-auto px-2 py-3">
          {visibleGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="admin-nav-group-title mb-2 mt-1 flex items-center gap-2 border-b border-border/60 px-2 pb-1.5 uppercase">
                <span className="text-base leading-none">{group.emoji}</span>
                <span>{group.title}</span>
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const badge = badgeFor(item, counts)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'admin-nav-link flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition',
                            isActive && 'is-active'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-[20px] justify-center px-1 text-[10px]">
                            {badge}
                          </Badge>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
