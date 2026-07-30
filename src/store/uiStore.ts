import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  modalData: unknown | null
  loading: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modal: string, data?: unknown) => void
  closeModal: () => void
  setLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeModal: null,
  modalData: null,
  loading: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setLoading: (loading) => set({ loading }),
}))
