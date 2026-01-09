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
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Tokens Used',
      value: stats?.total_tokens?.toLocaleString() || '0',
      icon: Activity,
      change: '+15%',
      positive: true,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_cost?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      change: '+8%',
      positive: true,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Error Rate',
      value: stats
        ? `${((stats.error_count / stats.total_requests) * 100).toFixed(1)}%`
        : '0%',
      icon: AlertTriangle,
      change: '-2%',
      positive: true,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        const ChangeIcon = card.positive ? ArrowUpRight : ArrowDownRight

        return (
          <Card
            key={card.title}
            className="p-6 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${card.bg} border border-foreground/10`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className={`flex items-center text-xs font-medium ${card.positive ? 'text-accent' : 'text-destructive'}`}>
                <ChangeIcon className="w-3.5 h-3.5 mr-1" />
                {card.change}
              </div>
            </div>

            <div>
              <p className="text-xs text-foreground/60 uppercase tracking-wide font-mono">
                {card.title}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-2 font-mono">
                {card.value}
              </p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
