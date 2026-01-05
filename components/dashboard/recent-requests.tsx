// ============================================================================
// RECENT REQUESTS COMPONENT
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle } from 'lucide-react'

interface RecentRequestsProps {
  userId: string
}

interface RequestLog {
  id: string
  model: string
  total_tokens: number
  cost_usd: number
  response_time_ms: number
  status_code: number
  is_error: boolean
  created_at: string
}

export function RecentRequests({ userId }: RecentRequestsProps) {
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage/logs?per_page=5')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setLogs(result.data.logs)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 rounded-xl p-6 hover:border-foreground/20 transition-colors">
      <h3 className="text-base font-medium text-foreground font-mono mb-4">
        Recent Requests
      </h3>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-foreground/5 border border-foreground/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-foreground/60 font-mono">No requests yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-foreground/5 backdrop-blur-sm border border-foreground/5 rounded-lg hover:border-foreground/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                {log.is_error ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}

                <div>
                  <p className="text-sm font-medium text-foreground font-mono">
                    {log.model}
                  </p>
                  <p className="text-xs text-foreground/60 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-foreground/5 text-foreground/60 border-foreground/10 text-xs font-mono">
                  {log.total_tokens} tokens
                </Badge>
                <Badge variant="outline" className="bg-foreground/5 text-foreground/60 border-foreground/10 text-xs font-mono">
                  ${log.cost_usd?.toFixed(4) || '0.0000'}
                </Badge>
                <Badge variant="outline" className="bg-foreground/5 text-foreground/60 border-foreground/10 text-xs font-mono">
                  {log.response_time_ms}ms
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
