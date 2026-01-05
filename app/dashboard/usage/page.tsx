// ============================================================================
// USAGE PAGE
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  BarChart3,
  TrendingUp,
  Zap,
  DollarSign,
  Activity,
  Calendar,
} from 'lucide-react'

interface UsageStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  error_count: number
  avg_response_time: number
}

interface ModelUsage {
  model: string
  requests: number
  tokens: number
  cost: number
}

interface DailyUsage {
  date: string
  requests: number
  tokens: number
  cost: number
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([])
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    loadUsageStats()
  }, [timeRange])

  const loadUsageStats = async () => {
    setLoading(true)
    try {
      // Calculate date range based on timeRange
      const endDate = new Date()
      const startDate = new Date()

      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30)
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90)
      }

      const dateParams = `start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`

      // Load overall stats
      const statsRes = await fetch(`/api/usage/stats?${dateParams}`)
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      // Load model usage
      const modelRes = await fetch(`/api/usage/stats?group_by=model&${dateParams}`)
      if (modelRes.ok) {
        const data = await modelRes.json()
        setModelUsage(data)
      }

      // Load daily usage
      const dailyRes = await fetch(`/api/usage/stats?group_by=daily&${dateParams}`)
      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setDailyUsage(data)
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Requests',
      value: stats?.total_requests?.toLocaleString() || '0',
      icon: Zap,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Total Tokens (Analytics)',
      value: stats?.total_tokens?.toLocaleString() || '0',
      icon: Activity,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_cost?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Avg Response Time',
      value: `${stats?.avg_response_time || 0}ms`,
      icon: TrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
  ]

  return (
    <div className="ml-64 p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Usage Analytics</h1>
        <p className="text-foreground/60 text-lg">
          Track your API usage, costs, and performance metrics
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              timeRange === range
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5 border border-foreground/10'
            }`}
          >
            Last {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-foreground/5 rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.title}
                className="p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-lg ${card.bg} border border-foreground/10`}
                  >
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <p className="text-2xl font-semibold text-foreground mt-2">
                    {card.value}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Usage by Model */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 border border-foreground/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Usage by Model
            </h2>
            <p className="text-sm text-foreground/60">
              Breakdown of requests and costs per model
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-foreground/5 rounded animate-pulse" />
            ))}
          </div>
        ) : modelUsage.length > 0 ? (
          <div className="space-y-4">
            {modelUsage.map((model) => (
              <div
                key={model.model}
                className="flex items-center justify-between p-4 rounded-lg bg-foreground/[0.02] border border-foreground/10 hover:bg-foreground/5 transition-all duration-300"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{model.model}</p>
                  <p className="text-sm text-foreground/60">
                    {model.requests.toLocaleString()} requests •{' '}
                    {model.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${model.cost.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-foreground/60 py-8">
            No usage data available
          </p>
        )}
      </Card>

      {/* Daily Usage Trend */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10 border border-foreground/10">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Daily Usage Trend
            </h2>
            <p className="text-sm text-foreground/60">
              Daily breakdown of your API usage
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-foreground/5 rounded animate-pulse" />
            ))}
          </div>
        ) : dailyUsage.length > 0 ? (
          <div className="space-y-3">
            {dailyUsage.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-foreground/60">
                    {day.requests.toLocaleString()} requests
                  </span>
                  <span className="text-foreground/60">
                    {day.tokens.toLocaleString()} tokens
                  </span>
                  <span className="font-medium text-foreground">
                    ${day.cost.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-foreground/60 py-8">
            No daily usage data available
          </p>
        )}
      </Card>
    </div>
  )
}
