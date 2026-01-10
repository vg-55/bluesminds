"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Server,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface LiteLLMServer {
  id: string;
  name: string;
  base_url: string;
  api_key: string | null;
  priority: number;
  weight: number;
  max_concurrent_requests: number;
  current_requests: number;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_health_check_at: string | null;
  total_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  supported_models: string[];
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export default function AdminServersPage() {
  const [servers, setServers] = useState<LiteLLMServer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingServerId, setUpdatingServerId] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/servers');

      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }

      const data = await response.json();
      setServers(data.data || []);
    } catch (err) {
      console.error('Error fetching servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const filteredServers = servers.filter(
    (server) =>
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.base_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleServerStatus = async (serverId: string, currentStatus: boolean) => {
    try {
      setUpdatingServerId(serverId);
      const newStatus = !currentStatus;

      const response = await fetch('/api/admin/servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: serverId, is_active: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update server status');
      }

      // Update local state
      setServers(
        servers.map((server) =>
          server.id === serverId
            ? { ...server, is_active: newStatus }
            : server
        )
      );
    } catch (err) {
      console.error('Error updating server:', err);
      alert('Failed to update server status');
    } finally {
      setUpdatingServerId(null);
    }
  };

  const deleteServer = async (serverId: string) => {
    if (!confirm("Are you sure you want to delete this server? This action cannot be undone.")) {
      return;
    }

    try {
      setUpdatingServerId(serverId);
      const response = await fetch(`/api/admin/servers?id=${serverId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      // Remove from local state
      setServers(servers.filter((server) => server.id !== serverId));
    } catch (err) {
      console.error('Error deleting server:', err);
      alert('Failed to delete server');
    } finally {
      setUpdatingServerId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-500';
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'unhealthy':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
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
                Loading servers...
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
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="font-mono text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchServers}
              className="px-4 py-2 bg-primary text-background rounded-lg font-mono text-sm"
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-sentient mb-2">
                LiteLLM <i className="font-light">Servers</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Manage LiteLLM proxy servers and load balancing
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Servers
              </p>
              <p className="font-mono text-2xl font-semibold">
                {servers.length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active Servers
              </p>
              <p className="font-mono text-2xl font-semibold">
                {servers.filter((s) => s.is_active).length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Healthy
              </p>
              <p className="font-mono text-2xl font-semibold">
                {servers.filter((s) => s.health_status === "healthy").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Requests
              </p>
              <p className="font-mono text-2xl font-semibold">
                {servers.reduce((sum, s) => sum + s.total_requests, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
            <input
              type="text"
              placeholder="Search servers by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
            />
          </div>

          {/* Servers Table */}
          {filteredServers.length > 0 ? (
            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-foreground/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Server
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Health
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Status
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Requests
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Response Time
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Priority
                      </th>
                      <th className="text-right py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServers.map((server) => (
                      <tr
                        key={server.id}
                        className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                      >
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {server.name}
                            </p>
                            <p className="font-mono text-xs text-foreground/60">
                              {server.base_url}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${getHealthColor(server.health_status)}`}
                          >
                            {getHealthIcon(server.health_status)}
                            {server.health_status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                              server.is_active
                                ? "bg-green-500/10 text-green-500"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {server.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-mono text-sm">
                              {server.total_requests.toLocaleString()}
                            </p>
                            <p className="font-mono text-xs text-red-500">
                              {server.failed_requests} failed
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {server.avg_response_time_ms}ms
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {server.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleServerStatus(server.id, server.is_active)}
                              disabled={updatingServerId === server.id}
                              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors disabled:opacity-50"
                              title={
                                server.is_active
                                  ? "Deactivate server"
                                  : "Activate server"
                              }
                            >
                              {updatingServerId === server.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : server.is_active ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <Server className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                {searchQuery ? 'No servers found matching your search' : 'No servers configured yet'}
              </p>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
