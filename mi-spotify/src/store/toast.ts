import { create } from 'zustand'

export interface Toast { id: number; message: string; kind: 'info' | 'error' }
interface ToastStore { toasts: Toast[]; push: (t: Toast) => void; remove: (id: number) => void }

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, t] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

let n = 0
export function toast(message: string, kind: 'info' | 'error' = 'info') {
  const id = ++n
  useToasts.getState().push({ id, message, kind })
  setTimeout(() => useToasts.getState().remove(id), kind === 'error' ? 6000 : 2500)
}
