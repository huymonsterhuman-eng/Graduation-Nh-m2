import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CompareItem {
  id: number
  name: string
  slug: string
  image?: string
  price: number
  salePrice?: number
}

interface CompareState {
  items: CompareItem[]
  has: (id: number) => boolean
  toggle: (item: CompareItem) => { added: boolean; overflow?: boolean }
  remove: (id: number) => void
  clear: () => void
}

const MAX = 3

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.id === id),
      toggle: (item) => {
        const cur = get().items
        if (cur.some((i) => i.id === item.id)) {
          set({ items: cur.filter((i) => i.id !== item.id) })
          return { added: false }
        }
        if (cur.length >= MAX) return { added: false, overflow: true }
        set({ items: [...cur, item] })
        return { added: true }
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'lw-compare' }
  )
)
