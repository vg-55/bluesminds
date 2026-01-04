// ============================================================================
// STATS CARDS COMPONENT
// ============================================================================

'use client'

import { ArrowUpRight, ArrowDownRight, Zap, DollarSign, Activity, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatsCardsProps {
  userId: string
  stats?: {
    total_requests: number
    total_tokens: number
    total_cost: number
    error_count: number
    avg_response_time: number
  }
}

export function StatsCards({ userId, stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Requests',
      value: stats?.total_requests?.toLocaleString() || '0',
      icon: Zap,
      change: '+12%',
      positive: true,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_cost?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      change: '+8%',
      positive: true,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Avg Response Time',
      value: `${stats?.avg_response_time || 0}ms`,
      icon: Activity,
      change: '-5%',
      positive: true,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Error Rate',
      value: stats
        ? `${((stats.error_count / stats.total_requests) * 100).toFixed(1)}%`
        : '0%',
      icon: AlertTriangle,
      change: '-2%',
      positive: true,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        const ChangeIcon = card.positive ? ArrowUpRight : ArrowDownRight

        return (
          <div
            key={card.title}
            className="bg-slate-900/50 dark:bg-slate-900/50 bg-white backdrop-blur-xl border border-white/5 dark:border-white/5 border-slate-200 rounded-xl p-6 hover:border-white/10 dark:hover:border-white/10 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className={`flex items-center text-xs font-medium ${card.positive ? 'text-green-400' : 'text-red-400'}`}>
                <ChangeIcon className="w-3.5 h-3.5 mr-1" />
                {card.change}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-slate-600 font-open-sans-custom uppercase tracking-wide">
                {card.title}
              </p>
              <p className="text-2xl font-semibold text-white dark:text-white text-slate-900 mt-2 font-open-sans-custom">
                {card.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
