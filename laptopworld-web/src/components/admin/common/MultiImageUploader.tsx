import { useRef, useState } from 'react'
import { api, type ApiResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { productImageSrc } from '@/lib/format'
import { Upload, Trash2, Star, Loader2, ImagePlus, Move } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ProductImageInput } from '@/hooks/api/useAdminProducts'

interface UploadResponse {
  path: string
  url: string
  filename: string
  size: number
  contentType: string
}

interface Props {
  value: ProductImageInput[]
  onChange: (v: ProductImageInput[]) => void
  folder?: string
  maxSizeMB?: number
  className?: string
}

/**
 * Upload nhiều ảnh cho product. Value là mảng ProductImageInput.
 * - Upload multiple files 1 lần.
 * - Grid thumbnail: ⭐ set primary, 🗑 xóa, ← → reorder.
 * - Ảnh đầu tiên upload nếu chưa có primary → auto primary.
 */
export function MultiImageUploader({
  value, onChange, folder = 'products', maxSizeMB = 5, className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const doUpload = async (files: FileList) => {
    setUploading(true)
    try {
      const uploaded: ProductImageInput[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}: chỉ chấp nhận file ảnh`)
          continue
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name}: vượt quá ${maxSizeMB}MB`)
          continue
        }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', folder)
        try {
          const { data } = await api.post<ApiResponse<UploadResponse>>(
            '/admin/media/upload', fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          )
          if (data.success && data.data) {
            uploaded.push({
              path: data.data.path,
              alt: file.name,
              sortOrder: value.length + uploaded.length,
              isPrimary: false,
            })
          } else {
            toast.error(`${file.name}: ${data.message || 'thất bại'}`)
          }
        } catch (e) {
          toast.error(`${file.name}: ${(e as Error).message}`)
        }
      }
      if (uploaded.length === 0) return

      const next = [...value, ...uploaded]
      // Nếu chưa có primary, set ảnh đầu tiên làm primary
      if (!next.some((img) => img.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true }
      }
      onChange(next)
      toast.success(`Đã tải lên ${uploaded.length} ảnh`)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const setPrimary = (idx: number) => {
    const next = value.map((img, i) => ({ ...img, isPrimary: i === idx }))
    onChange(next)
  }

  const remove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    // Nếu ảnh bị xóa là primary → set ảnh đầu tiên còn lại
    if (value[idx].isPrimary && next.length > 0 && !next.some((img) => img.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true }
    }
    // Re-sort
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })))
  }

  const moveLeft = (idx: number) => {
    if (idx === 0) return
    const next = [...value]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })))
  }
  const moveRight = (idx: number) => {
    if (idx >= value.length - 1) return
    const next = [...value]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Ảnh sản phẩm ({value.length})
        </div>
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Đang tải...</>
            : <><Upload className="mr-2 h-3 w-3" />Tải ảnh lên</>}
        </Button>
        <input
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) doUpload(e.target.files)
          }}
        />
      </div>

      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed py-8 text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm">Bấm để chọn ảnh (nhiều file)</span>
          <span className="text-xs">Tối đa {maxSizeMB}MB/ảnh, PNG/JPG/WebP</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((img, idx) => (
            <div
              key={idx}
              className={cn(
                'group relative overflow-hidden rounded-md border-2 transition',
                img.isPrimary ? 'border-primary shadow' : 'border-transparent hover:border-border'
              )}
            >
              <img
                src={productImageSrc(img.path)}
                alt={img.alt || ''}
                className="aspect-square w-full object-cover"
              />
              {img.isPrimary && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" /> Chính
                </div>
              )}
              {/* Actions overlay */}
              <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button" title="Ảnh trước"
                  onClick={() => moveLeft(idx)} disabled={idx === 0}
                  className="grid h-6 w-6 place-items-center rounded bg-white/90 text-black transition hover:bg-white disabled:opacity-30"
                >
                  <Move className="h-3 w-3 -rotate-90" />
                </button>
                <button
                  type="button" title="Đặt làm ảnh chính"
                  onClick={() => setPrimary(idx)}
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded transition',
                    img.isPrimary ? 'bg-primary text-white' : 'bg-white/90 text-black hover:bg-white'
                  )}
                >
                  <Star className={cn('h-3 w-3', img.isPrimary && 'fill-current')} />
                </button>
                <button
                  type="button" title="Ảnh sau"
                  onClick={() => moveRight(idx)} disabled={idx >= value.length - 1}
                  className="grid h-6 w-6 place-items-center rounded bg-white/90 text-black transition hover:bg-white disabled:opacity-30"
                >
                  <Move className="h-3 w-3 rotate-90" />
                </button>
                <button
                  type="button" title="Xóa"
                  onClick={() => remove(idx)}
                  className="grid h-6 w-6 place-items-center rounded bg-destructive text-destructive-foreground transition hover:bg-destructive/90"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
