import { useRef, useState } from 'react'
import { api, type ApiResponse } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { productImageSrc } from '@/lib/format'
import { Upload, Trash2, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadResponse {
  path: string
  url: string
  filename: string
  size: number
  contentType: string
}

interface Props {
  value?: string | null
  onChange: (path: string | null) => void
  folder?: string
  label?: string
  maxSizeMB?: number
  className?: string
}

/**
 * Upload 1 ảnh sang /api/admin/media/upload. Value là path trả về từ backend
 * (VD: /uploads/products/xxx.jpg). Có preview + nút thay/xóa.
 */
export function MediaUploader({
  value, onChange, folder = 'products', label = 'Ảnh',
  maxSizeMB = 5, className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File vượt quá ${maxSizeMB}MB`)
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    setUploading(true)
    try {
      const { data } = await api.post<ApiResponse<UploadResponse>>(
        '/admin/media/upload', fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      if (!data.success || !data.data) {
        toast.error(data.message || 'Upload thất bại')
        return
      }
      onChange(data.data.path)
      toast.success('Upload thành công')
    } catch (e) {
      toast.error('Upload thất bại: ' + (e as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="text-sm font-medium">{label}</div>
      )}
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <div className="group relative">
            <img
              src={productImageSrc(value)}
              alt=""
              className="h-24 w-24 rounded-md border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Xóa ảnh"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-md border border-dashed text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doUpload(f)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Đang tải...</>
              : <><Upload className="mr-2 h-3 w-3" />{value ? 'Đổi ảnh' : 'Tải ảnh lên'}</>}
          </Button>
          <div className="text-xs text-muted-foreground">
            Tối đa {maxSizeMB}MB, PNG/JPG/WebP
          </div>
        </div>
      </div>
    </div>
  )
}
