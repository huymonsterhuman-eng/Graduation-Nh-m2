import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWishlistStore } from '@/stores/wishlist'
import { useProductsByIds } from '@/hooks/api/useProducts'
import { ProductGrid } from '@/components/common/ProductGrid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids)
  const clear = useWishlistStore((s) => s.clear)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: products, isLoading } = useProductsByIds(ids)

  const handleClear = () => {
    clear()
    setConfirmOpen(false)
    toast.success('Đã xóa toàn bộ danh sách yêu thích')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Sản phẩm yêu thích
          </CardTitle>
          <CardDescription>
            {ids.length > 0
              ? `Bạn có ${ids.length} sản phẩm trong danh sách yêu thích.`
              : 'Bạn chưa lưu sản phẩm nào. Bấm biểu tượng trái tim trên sản phẩm để thêm.'}
          </CardDescription>
        </div>
        {ids.length > 0 && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa tất cả
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa toàn bộ danh sách yêu thích?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này sẽ xóa {ids.length} sản phẩm khỏi danh sách yêu thích của bạn. Không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Xóa tất cả</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        {ids.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Danh sách yêu thích trống</p>
            <Button asChild>
              <Link to="/">Khám phá sản phẩm</Link>
            </Button>
          </div>
        ) : (
          <ProductGrid
            products={products}
            loading={isLoading}
            skeletonCount={Math.min(ids.length, 8)}
            emptyMessage="Các sản phẩm yêu thích đã bị gỡ khỏi hệ thống."
          />
        )}
      </CardContent>
    </Card>
  )
}
