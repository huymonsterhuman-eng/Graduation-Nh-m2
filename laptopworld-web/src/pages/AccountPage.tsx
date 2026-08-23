import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AccountPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Tên đăng nhập" value={user?.username} />
        <Row label="Email" value={user?.email} />
        <Row label="Họ tên" value={user?.fullName} />
        <Row label="Vai trò" value={user?.roles?.join(', ')} />
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || '-'}</span>
    </div>
  )
}
