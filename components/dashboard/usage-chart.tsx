// ============================================================================
// USAGE CHART COMPONENT
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UsageChartProps {
  userId: string
}

export function UsageChart({ userId }: UsageChartProps) {
  const [data, setData] = useState<Array<{ date: string; requests: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage/stats?group_by=daily')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setData(
            result.data.map((item: any) => ({
              date: new Date(item.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
              requests: item.requests,
            }))
          )
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 rounded-xl p-6 hover:border-foreground/20 transition-colors">
      <h3 className="text-base font-medium text-foreground font-mono mb-4">
        Daily Requests
      </h3>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-foreground/60 font-mono">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-foreground/60 font-mono">No data yet. Start making requests!</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.05)" />
            <XAxis dataKey="date" stroke="hsl(var(--foreground) / 0.3)" style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono)' }} />
            <YAxis stroke="hsl(var(--foreground) / 0.3)" style={{ fontSize: '12px', fontFamily: 'var(--font-geist-mono)' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background) / 0.95)',
                border: '1px solid hsl(var(--foreground) / 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(12px)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--accent))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
