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
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
      <h3 className="text-base font-medium text-white font-open-sans-custom mb-4">
        Daily Requests
      </h3>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-gray-500 font-open-sans-custom">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-gray-500 font-open-sans-custom">No data yet. Start making requests!</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
            <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(12px)',
              }}
              labelStyle={{ color: '#fff', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ fill: '#60a5fa', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
