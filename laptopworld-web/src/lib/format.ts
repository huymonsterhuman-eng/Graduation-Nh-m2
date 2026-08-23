/** Format tiền VND. */
export function formatPrice(value: number | string | null | undefined): string {
  if (value == null) return '0₫'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '0₫'
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

/** Ảnh product: nếu path bắt đầu bằng "/uploads" giữ nguyên (vite proxy), nếu null trả placeholder. */
export function productImageSrc(path: string | null | undefined): string {
  if (!path) return '/placeholder-product.svg'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return path.startsWith('/') ? path : `/${path}`
}

/** % giảm giá (nếu có sale). */
export function discountPercent(price: number, salePrice?: number | null): number {
  if (!salePrice || salePrice >= price) return 0
  return Math.round((1 - salePrice / price) * 100)
}

/** Format timestamp cho chat message — "HH:mm" nếu cùng ngày, ngày ngắn nếu khác. */
export function formatChatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** Format ngày dd/MM/yyyy. */
export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Format ngày giờ dd/MM/yyyy HH:mm. */
export function formatDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Rút tiền dạng compact "12,3 tr" / "1,2 tỷ". */
export function formatPriceCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0₫'
  const n = Math.abs(value)
  if (n >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace('.', ',') + ' tỷ'
  if (n >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + ' tr'
  if (n >= 1_000) return (value / 1_000).toFixed(0) + 'k'
  return formatPrice(value)
}

/** Chuyển Date → yyyy-MM-dd cho query param. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Tạo range yyyy-MM-dd cho N ngày gần nhất (bao gồm hôm nay). */
export function lastNDaysRange(n: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (n - 1))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

/** Range của tháng hiện tại (từ ngày 1 đến hôm nay). */
export function thisMonthRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

