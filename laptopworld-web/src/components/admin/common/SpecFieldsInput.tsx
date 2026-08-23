import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Info } from 'lucide-react'
import type { SpecField } from '@/types/api'

interface Props {
  /** Template lấy từ category đang chọn — quyết định field nào render. */
  template: SpecField[]
  /** Giá trị specs hiện tại (JSONB từ DB). Có thể chứa key ngoài template — không xóa. */
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}

/**
 * Render form nhập thông số kỹ thuật động dựa vào spec template của category.
 * Field không thuộc template mới nhưng có sẵn trong `value` → giữ lại, hiện ở phần dưới
 * dưới dạng "field cũ" để admin biết mà xử lý.
 */
export function SpecFieldsInput({ template, value, onChange }: Props) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const removeKey = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const templateKeys = new Set(template.map((f) => f.key))
  const orphanEntries = Object.entries(value).filter(([k]) => !templateKeys.has(k))

  if (template.length === 0 && orphanEntries.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        Chưa có template cho danh mục này.<br />
        <span className="text-xs">Vào <b>Danh mục</b> để thêm spec template.</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {template.length > 0 && (
        <div className="space-y-3">
          {template.map((field) => (
            <SpecInput key={field.key} field={field}
              value={value[field.key]}
              onChange={(v) => set(field.key, v)}
            />
          ))}
        </div>
      )}

      {orphanEntries.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <b>{orphanEntries.length} field</b> không thuộc template hiện tại — có thể do đổi category.
              Vẫn lưu trong dữ liệu SP; xóa nếu không cần.
            </span>
          </div>
          <div className="space-y-2">
            {orphanEntries.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[1fr_2fr_36px] items-center gap-2 text-sm">
                <div className="truncate font-mono text-xs text-muted-foreground">{k}</div>
                <div className="truncate">{String(v ?? '')}</div>
                <button
                  type="button"
                  onClick={() => removeKey(k)}
                  className="text-xs text-destructive hover:underline"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpecInput({
  field, value, onChange,
}: {
  field: SpecField; value: unknown; onChange: (v: unknown) => void
}) {
  const labelEl = (
    <Label className="flex items-center gap-2 text-sm">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
      <Badge variant="outline" className="h-4 px-1 font-mono text-[10px]">{field.key}</Badge>
    </Label>
  )

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        {labelEl}
        <Switch
          checked={value === true || value === 'true'}
          onCheckedChange={(v) => onChange(v)}
        />
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value == null || value === '' ? '' : String(value)}
            onChange={(e) => {
              const raw = e.target.value
              onChange(raw === '' ? null : Number(raw))
            }}
            className="flex-1"
          />
          {field.unit && (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          )}
        </div>
      </div>
    )
  }

  // text (default)
  return (
    <div className="space-y-1.5">
      {labelEl}
      <Input
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.unit ? `Ví dụ: 16 ${field.unit}` : undefined}
      />
    </div>
  )
}
