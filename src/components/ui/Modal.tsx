import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

interface ModalProps {
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose?: () => void
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ title, children, size = 'md', onClose }: ModalProps) {
  const closeModal = useUIStore((s) => s.closeModal)

  const handleClose = onClose || closeModal

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className={`relative w-full ${sizeClasses[size]} mx-4 bg-white rounded-lg shadow-xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
