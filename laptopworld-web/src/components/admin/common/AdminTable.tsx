import { type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Inbox } from 'lucide-react'

export interface AdminColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

interface Props<T> {
  columns: AdminColumn<T>[]
  data: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
  toolbar?: ReactNode
}

/**
 * Bảng CRUD chuẩn cho admin — header + rows + empty state + skeleton loading.
 * Không có pagination/sort ở đây (Sprint 9C data nhỏ). 9D sẽ mở rộng.
 */
export function AdminTable<T>({
  columns, data, rowKey, isLoading, emptyMessage, toolbar,
}: Props<T>) {
  return (
    <Card className="overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={
                    (c.align === 'right' ? 'text-right ' :
                     c.align === 'center' ? 'text-center ' : '') +
                    (c.className || '')
                  }
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10" strokeWidth={1.5} />
                    <span className="text-sm">{emptyMessage || 'Chưa có dữ liệu'}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={
                        (c.align === 'right' ? 'text-right ' :
                         c.align === 'center' ? 'text-center ' : '') +
                        (c.className || '')
                      }
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
