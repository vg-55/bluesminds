// ============================================================================
// LOGS PAGE
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from 'lucide-react'

interface UsageLog {
  id: string
  created_at: string
  model: string
  endpoint: string
  status_code: number
  total_tokens: number
  cost_usd: number
  response_time_ms: number
  is_error: boolean
  error_message?: string | null
  request_id: string
}

interface LogsResponse {
  logs: UsageLog[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export default function LogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')

  useEffect(() => {
    loadLogs()
  }, [page])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/usage/logs?page=${page}&per_page=20`)
      if (res.ok) {
        const data: LogsResponse = await res.json()
        setLogs(data.logs || [])
        setHasMore(data.has_more || false)
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return {
        text: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        icon: CheckCircle,
      }
    } else if (statusCode >= 400) {
      return {
        text: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: XCircle,
      }
    }
    return {
      text: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: Clock,
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'success' && log.status_code >= 200 && log.status_code < 300) ||
      (statusFilter === 'error' && log.status_code >= 400)

    return matchesSearch && matchesStatus
  })

  return (
    <div className="ml-64 p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Request Logs</h1>
        <p className="text-foreground/60 text-lg">
          View detailed logs of all your API requests
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Search by model or endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-10 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="error">Errors Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-16 bg-foreground/5 rounded" />
            </Card>
          ))}
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const status = getStatusColor(log.status_code)
            const StatusIcon = status.icon
            const isExpanded = expandedLog === log.id

            return (
              <Card
                key={log.id}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpanded(log.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`p-2 rounded-lg ${status.bg} border ${status.border}`}
                      >
                        <StatusIcon className={`w-5 h-5 ${status.text}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {log.model}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}
                          >
                            {log.status_code}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-foreground/5 text-foreground/60 border border-foreground/10">
                            {log.endpoint}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-foreground/60">
                          <span>
                            {new Date(log.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>{log.total_tokens.toLocaleString()} tokens</span>
                          <span>•</span>
                          <span>${log.cost_usd.toFixed(4)}</span>
                          <span>•</span>
                          <span>{log.response_time_ms}ms</span>
                        </div>

                        {log.error_message && (
                          <p className="mt-2 text-sm text-red-500">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>

                    <button className="text-foreground/60 hover:text-foreground transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-foreground/10 p-6 bg-foreground/[0.02] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Request ID
                        </h4>
                        <p className="text-xs font-mono text-foreground/60 bg-foreground/5 p-2 rounded border border-foreground/10">
                          {log.request_id}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Status
                        </h4>
                        <p className="text-xs text-foreground/80">
                          {log.is_error ? 'Error' : 'Success'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No logs found
            </h3>
            <p className="text-foreground/60">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your request logs will appear here'}
            </p>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredLogs.length > 0 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/5 transition-all duration-300"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-foreground/60">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
            className="px-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/5 transition-all duration-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
