import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Trash2, GripVertical, Info, Sparkles, ChevronDown, Lock } from 'lucide-react'
import type { SpecField } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Editor cho spec_template — định nghĩa các thông số kỹ thuật của danh mục.
 *
 * VD "Laptop" có template [CPU, RAM, SSD, GPU, Màn hình] → khi admin tạo
 * SP thuộc Laptop, form auto sinh 5 input tương ứng để nhập giá trị.
 *
 * Key (định danh kỹ thuật) được sinh tự động từ Nhãn, admin không thấy trực tiếp
 * → không có cơ hội đổi key làm mất dữ liệu SP đã lưu.
 */
interface Props {
  value: SpecField[]
  onChange: (v: SpecField[]) => void
  /**
   * Số SP đang dùng từng key. Với key có count > 0:
   * - Không cho đổi Kiểu dữ liệu (disable Select)
   * - Không cho xoá field (disable Trash)
   * Chỉ truyền khi edit category đã tồn tại (create thì không cần).
   */
  usage?: Record<string, number>
}

const TYPE_OPTIONS: { value: SpecField['type']; label: string }[] = [
  { value: 'text',    label: 'Chuỗi (text)' },
  { value: 'number',  label: 'Số (number)' },
  { value: 'boolean', label: 'Có/Không' },
]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
)

/** Template mẫu — bấm 1 phát điền sẵn, admin chỉnh thêm nếu cần. */
const PRESETS: Record<string, { name: string; fields: SpecField[] }> = {
  laptop: {
    name: 'Laptop',
    fields: [
      { key: 'cpu',       label: 'CPU',        type: 'text',   required: true },
      { key: 'ram',       label: 'RAM',        type: 'text',   required: true },
      { key: 'ssd',       label: 'Ổ cứng SSD', type: 'text',   required: true },
      { key: 'gpu',       label: 'Card đồ hoạ',type: 'text',   required: false },
      { key: 'man_hinh',  label: 'Màn hình',   type: 'text',   required: true },
      { key: 'pin',       label: 'Pin',        type: 'text',   required: false },
      { key: 'trong_luong', label: 'Trọng lượng (kg)', type: 'number', required: false },
    ],
  },
  phone: {
    name: 'Điện thoại',
    fields: [
      { key: 'cpu',       label: 'CPU',        type: 'text',   required: true },
      { key: 'ram',       label: 'RAM',        type: 'text',   required: true },
      { key: 'bo_nho',    label: 'Bộ nhớ trong', type: 'text', required: true },
      { key: 'man_hinh',  label: 'Màn hình',   type: 'text',   required: true },
      { key: 'camera',    label: 'Camera',     type: 'text',   required: true },
      { key: 'pin',       label: 'Pin',        type: 'text',   required: true },
      { key: 'he_dieu_hanh', label: 'Hệ điều hành', type: 'text', required: false },
    ],
  },
  headphone: {
    name: 'Tai nghe',
    fields: [
      { key: 'kieu_ket_noi', label: 'Kiểu kết nối', type: 'text', required: true },
      { key: 'driver',    label: 'Driver',     type: 'text',   required: false },
      { key: 'pin',       label: 'Pin',        type: 'text',   required: false },
      { key: 'chong_on',  label: 'Chống ồn',   type: 'boolean',required: false },
      { key: 'micro',     label: 'Micro',      type: 'boolean',required: false },
    ],
  },
  accessory: {
    name: 'Phụ kiện chung',
    fields: [
      { key: 'chat_lieu', label: 'Chất liệu',  type: 'text',   required: false },
      { key: 'mau_sac',   label: 'Màu sắc',    type: 'text',   required: false },
      { key: 'bao_hanh',  label: 'Bảo hành',   type: 'text',   required: false },
    ],
  },
}

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

/**
 * Sinh key duy nhất trong danh sách hiện có: nếu đã tồn tại thì thêm _2, _3...
 * Tránh trường hợp 2 field cùng label "RAM" → cùng key `ram` → SP lưu chồng đè.
 */
function uniqueKey(base: string, existing: string[]): string {
  if (!base) return ''
  if (!existing.includes(base)) return base
  let i = 2
  while (existing.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}

export function SpecTemplateEditor({ value, onChange, usage }: Props) {
  const [errors, setErrors] = useState<Record<number, string>>({})
  const usageOf = (key: string) => (usage && key ? usage[key] ?? 0 : 0)

  const updateAt = (i: number, patch: Partial<SpecField>) => {
    const next = [...value]
    next[i] = { ...next[i], ...patch }

    // Auto sinh key từ label — admin không thấy key nhưng vẫn có key hợp lệ
    if (patch.label !== undefined) {
      const otherKeys = next.filter((_, idx) => idx !== i).map((f) => f.key)
      const baseKey = slugifyKey(patch.label)
      next[i].key = uniqueKey(baseKey, otherKeys)
    }

    onChange(next)
    validateAll(next)
  }

  const removeAt = (i: number) => {
    const next = value.slice()
    next.splice(i, 1)
    onChange(next)
    validateAll(next)
  }

  const addNew = () => {
    onChange([...value, { key: '', label: '', type: 'text', required: false }])
  }

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey]
    if (!preset) return
    // Merge với template hiện tại — không đè, chỉ append field chưa có
    const existingKeys = new Set(value.map((f) => f.key))
    const toAdd = preset.fields.filter((f) => !existingKeys.has(f.key))
    onChange([...value, ...toAdd])
  }

  const validateAll = (list: SpecField[]) => {
    const err: Record<number, string> = {}
    list.forEach((f, i) => {
      if (!f.label.trim()) err[i] = 'Nhãn không được để trống'
    })
    setErrors(err)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p><b>Thông số kỹ thuật của danh mục</b> — khi tạo SP thuộc danh mục này, form sẽ tự sinh input tương ứng.</p>
          <p>
            VD danh mục <i>Laptop</i> có CPU, RAM, SSD, GPU, Màn hình.
            Bạn có thể bấm <b>Chèn mẫu</b> để điền sẵn nhanh.
          </p>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Chưa có thông số nào. Bấm "Thêm trường" hoặc "Chèn mẫu" để bắt đầu.
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[16px_1.6fr_180px_100px_40px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span />
            <span>Nhãn hiển thị</span>
            <span>Kiểu dữ liệu</span>
            <span className="text-center">Bắt buộc</span>
            <span />
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="space-y-2">
              {value.map((field, i) => {
                const used = usageOf(field.key)
                const locked = used > 0
                const lockMsg = `Đang có ${used} sản phẩm dùng trường này — không đổi kiểu / không xoá được.`
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[16px_1fr] items-center gap-2 rounded-md border bg-card p-2 md:grid-cols-[16px_1.6fr_180px_100px_40px]"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />

                    <div>
                      <Label className="mb-1 block text-[10px] uppercase text-muted-foreground md:hidden">Nhãn hiển thị</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={field.label}
                          placeholder="VD: CPU, RAM, Màn hình..."
                          className="h-8 text-sm"
                          onChange={(e) => updateAt(i, { label: e.target.value })}
                        />
                        {locked && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="h-6 shrink-0 gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                                <Lock className="h-3 w-3" />
                                {used} SP
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{lockMsg}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {errors[i] && (
                        <p className="mt-1 text-[11px] text-destructive">{errors[i]}</p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-1 block text-[10px] uppercase text-muted-foreground md:hidden">Kiểu</Label>
                      {locked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex h-8 cursor-not-allowed items-center rounded-md border bg-muted/40 px-3 text-xs text-muted-foreground">
                              {TYPE_LABEL[field.type] ?? field.type}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{lockMsg}</TooltipContent>
                        </Tooltip>
                      ) : (
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
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={!!field.required}
                        onChange={(e) => updateAt(i, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-input accent-primary"
                        aria-label="Bắt buộc"
                      />
                    </div>

                    {locked ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md opacity-40">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{lockMsg}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeAt(i)}
                        title="Xóa trường"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addNew}>
          <Plus className="mr-2 h-4 w-4" /> Thêm trường
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Chèn mẫu
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Chọn template có sẵn</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(PRESETS).map(([key, preset]) => (
              <DropdownMenuItem key={key} onClick={() => applyPreset(key)}>
                <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-sm">{preset.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {preset.fields.length} trường
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {value.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {value.length} trường
          </span>
        )}
      </div>
    </div>
  )
}
