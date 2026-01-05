// ============================================================================
// API ENDPOINT CARD COMPONENT
// ============================================================================

import { cn } from '@/lib/utils'

interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  className?: string
}

const methodConfig = {
  GET: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/10 text-green-400 border-green-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export function ApiEndpoint({ method, path, description, className }: ApiEndpointProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-3 p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <span
          className={cn(
            'px-2.5 py-1 rounded text-xs font-bold border',
            methodConfig[method]
          )}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <div className="text-sm text-foreground/60 sm:max-w-xs">{description}</div>
    </div>
  )
}
