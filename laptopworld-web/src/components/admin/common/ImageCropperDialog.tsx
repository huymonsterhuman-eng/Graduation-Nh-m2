import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { toast } from 'sonner'
import { Loader2, Crop as CropIcon, RotateCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api, type ApiResponse } from '@/lib/api'

interface UploadResponse {
  path: string
  url: string
  filename: string
  size: number
  contentType: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** URL đầy đủ (đã qua productImageSrc) của ảnh gốc để crop */
  imageSrc: string
  /** Tỷ lệ khung crop (width / height). VD 3/4 cho sidebar, 3/1 cho hero carousel */
  aspect: number
  /** Folder upload để lưu ảnh sau crop */
  folder?: string
  /** Callback khi crop xong: trả về path mới (VD /uploads/banners/xxx.jpg) */
  onSaved: (newPath: string) => void
}

/**
 * Dialog cho admin crop ảnh banner: kéo khung + zoom + xoay 90°.
 * Sau khi bấm Áp dụng: cắt canvas → upload sang /admin/media/upload → trả về path mới.
 */
export function ImageCropperDialog({
  open, onOpenChange, imageSrc, aspect, folder = 'banners', onSaved,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx)
  }, [])

  const reset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
  }

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      toast.error('Vui lòng chọn vùng crop')
      return
    }
    setSaving(true)
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels, rotation)
      const file = new File([blob], `banner-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      const { data } = await api.post<ApiResponse<UploadResponse>>(
        '/admin/media/upload', fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      if (!data.success || !data.data) {
        toast.error(data.message || 'Upload ảnh đã crop thất bại')
        return
      }
      onSaved(data.data.path)
      toast.success('Đã cắt và cập nhật ảnh banner')
      onOpenChange(false)
      reset()
    } catch (e) {
      toast.error('Lỗi crop: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-4 w-4" />
            Cắt ảnh banner (tỷ lệ {aspect >= 1 ? `${aspect.toFixed(2)}:1` : `1:${(1 / aspect).toFixed(2)}`})
          </DialogTitle>
          <DialogDescription>
            Kéo để dịch chuyển, cuộn chuột (hoặc thanh trượt) để zoom. Vùng trong khung sáng là phần sẽ hiển thị.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[420px] w-full overflow-hidden rounded-md bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="zoom" className="flex items-center justify-between">
              <span>Zoom</span>
              <span className="font-mono text-xs text-muted-foreground">{zoom.toFixed(2)}x</span>
            </Label>
            <input
              id="zoom"
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rotation" className="flex items-center justify-between">
              <span>Xoay</span>
              <span className="font-mono text-xs text-muted-foreground">{rotation}°</span>
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="rotation"
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Xoay 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={reset} disabled={saving}>
            Đặt lại
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={handleApply} disabled={saving || !croppedAreaPixels}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý...</>
              : 'Áp dụng crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Helpers: crop canvas → JPEG blob (không dùng bất kỳ thư viện ngoài nào)
// ============================================================

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Không set crossOrigin — ảnh /uploads/* nằm cùng origin qua Vite proxy,
    // nếu set 'anonymous' mà server không trả CORS header sẽ fail load.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không tải được ảnh nguồn'))
    img.src = src
  })
}

async function cropToBlob(src: string, area: Area, rotation: number): Promise<Blob> {
  const img = await loadImage(src)
  const rotRad = (rotation * Math.PI) / 180

  // Tính kích thước bbox sau khi xoay để canvas trung gian đủ chỗ chứa ảnh xoay
  const rotatedW = Math.abs(img.width * Math.cos(rotRad)) + Math.abs(img.height * Math.sin(rotRad))
  const rotatedH = Math.abs(img.width * Math.sin(rotRad)) + Math.abs(img.height * Math.cos(rotRad))

  // Canvas 1: chứa ảnh đã xoay
  const rotatedCanvas = document.createElement('canvas')
  rotatedCanvas.width = rotatedW
  rotatedCanvas.height = rotatedH
  const rctx = rotatedCanvas.getContext('2d')
  if (!rctx) throw new Error('Không tạo được canvas context')
  rctx.translate(rotatedW / 2, rotatedH / 2)
  rctx.rotate(rotRad)
  rctx.drawImage(img, -img.width / 2, -img.height / 2)

  // Canvas 2: crop vùng chọn ra từ ảnh đã xoay
  const canvas = document.createElement('canvas')
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Không tạo được canvas context')
  ctx.drawImage(
    rotatedCanvas,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas.toBlob null')),
      'image/jpeg',
      0.92,
    )
  })
}
