import { NavLink, Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

export function AdminSidebar() {
  const collapsed = useAdminUi((s) => s.sidebarCollapsed)
  const toggle = useAdminUi((s) => s.toggleCollapsed)
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  const { data: counts } = usePendingCounts(isAdmin)

  const canSee = (item: AdminNavItem): boolean => {
    if (item.requiredPermission) return hasPermission(item.requiredPermission)
    if (item.requiredAnyPermission && item.requiredAnyPermission.length > 0) {
      return hasAnyPermission(...item.requiredAnyPermission)
    }
    return true  // menu không gắn permission → ai vào admin cũng thấy
  }

  const visibleGroups = ADMIN_NAV
    .map((g) => ({ ...g, items: g.items.filter(canSee) }))
    .filter((g) => g.items.length > 0)

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r bg-card transition-[width] duration-200 lg:flex lg:flex-col',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Brand */}
        <div className={cn(
          'flex h-14 items-center gap-2 border-b px-3',
          collapsed && 'justify-center px-0'
        )}>
          <Link to="/admin" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              LW
            </span>
            {!collapsed && <span className="text-sm">LaptopWorld <span className="text-muted-foreground">Admin</span></span>}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {visibleGroups.map((group) => (
            <div key={group.title} className="mb-4">
              {!collapsed && (
                <div className="admin-nav-group-title mb-2 mt-1 flex items-center gap-2 border-b border-border/60 px-2 pb-1.5 uppercase">
                  <span className="text-base leading-none">{group.emoji}</span>
                  <span>{group.title}</span>
                </div>
              )}
              {collapsed && (
                <div className="mb-1 flex justify-center py-1 text-lg leading-none">
                  {group.emoji}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const badge = badgeFor(item, counts)
                  return (
                    <li key={item.to}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                              cn(
                                'admin-nav-link group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition',
                                isActive && 'is-active',
                                collapsed && 'justify-center px-0'
                              )
                            }
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                            {!collapsed && badge > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] justify-center px-1 text-[10px]">
                                {badge}
                              </Badge>
                            )}
                            {collapsed && badge > 0 && (
                              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            {item.label}{badge > 0 ? ` (${badge})` : ''}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Toggle collapse */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn('w-full', collapsed && 'justify-center px-0')}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span className="ml-2">Thu gọn</span></>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
