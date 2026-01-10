"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { TrendingUp, Activity, DollarSign, Users, Loader2 } from "lucide-react";

interface AnalyticsData {
  platformStats: Array<{
    label: string;
    value: string;
    change: string;
  }>;
  providerDistribution: Array<{
    provider: string;
    percentage: number;
    requests: number;
    cost: string;
    tokenAccuracy: number;
  }>;
  topUsers: Array<{
    name: string;
    email: string;
    requests: number;
    spent: string;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics');

      if (!res.ok) {
        throw new Error('Failed to load analytics');
      }

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  if (error) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="p-6 rounded-lg border border-red-500/20 bg-red-500/10">
            <p className="text-red-500 font-mono">{error}</p>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  if (!data) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
            <p className="font-mono text-sm text-foreground/60">No data available</p>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  const maxRevenue = Math.max(...data.revenueData.map((d) => d.revenue), 1);

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-sentient mb-2">
              System <i className="font-light">Analytics</i>
            </h1>
            <p className="font-mono text-sm text-foreground/60">
              Platform-wide metrics and performance data
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.platformStats.map((stat, index) => (
              <div
                key={index}
                className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]"
              >
                <p className="font-mono text-2xl font-semibold mb-2">
                  {stat.value}
                </p>
                <p className="font-mono text-xs text-foreground/60 uppercase tracking-wide mb-2">
                  {stat.label}
                </p>
                <p className="font-mono text-sm text-green-500">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Provider Distribution */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
              Provider Distribution
            </h2>
            <div className="space-y-6">
              {data.providerDistribution.length > 0 ? (
                data.providerDistribution.map((provider) => (
                  <div key={provider.provider}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm capitalize">{provider.provider}</span>
                      <span className="font-mono text-sm text-foreground/60">
                        {provider.percentage}%
                      </span>
                    </div>
                    <div className="h-3 bg-foreground/5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${provider.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-foreground/60">
                        {provider.requests.toLocaleString()} requests
                      </span>
                      <span className="font-mono text-xs text-foreground/60">
                        {provider.cost} • {provider.tokenAccuracy}% accurate
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-mono text-sm text-foreground/60">No provider data yet</p>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
              Top Users by Usage
            </h2>
            <div className="overflow-x-auto">
              {data.topUsers.length > 0 ? (
                <table className="w-full">
                  <thead className="border-b border-foreground/10">
                    <tr>
                      <th className="text-left py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                        Rank
                      </th>
                      <th className="text-left py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                        User
                      </th>
                      <th className="text-right py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                        Requests
                      </th>
                      <th className="text-right py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                        Spent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((user, index) => (
                      <tr
                        key={index}
                        className="border-b border-foreground/10 last:border-0"
                      >
                        <td className="py-4">
                          <span className="font-mono text-sm text-primary">
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-4">
                          <div>
                            <span className="font-mono text-sm">{user.name}</span>
                            <p className="font-mono text-xs text-foreground/60">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-mono text-sm">
                            {user.requests.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-mono text-sm">{user.spent}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="font-mono text-sm text-foreground/60">No user data yet</p>
              )}
            </div>
          </div>

          {/* Revenue Trend */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
              Monthly Revenue Trend
            </h2>
            <div className="space-y-4">
              {data.revenueData.length > 0 ? (
                data.revenueData.map((monthData) => (
                  <div key={monthData.month} className="flex items-center gap-4">
                    <span className="font-mono text-sm text-foreground/60 w-24">
                      {monthData.month}
                    </span>
                    <div className="flex-1 h-10 bg-foreground/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-lg flex items-center px-4"
                        style={{
                          width: `${(monthData.revenue / maxRevenue) * 100}%`,
                          minWidth: '60px',
                        }}
                      >
                        <span className="font-mono text-sm font-semibold">
                          ${(monthData.revenue / 1000).toFixed(1)}K
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="font-mono text-sm text-foreground/60">No revenue data yet</p>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
