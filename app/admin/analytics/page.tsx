"use client";

import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { TrendingUp, Activity, DollarSign, Users } from "lucide-react";

const platformStats = [
  { label: "Total Requests", value: "45.2M", change: "+12.5%" },
  { label: "Total Users", value: "12,458", change: "+245" },
  { label: "Total Revenue", value: "$124,567", change: "+18.2%" },
  { label: "Avg Latency", value: "89ms", change: "-12ms" },
];

const providerDistribution = [
  { provider: "OpenAI", percentage: 42, requests: 18984000, cost: "$52,345" },
  { provider: "Anthropic", percentage: 28, requests: 12657600, cost: "$31,234" },
  { provider: "Google", percentage: 18, requests: 8136000, cost: "$18,567" },
  { provider: "Cohere", percentage: 8, requests: 3616000, cost: "$12,456" },
  { provider: "Others", percentage: 4, requests: 1808000, cost: "$9,965" },
];

const topUsers = [
  { name: "Acme Corp", requests: 2345678, spent: "$12,345" },
  { name: "TechStart Inc", requests: 1876543, spent: "$9,876" },
  { name: "DataFlow Ltd", requests: 1456789, spent: "$7,654" },
  { name: "AI Solutions", requests: 1234567, spent: "$6,543" },
  { name: "Cloud Systems", requests: 987654, spent: "$5,432" },
];

export default function AdminAnalyticsPage() {
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
            {platformStats.map((stat, index) => (
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
              {providerDistribution.map((provider) => (
                <div key={provider.provider}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{provider.provider}</span>
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
                      {provider.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Users */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
              Top Users by Usage
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-foreground/10">
                  <tr>
                    <th className="text-left py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                      Rank
                    </th>
                    <th className="text-left py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                      Company
                    </th>
                    <th className="text-right py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                      Requests
                    </th>
                    <th className="text-right py-3 font-mono text-xs uppercase tracking-wide text-foreground/60">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user, index) => (
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
                        <span className="font-mono text-sm">{user.name}</span>
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
            </div>
          </div>

          {/* Revenue Trend */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
            <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
              Monthly Revenue Trend
            </h2>
            <div className="space-y-4">
              {[
                { month: "January", revenue: 98456 },
                { month: "February", revenue: 105234 },
                { month: "March", revenue: 112345 },
                { month: "April", revenue: 124567 },
              ].map((data) => (
                <div key={data.month} className="flex items-center gap-4">
                  <span className="font-mono text-sm text-foreground/60 w-24">
                    {data.month}
                  </span>
                  <div className="flex-1 h-10 bg-foreground/5 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-primary/50 rounded-lg flex items-center px-4"
                      style={{
                        width: `${(data.revenue / 124567) * 100}%`,
                      }}
                    >
                      <span className="font-mono text-sm font-semibold">
                        ${(data.revenue / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
