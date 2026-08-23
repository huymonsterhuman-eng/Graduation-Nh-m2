import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  ids: number[]
  has: (id: number) => boolean
  toggle: (id: number) => void
  clear: () => void
}

/** Wishlist local — chỉ lưu productId, sync qua localStorage. */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      has: (id) => get().ids.includes(id),
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((i) => i !== id) : [...s.ids, id],
        })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'lw-wishlist' }
  )
)
