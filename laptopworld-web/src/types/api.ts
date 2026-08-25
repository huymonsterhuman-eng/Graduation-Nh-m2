/**
 * Types map với response backend LaptopWorld.
 * Không cần tuyệt đối chính xác từng field, chỉ cần đủ dùng ở frontend.
 */

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// ==================== Catalog ====================
export interface ProductListItem {
  id: number
  name: string
  slug: string
  shortDescription?: string
  price: number
  salePrice?: number
  primaryImage?: string
  categoryName?: string
  brandName?: string
  stock: number
  availableStock: number
  isFeatured: boolean
  avgRating?: number
  reviewCount: number
}

export interface BrandRef {
  id: number
  name: string
  slug: string
  logo?: string
}

export interface CategoryRef {
  id: number
  name: string
  slug: string
}

export interface ImageRef {
  id: number
  path: string
  alt?: string
  sortOrder: number
  isPrimary: boolean
}

export interface ProductDetail {
  id: number
  name: string
  slug: string
  sku?: string
  shortDescription?: string
  description?: string
  price: number
  salePrice?: number
  specs?: Record<string, unknown>
  stock: number
  views: number
  isFeatured: boolean
  isActive: boolean
  brand?: BrandRef
  category?: CategoryRef
  images: ImageRef[]
  avgRating?: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

export interface SpecField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | string
  required?: boolean
  unit?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  parentId?: number
  parentName?: string
  image?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  specTemplate?: SpecField[]
  children?: Category[]
  createdAt?: string
  updatedAt?: string
}

export interface Collection {
  id: number
  name: string
  slug: string
  image?: string
  description?: string
  parentId?: number
  isActive: boolean
  showOnHome: boolean
  sortOrder: number
  productCount: number
  createdAt?: string
  updatedAt?: string
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo?: string
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  productCount?: number
}

// ==================== Review ====================
export interface Review {
  id: number
  userId: number
  username: string
  userFullName?: string
  productId: number
  productName: string
  rating: number
  comment?: string
  image?: string
  isHidden: boolean
  adminReply?: string
  createdAt: string
  updatedAt: string
}

// ==================== Roles & Permissions ====================
export interface PermissionMeta {
  code: string
  label: string
  groupName: string
}

export interface RoleListItem {
  id: number
  name: string
  description?: string
  permissionCount: number
  userCount: number
  createdAt: string
}

export interface RoleDetail {
  id: number
  name: string
  description?: string
  permissions: string[]
  userCount: number
  createdAt: string
  updatedAt: string
}

// ==================== Admin Users ====================
export type AdminUserStatus = 'active' | 'banned' | 'unverified'

export interface AdminUserListItem {
  id: number
  username: string
  email: string
  emailVerified: boolean
  fullName?: string
  phone?: string
  avatar?: string
  status: AdminUserStatus
  roleNames: string[]
  createdAt: string
}

export interface AdminUserRoleRef {
  id: number
  name: string
  description?: string
}

export interface AdminUserStats {
  orderCount: number
  reviewCount: number
  totalSpent: number
}

export interface AdminUserVoucherItem {
  id: number
  code: string
  name: string
  type: 'fixed' | 'percent'
  discountAmount: number
  minOrderValue: number
  maxDiscount?: number | null
  startedAt?: string
  expiresAt?: string
  isUsed: boolean
  usedAt?: string
  orderId?: number | null
  savedAt: string
}

export interface AdminUserStatsSummary {
  total: number
  active: number
  banned: number
  unverified: number
  newThisWeek: number
}

export interface AdminUserDetail {
  id: number
  username: string
  email: string
  emailVerified: boolean
  emailVerifiedAt?: string
  fullName?: string
  phone?: string
  avatar?: string
  gender?: string
  birthday?: string
  status: AdminUserStatus
  roles: AdminUserRoleRef[]
  stats: AdminUserStats
  createdAt: string
  updatedAt: string
}

// ==================== Banner ====================
export interface Banner {
  id: number
  title?: string
  image: string
  link?: string
  sortOrder: number
  isActive: boolean
  /** Slot hiển thị: hero_carousel | sidebar_phone | sidebar_laptop | ... */
  position?: string | null
  /** Cách hiển thị ảnh: 'cover' (crop lấp đầy) | 'contain' (fit toàn ảnh). */
  imageFit?: 'cover' | 'contain'
  authorId?: number
  authorName?: string
  createdAt: string
  updatedAt: string
}

/** Danh sách slot chuẩn — dùng cho dropdown admin và query FE. */
export const BANNER_POSITIONS = [
  { value: 'hero_carousel', label: 'Carousel chính (đầu trang)' },
  { value: 'sidebar_phone', label: 'Sidebar khu Điện thoại' },
  { value: 'sidebar_laptop', label: 'Sidebar khu Laptop' },
] as const

// ==================== Blog ====================
export interface PostCategory {
  id: number
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface PostListItem {
  id: number
  title: string
  slug: string
  image?: string
  excerpt?: string
  postCategoryId?: number
  postCategoryName?: string
  authorName?: string
  isPublished: boolean
  publishedAt?: string
  views: number
  createdAt: string
}

export interface PostDetail extends PostListItem {
  content?: string
  postCategorySlug?: string
  authorId?: number
  updatedAt: string
}

// ==================== Semantic search ====================
export interface SearchResult {
  product: ProductListItem
  similarity: number
}

// ==================== Cart ====================
export interface CartItem {
  id: number
  productId: number
  productName: string
  productSlug: string
  productImage?: string
  quantity: number
  priceSnapshot: number
  currentPrice: number
  priceChanged: boolean
  lineTotal: number
  stockAvailable: number
  productActive: boolean
}

export interface Cart {
  id: number
  items: CartItem[]
  itemCount: number
  subtotal: number
  updatedAt: string
}

// ==================== Address ====================
export interface Address {
  id: number
  name: string
  phone: string
  address: string
  ward?: string
  district?: string
  province?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ==================== Voucher ====================
export type VoucherType = 'fixed' | 'percent'

export interface Voucher {
  id: number
  code: string
  name: string
  type: VoucherType
  discountAmount: number
  minOrderValue: number
  maxDiscount?: number
  startedAt?: string
  expiresAt?: string
  usageLimit?: number
  usedCount: number
  isActive: boolean
  isSaved?: boolean
  createdAt: string
  updatedAt: string
}

export interface VoucherCheckResult {
  valid: boolean
  code: string
  subtotal: number
  discount: number
  totalAfterDiscount: number
  message: string
}

// ==================== Order ====================
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cod' | 'vnpay' | 'momo'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface OrderListItem {
  id: number
  code: string
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  itemCount: number
  partnerId?: number | null
  shippingMethod?: string | null
  createdAt: string
}

export interface OrderItem {
  id: number
  productId: number
  productName: string
  productImage?: string
  quantity: number
  priceAtPurchase: number
  lineTotal: number
}

export interface OrderDetail {
  id: number
  code: string
  userId: number
  username: string
  subtotal: number
  discountAmount: number
  shippingFee: number
  total: number
  shippingName?: string
  shippingAddress?: string
  shippingPhone?: string
  shippingMethod?: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  voucherCode?: string
  trackingNumber?: string
  adminNote?: string
  paymentTransactionRef?: string
  preparingAt?: string
  paidAt?: string
  deliveredAt?: string
  cancelledAt?: string
  createdAt: string
  items: OrderItem[]
}

/** Response từ POST /api/checkout — có kèm paymentUrl khi paymentMethod=vnpay. */
export interface CheckoutResponse {
  order: OrderDetail
  paymentUrl?: string | null
}

/** Response từ GET /api/payments/vnpay/return — dùng ở VnpayReturnPage. */
export interface VnpayReturnResult {
  orderCode: string
  responseCode: string
  transactionStatus: string
  transactionNo?: string
  amount?: string
  checksumValid: boolean
  success: boolean
}

// ==================== Partner + Inventory (Sprint 9E) ====================

export type PartnerType = 'supplier' | 'shipping_provider'
export type GoodsIssueType = 'auto' | 'manual'
export type GoodsIssueStatus = 'pending' | 'completed' | 'cancelled'

export interface Partner {
  id: number
  name: string
  code: string
  type: PartnerType
  phone?: string
  email?: string
  address?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface GoodsReceiptDetail {
  id: number
  productId: number
  productName: string
  productImage?: string
  quantity: number
  remainingQuantity: number
  importPrice: number
  totalPrice: number
}

export interface GoodsReceiptListItem {
  id: number
  code: string
  supplierName?: string
  userFullName?: string
  totalAmount: number
  note?: string
  createdAt: string
}

export interface GoodsReceipt {
  id: number
  code: string
  supplierId: number
  supplierName?: string
  userId?: number
  userFullName?: string
  totalAmount: number
  note?: string
  items: GoodsReceiptDetail[]
  createdAt: string
  updatedAt?: string
}

export interface GoodsIssueDetail {
  id: number
  productId: number
  productName: string
  productImage?: string
  goodsReceiptDetailId?: number
  goodsReceiptCode?: string
  quantity: number
  importPrice: number
  totalPrice: number
}

export interface GoodsIssueListItem {
  id: number
  code: string
  orderCode?: string
  type: GoodsIssueType
  status: GoodsIssueStatus
  authorName?: string
  totalCogs: number
  createdAt: string
}

export interface GoodsIssue {
  id: number
  code: string
  orderId?: number
  orderCode?: string
  type: GoodsIssueType
  status: GoodsIssueStatus
  authorId?: number
  authorName?: string
  totalCogs: number
  note?: string
  items: GoodsIssueDetail[]
  createdAt: string
  updatedAt?: string
}

export interface Batch {
  goodsReceiptDetailId: number
  goodsReceiptId: number
  goodsReceiptCode?: string
  supplierId?: number
  supplierName?: string
  quantity: number
  remainingQuantity: number
  importPrice: number
  importedAt: string
}

export interface ProductStockSummary {
  productId: number
  productName: string
  productSku?: string
  cachedStock: number
  totalRemaining: number
  batchCount: number
  batches: Batch[]
}
