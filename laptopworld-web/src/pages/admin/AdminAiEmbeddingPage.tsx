import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Sparkles, Database, CheckCircle2, CircleAlert, RefreshCw, Play, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader'
import { AdminTable, type AdminColumn } from '@/components/admin/common/AdminTable'
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog'
import { KpiCard } from '@/components/admin/dashboard/KpiCard'
import {
  useAdminProducts, useEmbeddingStats, useReembedAll, useReembedProduct,
  type EmbedResult,
} from '@/hooks/api/useAdminProducts'
import { formatDate } from '@/lib/format'
import type { ProductListItem } from '@/types/api'

export function AdminAiEmbeddingPage() {
  const { data: stats, isLoading: statsLoading } = useEmbeddingStats()
  const { data: recent, isLoading: recentLoading } = useAdminProducts({ page: 0, size: 20 })

  const reembedAll = useReembedAll()
  const reembedOne = useReembedProduct()

  const [busyId, setBusyId] = useState<number | null>(null)

  const active = stats?.activeProducts ?? 0
  const embedded = stats?.embedded ?? 0
  const pending = stats?.pending ?? 0
  const coverage = active > 0 ? Math.round((embedded / active) * 100) : 0

  const runEmbedNew = () => {
    toast.promise(reembedAll.mutateAsync(false), {
      loading: 'Đang embed sản phẩm mới...',
      success: (r: EmbedResult) =>
        `Xong: ${r.embedded ?? 0} embed, ${r.skipped ?? 0} bỏ qua, ${r.failed ?? 0} lỗi (${r.durationMs ?? 0}ms)`,
      error: (e: Error) => e.message || 'Embed thất bại',
    })
  }

  const runReembedAll = async () => {
    const p = reembedAll.mutateAsync(true)
    toast.promise(p, {
      loading: 'Đang re-embed toàn bộ sản phẩm...',
      success: (r: EmbedResult) =>
        `Xong: ${r.embedded ?? 0} embed, ${r.skipped ?? 0} bỏ qua, ${r.failed ?? 0} lỗi (${r.durationMs ?? 0}ms)`,
      error: (e: Error) => e.message || 'Embed thất bại',
    })
    try { await p } catch { /* toast đã báo lỗi */ }
  }

  const runReembedOne = (id: number) => {
    setBusyId(id)
    toast.promise(reembedOne.mutateAsync(id), {
      loading: 'Đang re-embed sản phẩm...',
      success: (r: EmbedResult) =>
        `Đã re-embed "${r.productName}" (${r.dimensions} chiều · ${r.durationMs}ms)`,
      error: (e: Error) => e.message || 'Re-embed thất bại',
      finally: () => setBusyId(null),
    })
  }

  const columns: AdminColumn<ProductListItem>[] = [
    {
      key: 'id', header: 'ID', className: 'w-16',
      cell: (p) => <span className="font-mono text-xs text-muted-foreground">#{p.id}</span>,
    },
    {
      key: 'name', header: 'Tên sản phẩm',
      cell: (p) => (
        <Link to={`/admin/san-pham/${p.id}/sua`} className="font-medium hover:underline">
          {p.name}
        </Link>
      ),
    },
    {
      key: 'category', header: 'Danh mục', className: 'w-40',
      cell: (p) => (
        <span className="text-sm text-muted-foreground">
          {p.categoryName ?? <span className="italic">—</span>}
        </span>
      ),
    },
    {
      key: 'brand', header: 'Thương hiệu', className: 'w-32',
      cell: (p) => (
        <span className="text-sm text-muted-foreground">
          {p.brandName ?? <span className="italic">—</span>}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Thao tác', align: 'right', className: 'w-40',
      cell: (p) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runReembedOne(p.id)}
            disabled={busyId === p.id || reembedAll.isPending}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
            {busyId === p.id ? 'Đang chạy...' : 'Re-embed'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="AI Embedding"
        icon={Sparkles}
        sprint="Sprint 9G · Bước C"
        description="Quản lý pipeline embedding sản phẩm cho semantic search + RAG chatbot."
        actions={
          <div className="flex gap-2">
            <Button onClick={runEmbedNew} disabled={reembedAll.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Embed sản phẩm mới
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={reembedAll.isPending}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-embed toàn bộ
                </Button>
              }
              title="Re-embed toàn bộ sản phẩm?"
              description={
                <span>
                  Thao tác này sẽ gọi Gemini embedding cho <b>{active}</b> sản phẩm đang bán —
                  bỏ qua kiểm tra hash nội dung. Có thể mất vài phút và tốn quota API.
                  <br />
                  Chỉ nên chạy khi vừa đổi model embedding hoặc muốn refresh index hoàn toàn.
                </span>
              }
              confirmLabel="Re-embed toàn bộ"
              destructive={false}
              onConfirm={runReembedAll}
            />
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Sản phẩm đang bán"
          icon={Database}
          value={active.toLocaleString('vi-VN')}
          hint="Tổng SP active có thể embed"
          loading={statsLoading}
        />
        <KpiCard
          label="Đã embed"
          icon={CheckCircle2}
          color="success"
          value={embedded.toLocaleString('vi-VN')}
          hint={`Bao phủ ${coverage}% catalog`}
          loading={statsLoading}
        />
        <KpiCard
          label="Chưa embed"
          icon={CircleAlert}
          color={pending > 0 ? 'warning' : 'success'}
          value={pending.toLocaleString('vi-VN')}
          hint={pending > 0 ? 'Bấm "Embed sản phẩm mới" để xử lý' : 'Toàn bộ đã đồng bộ'}
          loading={statsLoading}
        />
      </div>

      {/* Note giải thích */}
      <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-900 dark:text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <b>Cách hoạt động:</b> mỗi SP được nhồi text (tên + mô tả + brand + category + specs + giá)
          rồi gọi Gemini <code className="rounded bg-sky-500/10 px-1">gemini-embedding-001</code> sinh
          vector 768 chiều. Vector lưu vào <code className="rounded bg-sky-500/10 px-1">product_embeddings</code>
          (pgvector HNSW). Semantic search + AI Agent tool <code className="rounded bg-sky-500/10 px-1">search_products</code>
          {' '}dùng chung index này.
          <br />
          <b>Skip check:</b> mỗi SP có <code className="rounded bg-sky-500/10 px-1">source_hash</code> SHA-256 —
          nếu nội dung không đổi, "Embed SP mới" sẽ bỏ qua để tiết kiệm quota.
        </div>
      </div>

      {/* Table 20 SP mới nhất */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Sản phẩm mới nhất</h2>
          <span className="text-xs text-muted-foreground">
            Bấm "Re-embed" trên từng SP nếu vừa sửa mô tả hoặc thông số
          </span>
        </div>
        <AdminTable<ProductListItem>
          columns={columns}
          data={recent?.content}
          rowKey={(p) => p.id}
          isLoading={recentLoading}
          emptyMessage="Chưa có sản phẩm nào"
          toolbar={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Top 20 mới nhất</Badge>
              <span>·</span>
              <Link to="/admin/san-pham" className="hover:underline">Xem toàn bộ →</Link>
            </div>
          }
        />
      </div>
    </div>
  )
}
