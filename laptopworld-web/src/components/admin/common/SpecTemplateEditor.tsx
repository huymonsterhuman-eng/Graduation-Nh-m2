import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, GripVertical, Info } from 'lucide-react'
import type { SpecField } from '@/types/api'

/**
 * Editor thân thiện cho spec_template — chỉnh sửa danh sách field
 * để Sprint 9D dựng form nhập thông số kỹ thuật sản phẩm.
 *
 * VD "Laptop" có template [CPU, RAM, SSD, GPU, Màn hình] → khi admin tạo
 * SP thuộc Laptop, form auto sinh 5 input tương ứng để nhập giá trị.
 */
interface Props {
  value: SpecField[]
  onChange: (v: SpecField[]) => void
}

const TYPE_OPTIONS: { value: SpecField['type']; label: string }[] = [
  { value: 'text',    label: 'Chuỗi (text)' },
  { value: 'number',  label: 'Số (number)' },
  { value: 'boolean', label: 'Có/Không' },
]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
)

/** Chuẩn hóa key: bỏ dấu, snake_case. */
function slugifyKey(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function SpecTemplateEditor({ value, onChange }: Props) {
  const updateAt = (i: number, patch: Partial<SpecField>) => {
    const next = [...value]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const removeAt = (i: number) => {
    const next = value.slice()
    next.splice(i, 1)
    onChange(next)
  }
  const addNew = () => {
    onChange([...value, { key: '', label: '', type: 'text', required: false }])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p><b>Spec template</b> = các thông số kỹ thuật chuẩn của SP trong danh mục này.</p>
          <p>
            Ví dụ danh mục <i>Laptop</i>: CPU, RAM, SSD, GPU, Màn hình.
            Khi tạo SP mới thuộc danh mục này, form sẽ tự sinh input tương ứng để nhập giá trị cụ thể.
          </p>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Chưa có field nào. Bấm "Thêm trường" để bắt đầu.
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[16px_1fr_1.4fr_140px_100px_40px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span />
            <span>Key (kỹ thuật)</span>
            <span>Nhãn hiển thị</span>
            <span>Kiểu dữ liệu</span>
            <span className="text-center">Bắt buộc</span>
            <span />
          </div>
          <div className="space-y-2">
            {value.map((field, i) => (
              <div
                key={i}
                className="grid grid-cols-[16px_1fr_1fr] items-center gap-2 rounded-md border bg-card p-2 md:grid-cols-[16px_1fr_1.4fr_140px_100px_40px]"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                <div className="col-span-2 md:col-span-1">
                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground md:hidden">Key</Label>
                  <Input
                    value={field.key}
                    placeholder="cpu"
                    className="h-8 font-mono text-xs"
                    onChange={(e) => updateAt(i, { key: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value) updateAt(i, { key: slugifyKey(e.target.value) })
                    }}
                  />
                </div>

                <div className="col-span-3 md:col-span-1">
                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground md:hidden">Nhãn hiển thị</Label>
                  <Input
                    value={field.label}
                    placeholder="CPU"
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const nextLabel = e.target.value
                      updateAt(i, {
                        label: nextLabel,
                        // Auto sinh key nếu key đang trống
                        key: field.key ? field.key : slugifyKey(nextLabel),
                      })
                    }}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground md:hidden">Kiểu</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateAt(i, { type: v as SpecField['type'] })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue>{TYPE_LABEL[field.type] ?? field.type}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={!!field.required}
                    onChange={(e) => updateAt(i, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-input accent-primary"
                    aria-label="Bắt buộc"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeAt(i)}
                  title="Xóa field"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addNew}>
        <Plus className="mr-2 h-4 w-4" /> Thêm trường
      </Button>
    </div>
  )
}
