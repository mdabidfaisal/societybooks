import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: string
  description?: string
  action?: ReactNode
}

export function Card({ children, className, title, subtitle, description, action }: CardProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            {title && (typeof title === 'string' ? <h3 className="text-base font-semibold text-gray-900">{title}</h3> : title)}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}
