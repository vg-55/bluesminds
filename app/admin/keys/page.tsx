"use client";

import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Key, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiKey {
  id: string;
  keyPreview: string;
  user: string;
  email: string;
  created: string;
  lastUsed: string;
  requests: number;
  status: "active" | "revoked";
}

const mockKeys: ApiKey[] = [
  {
    id: "1",
    keyPreview: "bm_live_abc123...xyz789",
    user: "Alice Johnson",
    email: "alice@example.com",
    created: "2024-01-15",
    lastUsed: "2 hours ago",
    requests: 45234,
    status: "active",
  },
  {
    id: "2",
    keyPreview: "bm_live_def456...uvw654",
    user: "Bob Smith",
    email: "bob@example.com",
    created: "2024-01-10",
    lastUsed: "5 hours ago",
    requests: 128456,
    status: "active",
  },
  {
    id: "3",
    keyPreview: "bm_test_ghi789...rst321",
    user: "Carol White",
    email: "carol@example.com",
    created: "2024-01-20",
    lastUsed: "1 day ago",
    requests: 8234,
    status: "active",
  },
  {
    id: "4",
    keyPreview: "bm_live_jkl012...opq098",
    user: "David Brown",
    email: "david@example.com",
    created: "2023-12-05",
    lastUsed: "7 days ago",
    requests: 23456,
    status: "revoked",
  },
];

export default function AdminKeysPage() {
  const [keys] = useState<ApiKey[]>(mockKeys);

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
              <p className="font-mono text-2xl font-semibold">{keys.length}</p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Active Keys
              </p>
              <p className="font-mono text-2xl font-semibold">
                {keys.filter((k) => k.status === "active").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Total Requests
              </p>
              <p className="font-mono text-2xl font-semibold">
                {keys
                  .reduce((sum, key) => sum + key.requests, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">
                Revoked Keys
              </p>
              <p className="font-mono text-2xl font-semibold">
                {keys.filter((k) => k.status === "revoked").length}
              </p>
            </div>
          </div>

          {/* Keys Table */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-foreground/10">
                  <tr>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Key
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
                  {keys.map((key) => (
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
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
