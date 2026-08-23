import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Bot, MessageSquare, UserCircle2, Clock, HelpCircle,
} from 'lucide-react'
import { useChatbotStats, useChatbotTopQuestions, type DateRange } from '@/hooks/api/useAdminDashboard'
import { formatDateTime } from '@/lib/format'
import { KpiCard } from './KpiCard'

export function ChatbotSection({ range }: { range: DateRange }) {
  const { data: stats, isLoading: statsLoading } = useChatbotStats(range)
  const { data: questions, isLoading: qLoading } = useChatbotTopQuestions(30, 10)

  const rateColor = !stats
    ? 'default'
    : stats.loggedInRate >= 30 ? 'success' : 'warning'
  const respColor = !stats
    ? 'default'
    : stats.avgResponseMs < 3000 ? 'success'
    : stats.avgResponseMs < 6000 ? 'warning' : 'danger'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Trợ lý AI</h2>
        <Badge variant="outline" className="border-primary/40 text-primary">
          Điểm nhấn đồ án
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Lượt trò chuyện"
          icon={MessageSquare}
          color="info"
          value={stats?.sessions.toLocaleString('vi-VN') ?? '—'}
          loading={statsLoading}
        />
        <KpiCard
          label="Tin nhắn"
          icon={MessageSquare}
          value={stats?.messages.toLocaleString('vi-VN') ?? '—'}
          loading={statsLoading}
        />
        <KpiCard
          label="Khách đã đăng nhập"
          icon={UserCircle2}
          color={rateColor}
          value={stats ? `${stats.loggedInRate.toFixed(1)}%` : '—'}
          hint={stats ? `${stats.loggedInSessions}/${stats.sessions} lượt` : undefined}
          loading={statsLoading}
        />
        <KpiCard
          label="Phản hồi TB"
          icon={Clock}
          color={respColor}
          value={stats ? `${stats.avgResponseMs.toLocaleString('vi-VN')} ms` : '—'}
          hint="Gemini response time"
          loading={statsLoading}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Top câu hỏi khách hay hỏi (30 ngày)</h3>
        </div>
        {qLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !questions || questions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chưa có tin nhắn khách nào trong 30 ngày.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Câu hỏi</TableHead>
                <TableHead className="text-right">Số lần</TableHead>
                <TableHead className="hidden md:table-cell">Lần cuối</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2 text-sm">{q.question}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-primary/15 text-primary">{q.askCount}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatDateTime(q.lastAsked)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
