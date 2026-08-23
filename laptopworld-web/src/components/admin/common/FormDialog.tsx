import { type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onSubmit: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  children: ReactNode
  size?: 'default' | 'lg' | 'xl'
}

const SIZE = {
  default: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

/**
 * Modal wrap 1 form. Children là body form (không tự tạo <form>).
 * onSubmit được gọi khi bấm nút submit. Tự đóng modal khi loading xong về false.
 */
export function FormDialog({
  open, onOpenChange, title, description, onSubmit,
  submitLabel = 'Lưu', cancelLabel = 'Hủy', loading = false,
  children, size = 'default',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${SIZE[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-4">
          <div className="space-y-4">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
