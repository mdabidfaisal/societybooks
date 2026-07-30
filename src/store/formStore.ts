import { create } from 'zustand'

interface FormState {
  drafts: Record<string, Record<string, unknown>>
  saveDraft: (formName: string, data: Record<string, unknown>) => void
  getDraft: (formName: string) => Record<string, unknown> | null
  clearDraft: (formName: string) => void
  clearAllDrafts: () => void
}

export const useFormStore = create<FormState>((set, get) => ({
  drafts: {},
  saveDraft: (formName, data) => set((s) => ({
    drafts: { ...s.drafts, [formName]: data },
  })),
  getDraft: (formName) => get().drafts[formName] || null,
  clearDraft: (formName) => set((s) => {
    const { [formName]: _, ...rest } = s.drafts
    return { drafts: rest }
  }),
  clearAllDrafts: () => set({ drafts: {} }),
}))
