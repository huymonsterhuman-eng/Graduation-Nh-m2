import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCreateReview } from '@/hooks/api/useCreateReview'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

interface Props {
  productId: number
  productName: string
  onClose: () => void
  onSuccess?: () => void
}

/** Modal đơn giản đăng review — chọn 1-5 sao + comment. */
export function ReviewDialog({ productId, productName, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const createReview = useCreateReview()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createReview.mutateAsync({
        productId,
        rating,
        comment: comment.trim() || undefined,
      })
      toast.success('Cảm ơn bạn đã đánh giá!')
      onSuccess?.()
      onClose()
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Không đăng được đánh giá')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Đánh giá sản phẩm</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{productName}</p>

          <div className="space-y-2">
            <Label>Số sao</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8',
                      n <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Không tốt' : 'Tệ'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Nhận xét (không bắt buộc)</Label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={createReview.isPending}>
              {createReview.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
