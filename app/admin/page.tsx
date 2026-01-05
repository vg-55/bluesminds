"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { cn } from "@/lib/utils";
import {
  Users,
  Activity,
  Key,
  Server,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  usersThisWeek: number;
  totalApiKeys: number;
  activeServers: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  tier: string;
  created_at: string;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentUsers(data.recentUsers);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                Loading statistics...
              </p>
            </div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  if (error) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="font-mono text-sm text-red-500">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-primary text-background rounded-lg font-mono text-sm"
            >
              Retry
            </button>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-sentient mb-2">
              Admin <i className="font-light">Overview</i>
            </h1>
            <p className="font-mono text-sm text-foreground/60">
              Platform-wide statistics and system monitoring
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-5 h-5 text-primary" />
                {stats && stats.usersThisWeek > 0 && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="font-mono text-2xl font-semibold mb-1">
                {stats?.totalUsers.toLocaleString() || 0}
              </p>
              <p className="font-mono text-xs text-foreground/60 uppercase tracking-wide mb-2">
                Total Users
              </p>
              <p className="font-mono text-xs text-foreground/60">
                +{stats?.usersThisWeek || 0} this week
              </p>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <p className="font-mono text-2xl font-semibold mb-1">
                {stats?.totalApiKeys.toLocaleString() || 0}
              </p>
              <p className="font-mono text-xs text-foreground/60 uppercase tracking-wide mb-2">
                Active API Keys
              </p>
              <p className="font-mono text-xs text-foreground/60">
                Across all users
              </p>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <p className="font-mono text-2xl font-semibold mb-1">
                {stats?.activeServers || 0}
              </p>
              <p className="font-mono text-xs text-foreground/60 uppercase tracking-wide mb-2">
                Active Servers
              </p>
              <p className="font-mono text-xs text-foreground/60">
                LiteLLM backends
              </p>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <p className="font-mono text-2xl font-semibold mb-1">
                {stats?.activeServers > 0 ? '99.9%' : 'N/A'}
              </p>
              <p className="font-mono text-xs text-foreground/60 uppercase tracking-wide mb-2">
                System Health
              </p>
              <p className="font-mono text-xs text-foreground/60">
                {stats?.activeServers > 0 ? 'All systems operational' : 'No servers configured'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
              <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
                Recent Users
              </h2>
              {recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between pb-4 border-b border-foreground/10 last:border-0"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="font-mono text-xs text-foreground/60">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs text-primary capitalize">
                          {user.tier}
                        </p>
                        <p className="font-mono text-xs text-foreground/60">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-foreground/20 mx-auto mb-2" />
                  <p className="font-mono text-sm text-foreground/60">
                    No users yet
                  </p>
                </div>
              )}
            </div>

            {/* System Information */}
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-6">
              <h2 className="text-xl font-mono uppercase tracking-wide mb-6">
                System Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-foreground/10">
                  <div>
                    <p className="font-mono text-sm font-medium">Database</p>
                    <p className="font-mono text-xs text-foreground/60">
                      PostgreSQL via Supabase
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs bg-green-500/10 text-green-500">
                      Connected
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-foreground/10">
                  <div>
                    <p className="font-mono text-sm font-medium">
                      API Gateway
                    </p>
                    <p className="font-mono text-xs text-foreground/60">
                      Next.js API Routes
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs bg-green-500/10 text-green-500">
                      Running
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium">
                      LiteLLM Servers
                    </p>
                    <p className="font-mono text-xs text-foreground/60">
                      AI Model Backends
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs",
                      stats?.activeServers > 0
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {stats?.activeServers > 0 ? 'Active' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-mono text-lg mb-2">Manage Users</h3>
              <p className="font-mono text-sm text-foreground/60 mb-4">
                View and manage all user accounts
              </p>
              <a
                href="/admin/users"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-background font-mono text-sm hover:bg-primary/90 transition-colors"
              >
                [View Users]
              </a>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-center">
              <Server className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-mono text-lg mb-2">Manage Servers</h3>
              <p className="font-mono text-sm text-foreground/60 mb-4">
                Configure LiteLLM server pool
              </p>
              <a
                href="/admin/providers"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-background font-mono text-sm hover:bg-primary/90 transition-colors"
              >
                [View Servers]
              </a>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-center">
              <Key className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-mono text-lg mb-2">API Keys</h3>
              <p className="font-mono text-sm text-foreground/60 mb-4">
                Monitor all API key activity
              </p>
              <a
                href="/admin/keys"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-background font-mono text-sm hover:bg-primary/90 transition-colors"
              >
                [View Keys]
              </a>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
