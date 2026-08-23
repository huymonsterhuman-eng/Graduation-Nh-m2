import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from '@/hooks/api/useAddresses'
import type { AddressPayload } from '@/hooks/api/useAddresses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import type { Address } from '@/types/api'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1, 'Nhập họ tên người nhận').max(150),
  phone: z.string().regex(/^[0-9+()\-\s]{8,20}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(1, 'Nhập địa chỉ'),
  ward: z.string().optional(),
  district: z.string().optional(),
  province: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export function AddressBookPage() {
  const { data: addresses, isLoading } = useAddresses()
  const [editing, setEditing] = useState<Address | 'new' | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sổ địa chỉ</h1>
        {!editing && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="mr-1 h-4 w-4" /> Thêm địa chỉ
          </Button>
        )}
      </div>

      {editing && (
        <AddressForm
          initial={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : !addresses || addresses.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Chưa có địa chỉ nào.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => <AddressCard key={a.id} address={a} onEdit={() => setEditing(a)} />)}
        </div>
      )}
    </div>
  )
}

function AddressCard({ address, onEdit }: { address: Address; onEdit: () => void }) {
  const setDefault = useSetDefaultAddress()
  const remove = useDeleteAddress()

  return (
    <Card>
      <CardContent className="p-4 flex gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{address.name}</span>
            <span className="text-sm text-muted-foreground">{address.phone}</span>
            {address.isDefault && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Mặc định</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {[address.address, address.ward, address.district, address.province].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {!address.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDefault.mutate(address.id, {
                onSuccess: () => toast.success('Đã đặt mặc định'),
              })}
            >
              <Star className="mr-1 h-3 w-3" /> Đặt mặc định
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" /> Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Xóa địa chỉ này?')) {
                remove.mutate(address.id, { onSuccess: () => toast.success('Đã xóa') })
              }
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Xóa
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddressForm({ initial, onDone }: { initial?: Address; onDone: () => void }) {
  const create = useCreateAddress()
  const update = useUpdateAddress()
  const { register, handleSubmit, formState: { errors } } = useForm<AddressPayload>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      name: initial.name,
      phone: initial.phone,
      address: initial.address,
      ward: initial.ward || '',
      district: initial.district || '',
      province: initial.province || '',
      isDefault: initial.isDefault,
    } : undefined,
  })

  const onSubmit = async (payload: AddressPayload) => {
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, payload })
        toast.success('Cập nhật thành công')
      } else {
        await create.mutateAsync(payload)
        toast.success('Thêm địa chỉ thành công')
      }
      onDone()
    } catch (e) {
      const err = e as AxiosError<ApiResponse<unknown>>
      toast.error(err.response?.data?.message || 'Lỗi lưu địa chỉ')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{initial ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Họ tên người nhận</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Số điện thoại</Label>
              <Input {...register('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Địa chỉ (số nhà, đường)</Label>
            <Input {...register('address')} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Phường/Xã</Label>
              <Input {...register('ward')} />
            </div>
            <div className="space-y-1">
              <Label>Quận/Huyện</Label>
              <Input {...register('district')} />
            </div>
            <div className="space-y-1">
              <Label>Tỉnh/Thành</Label>
              <Input {...register('province')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isDefault')} /> Đặt làm địa chỉ mặc định
          </label>
          <div className="flex gap-2">
            <Button type="submit">{initial ? 'Cập nhật' : 'Thêm mới'}</Button>
            <Button type="button" variant="outline" onClick={onDone}>Hủy</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
