"use client";

import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { FileText, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

interface AuditLog {
  id: string;
  type: "info" | "warning" | "error" | "success";
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

const mockLogs: AuditLog[] = [
  {
    id: "1",
    type: "success",
    action: "User Login",
    user: "alice@example.com",
    details: "Successful login from IP 192.168.1.1",
    timestamp: "2024-01-03 14:32:15",
  },
  {
    id: "2",
    type: "info",
    action: "API Key Created",
    user: "bob@example.com",
    details: "Created new API key: bm_live_***3456",
    timestamp: "2024-01-03 14:28:42",
  },
  {
    id: "3",
    type: "warning",
    action: "Rate Limit Exceeded",
    user: "carol@example.com",
    details: "User exceeded rate limit (1000 req/min)",
    timestamp: "2024-01-03 14:15:23",
  },
  {
    id: "4",
    type: "error",
    action: "Failed Payment",
    user: "david@example.com",
    details: "Payment failed for invoice #INV-2024-001",
    timestamp: "2024-01-03 13:56:08",
  },
  {
    id: "5",
    type: "success",
    action: "Plan Upgraded",
    user: "eve@example.com",
    details: "Upgraded from Starter to Professional plan",
    timestamp: "2024-01-03 13:42:19",
  },
  {
    id: "6",
    type: "info",
    action: "Settings Changed",
    user: "admin@bluesminds.com",
    details: "Updated platform rate limits",
    timestamp: "2024-01-03 12:18:34",
  },
  {
    id: "7",
    type: "warning",
    action: "High API Usage",
    user: "frank@example.com",
    details: "Usage exceeded 90% of monthly quota",
    timestamp: "2024-01-03 11:45:52",
  },
  {
    id: "8",
    type: "error",
    action: "Provider Timeout",
    user: "system",
    details: "OpenAI API timeout - request ID: req_abc123",
    timestamp: "2024-01-03 10:23:41",
  },
];

export default function AdminLogsPage() {
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
                {mockLogs.filter((l) => l.type === "info").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="font-mono text-sm text-foreground/60">Success</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {mockLogs.filter((l) => l.type === "success").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="font-mono text-sm text-foreground/60">Warnings</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {mockLogs.filter((l) => l.type === "warning").length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="font-mono text-sm text-foreground/60">Errors</p>
              </div>
              <p className="font-mono text-2xl font-semibold">
                {mockLogs.filter((l) => l.type === "error").length}
              </p>
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-3">
            {mockLogs.map((log) => (
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
