// ============================================================================
// CALLOUT COMPONENT
// ============================================================================

'use client'

import { Info, AlertTriangle, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success' | 'tip'
  title?: string
  children: React.ReactNode
}

const variants = {
  info: {
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    titleText: 'text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-500',
    titleText: 'text-yellow-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    titleText: 'text-red-500',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-500',
    titleText: 'text-green-500',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    titleText: 'text-purple-500',
  },
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const variant = variants[type]
  const Icon = variant.icon

  return (
    <div
      className={cn(
        'rounded-xl p-4 border backdrop-blur-xl',
        variant.bg,
        variant.border
      )}
    >
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', variant.text)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          {title && (
            <h4 className={cn('font-semibold', variant.titleText)}>{title}</h4>
          )}
          <div className="text-sm text-foreground/80 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:space-y-1 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:bg-foreground/10 [&>code]:font-mono [&>code]:text-xs">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
