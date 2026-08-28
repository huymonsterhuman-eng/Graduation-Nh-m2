import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Layers,
  ShoppingBag,
  Ticket,
  ArchiveRestore,
  PackageMinus,
  Boxes,
  ClipboardCheck,
  Handshake,
  Newspaper,
  BookmarkPlus,
  Images,
  Star,
  Sparkles,
  MessageSquareText,
  Users,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badgeKey?: 'ordersPending' | 'ordersPreparing' | 'goodsIssuesPending' | 'ordersSales'
  /** Permission cần có để thấy menu. ADMIN bypass. Bỏ trống = ai vào admin cũng thấy. */
  requiredPermission?: string
  /** Hoặc yêu cầu ít nhất 1 trong nhiều permission. */
  requiredAnyPermission?: string[]
}

export interface AdminNavGroup {
  emoji: string
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    emoji: '📊',
    title: 'Tổng quan',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, requiredPermission: 'view_reports' },
    ],
  },
  {
    emoji: '📦',
    title: 'Sản phẩm (Catalog)',
    items: [
      { to: '/admin/san-pham', label: 'Sản phẩm', icon: Package, requiredPermission: 'view_products' },
      { to: '/admin/danh-muc', label: 'Danh mục', icon: FolderTree, requiredPermission: 'view_categories' },
      { to: '/admin/thuong-hieu', label: 'Thương hiệu', icon: Tags, requiredPermission: 'view_brands' },
      { to: '/admin/bo-suu-tap', label: 'Bộ sưu tập', icon: Layers, requiredPermission: 'manage_collections' },
    ],
  },
  {
    emoji: '🛒',
    title: 'Kinh doanh (Sales)',
    items: [
      { to: '/admin/don-hang', label: 'Đơn hàng', icon: ShoppingBag, badgeKey: 'ordersSales', requiredPermission: 'view_orders' },
      { to: '/admin/voucher', label: 'Voucher', icon: Ticket, requiredPermission: 'view_vouchers' },
    ],
  },
  {
    emoji: '🏭',
    title: 'Kho & Vận chuyển',
    items: [
      { to: '/admin/phieu-nhap', label: 'Phiếu nhập', icon: ArchiveRestore, requiredPermission: 'manage_goods_receipt' },
      { to: '/admin/phieu-xuat', label: 'Phiếu xuất', icon: PackageMinus, badgeKey: 'goodsIssuesPending', requiredPermission: 'manage_goods_issue' },
      { to: '/admin/ton-kho', label: 'Tồn kho', icon: Boxes, requiredPermission: 'view_inventory' },
      { to: '/admin/kiem-toan-kho', label: 'Kiểm toán tồn kho', icon: ClipboardCheck, requiredPermission: 'view_inventory' },
      { to: '/admin/doi-tac', label: 'Đối tác', icon: Handshake, requiredAnyPermission: ['view_partners', 'manage_partners'] },
    ],
  },
  {
    emoji: '📝',
    title: 'Nội dung',
    items: [
      { to: '/admin/bai-viet', label: 'Bài viết', icon: Newspaper, requiredPermission: 'manage_posts' },
      { to: '/admin/danh-muc-bai', label: 'Danh mục bài', icon: BookmarkPlus, requiredPermission: 'manage_posts' },
      { to: '/admin/banner', label: 'Banner', icon: Images, requiredPermission: 'manage_banners' },
      { to: '/admin/danh-gia', label: 'Đánh giá', icon: Star, requiredPermission: 'view_reviews' },
    ],
  },
  {
    emoji: '🤖',
    title: 'AI',
    items: [
      { to: '/admin/ai/embedding', label: 'Embedding', icon: Sparkles, requiredPermission: 'manage_ai_embedding' },
      { to: '/admin/ai/chat', label: 'Chat sessions', icon: MessageSquareText, requiredPermission: 'manage_ai_embedding' },
    ],
  },
  {
    emoji: '🔐',
    title: 'Hệ thống',
    items: [
      { to: '/admin/nguoi-dung', label: 'Người dùng', icon: Users, requiredPermission: 'view_users' },
      { to: '/admin/vai-tro', label: 'Vai trò & Phân quyền', icon: ShieldCheck, requiredPermission: 'manage_roles' },
    ],
  },
]

/**
 * Tra tiêu đề breadcrumb theo pathname. Trả về:
 *   { groupTitle, itemLabel } hoặc null nếu không khớp.
 */
export function findNavByPath(pathname: string): { groupTitle: string; itemLabel: string } | null {
  for (const g of ADMIN_NAV) {
    for (const item of g.items) {
      if (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/')) {
        return { groupTitle: g.title, itemLabel: item.label }
      }
    }
  }
  return null
}
