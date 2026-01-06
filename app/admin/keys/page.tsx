"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Key, Loader2 } from "lucide-react";

interface ApiKey {
  id: string;
  keyPreview: string;
  name: string;
  user: string;
  email: string;
  created: string;
  lastUsed: string;
  requests: number;
  status: "active" | "revoked";
}

interface KeysData {
  keys: ApiKey[];
  stats: {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    revokedKeys: number;
  };
}

export default function AdminKeysPage() {
  const [data, setData] = useState<KeysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/keys');

      if (!res.ok) {
        throw new Error('Failed to load API keys');
      }

      const keysData = await res.json();
      setData(keysData);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys');
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

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-sentient mb-2">
              API Keys <i className="font-light">Monitor</i>
            </h1>
            <p className="font-mono text-sm text-foreground/60">
              Monitor all API keys across the platform
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Keys
              </p>
              <p className="font-mono text-2xl font-semibold">{data.stats.totalKeys}</p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active Keys
              </p>
              <p className="font-mono text-2xl font-semibold">{data.stats.activeKeys}</p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Requests
              </p>
              <p className="font-mono text-2xl font-semibold">
                {data.stats.totalRequests.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Revoked Keys
              </p>
              <p className="font-mono text-2xl font-semibold">{data.stats.revokedKeys}</p>
            </div>
          </div>

          {/* Keys Table */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              {data.keys.length > 0 ? (
                <table className="w-full">
                  <thead className="border-b border-foreground/10">
                    <tr>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Key
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Name
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        User
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Created
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Last Used
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Requests
                      </th>
                      <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keys.map((key) => (
                      <tr
                        key={key.id}
                        className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                      >
                        <td className="py-4 px-6">
                          <code className="font-mono text-sm bg-background px-2 py-1 rounded">
                            {key.keyPreview}
                          </code>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">{key.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {key.user}
                            </p>
                            <p className="font-mono text-xs text-foreground/60">
                              {key.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">{key.created}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {key.lastUsed}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm">
                            {key.requests.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                              key.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {key.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <Key className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
                  <p className="font-mono text-sm text-foreground/60">
                    No API keys created yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
