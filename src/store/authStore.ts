import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  role: string | null
  samitiId: string | null
  memberId: string | null
  setAuth: (user: User | null, role: string | null, samitiId: string | null, memberId: string | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  samitiId: null,
  memberId: null,
  setAuth: (user, role, samitiId, memberId) => set({ user, role, samitiId, memberId }),
  clearAuth: () => set({ user: null, role: null, samitiId: null, memberId: null }),
}))
