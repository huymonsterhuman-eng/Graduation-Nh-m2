import { Construction } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  title: string
  sprint: string
  description?: string
}

export function AdminPlaceholderPage({ title, sprint, description }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge variant="outline">{sprint}</Badge>
      </div>
      <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-16 text-center">
        <Construction className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          {description ?? `Trang "${title}" sẽ được xây dựng ở ${sprint}.`}
        </p>
      </Card>
    </div>
  )
}
