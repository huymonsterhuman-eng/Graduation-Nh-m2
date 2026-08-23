import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminNotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
        <p className="text-sm text-muted-foreground">
          Đường dẫn quản trị này không tồn tại.
        </p>
      </div>
      <Button asChild>
        <Link to="/admin">Về Dashboard</Link>
      </Button>
    </div>
  )
}
