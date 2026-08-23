import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Nội dung hiển thị trên ảnh placeholder khi src fail hoặc null. */
  fallbackText?: string
  /** Kích thước ảnh placeholder — mặc định 400x400. */
  fallbackSize?: string
  /** Seed để picsum trả ảnh consistent theo item (VD: productId). */
  seed?: string | number
  /** Dùng picsum.photos (ảnh thật) thay cho placehold.co (khung xám). */
  usePicsum?: boolean
}

/**
 * Ảnh có auto-fallback: nếu src null hoặc load fail → dùng placehold.co / picsum.photos.
 * Chuẩn 1 lần fallback (không loop) qua onError = null.
 */
export function SmartImage({
  src,
  alt,
  fallbackText,
  fallbackSize = '400x400',
  seed,
  usePicsum = false,
  className,
  ...props
}: SmartImageProps) {
  const buildFallback = () => {
    if (usePicsum) {
      const [w, h] = fallbackSize.split('x')
      const s = seed ? String(seed) : (alt || 'default')
      return `https://picsum.photos/seed/lw-${encodeURIComponent(s)}/${w}/${h}`
    }
    const label = encodeURIComponent(fallbackText || alt || 'No image')
    return `https://placehold.co/${fallbackSize}/e2e8f0/64748b?text=${label}`
  }

  const [currentSrc, setCurrentSrc] = useState<string>(src && src.length > 0 ? src : buildFallback())

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onError={(e) => {
        e.currentTarget.onerror = null
        setCurrentSrc(buildFallback())
      }}
    />
  )
}
