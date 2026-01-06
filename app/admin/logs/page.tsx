"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { FileText, AlertTriangle, CheckCircle2, Info, XCircle, Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  type: "info" | "warning" | "error" | "success";
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

interface AuditLogData {
  logs: Array<{
    id: string;
    action_type: string;
    resource_type: string;
    resource_id?: string;
    action_description: string;
    admin_user: {
      email: string;
      full_name?: string;
    };
    old_values?: any;
    new_values?: any;
    ip_address?: string;
    created_at: string;
  }>;
  total: number;
}

export default function AdminLogsPage() {
  const [data, setData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/audit?limit=50');

      if (!res.ok) {
        throw new Error('Failed to load audit logs');
      }

      const logsData = await res.json();
      setData(logsData);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Map audit logs to display format
  const formatLogs = (): AuditLog[] => {
    if (!data?.logs) return [];

    return data.logs.map((log) => {
      // Determine type based on action
      let type: AuditLog["type"] = "info";
      if (log.action_type === "delete" || log.action_type === "deactivate") {
        type = "warning";
      } else if (log.action_type === "create" || log.action_type === "activate") {
        type = "success";
      }

      // Format details
      let details = log.action_description;
      if (log.resource_type && log.resource_id) {
        details += ` [${log.resource_type}: ${log.resource_id.substring(0, 8)}...]`;
      }
      if (log.ip_address) {
        details += ` from ${log.ip_address}`;
      }

      return {
        id: log.id,
        type,
        action: `${log.action_type.toUpperCase()}: ${log.resource_type}`,
        user: log.admin_user?.email || 'Unknown',
        details,
        timestamp: new Date(log.created_at).toLocaleString(),
      };
    });
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

  const logs = formatLogs();

  if (logs.length === 0) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-sentient mb-2">
                Audit <i className="font-light">Logs</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Track all system events and user actions
              </p>
            </div>
            <div className="p-12 text-center rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <FileText className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
              <p className="font-mono text-sm text-foreground/60">
                No audit logs recorded yet
              </p>
            </div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }
  const getIcon = (type: AuditLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: AuditLog["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-sentient mb-2">
              Audit <i className="font-light">Logs</i>
            </h1>
            <p className="font-mono text-sm text-foreground/60">
              Track all system events and user actions
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-5 h-5 text-blue-500" />
                <p className="font-mono text-sm text-foreground/60">Info</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {logs.filter((l) => l.type === "info").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="font-mono text-sm text-foreground/60">Success</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {logs.filter((l) => l.type === "success").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="font-mono text-sm text-foreground/60">Warnings</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {logs.filter((l) => l.type === "warning").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="font-mono text-sm text-foreground/60">Errors</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {logs.filter((l) => l.type === "error").length}
              </p>
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border ${getTypeColor(log.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{getIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-semibold mb-1">
                          {log.action}
                        </p>
                        <p className="font-mono text-xs text-foreground/60 mb-1">
                          {log.details}
                        </p>
                        <p className="font-mono text-xs text-foreground/60">
                          User: {log.user}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-foreground/60 whitespace-nowrap">
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
