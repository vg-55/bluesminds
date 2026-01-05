"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RedemptionCode {
  id: string;
  code: string;
  requests: number;
  type: "one-time" | "multi-use" | "unlimited";
  maxUses?: number;
  currentUses: number;
  status: "active" | "expired" | "depleted";
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    requests: 100,
    type: "multi-use" as "one-time" | "multi-use" | "unlimited",
    maxUses: 100,
    expiresAt: "",
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/codes');
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Failed to load codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ["all", "active", "expired", "depleted"];

  const filteredCodes = codes.filter((code) => {
    const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || code.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCodes = codes.length;
  const activeCodes = codes.filter((c) => c.status === "active").length;
  const totalRedemptions = codes.reduce((sum, c) => sum + c.currentUses, 0);
  const requestsDistributed = codes.reduce((sum, c) => sum + c.requests * c.currentUses, 0);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const newCode = await res.json();
        setCodes([newCode, ...codes]);
        setShowGenerateModal(false);
        setFormData({
          requests: 100,
          type: "multi-use",
          maxUses: 100,
          expiresAt: "",
        });
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteCode = async (id: string) => {
    if (confirm("Are you sure you want to delete this code?")) {
      try {
        const res = await fetch(`/api/admin/codes?id=${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setCodes(codes.filter((c) => c.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete code:', error);
      }
    }
  };

  const exportCodes = () => {
    const csv = [
      ["Code", "Requests", "Type", "Max Uses", "Current Uses", "Status", "Created", "Expires"],
      ...filteredCodes.map((code) => [
        code.code,
        code.requests,
        code.type,
        code.maxUses || "Unlimited",
        code.currentUses,
        code.status,
        code.createdAt,
        code.expiresAt || "Never",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redemption-codes.csv";
    a.click();
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

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-sentient mb-2">
                Redemption <i className="font-light">Codes</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Generate and manage promotional codes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="font-mono" onClick={exportCodes}>
                <Download className="w-4 h-4 mr-2" />
                [Export]
              </Button>
              <Button className="font-mono" onClick={() => setShowGenerateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                [Generate Code]
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Total Codes</p>
              <p className="font-mono text-2xl font-semibold">{totalCodes}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Active Codes</p>
              <p className="font-mono text-2xl font-semibold">{activeCodes}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Total Redemptions</p>
              <p className="font-mono text-2xl font-semibold">{totalRedemptions}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Requests Distributed</p>
              <p className="font-mono text-2xl font-semibold">
                {requestsDistributed.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
              <input
                type="text"
                placeholder="Search codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors appearance-none"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Codes Table */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-foreground/10">
                  <tr>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Code
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Requests
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Type
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Uses
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Created
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Expires
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code) => (
                    <tr
                      key={code.id}
                      className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-semibold">{code.code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedCode === code.code ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm font-semibold text-primary">
                          {code.requests.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">{code.type}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          {code.currentUses}
                          {code.maxUses ? ` / ${code.maxUses}` : " / ∞"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                            code.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : code.status === "expired"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {code.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                          {code.status === "expired" && <Clock className="w-3 h-3" />}
                          {code.status === "depleted" && <XCircle className="w-3 h-3" />}
                          {code.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          {new Date(code.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : "Never"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCode(code.id)}
                          className="font-mono text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredCodes.length === 0 && (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                No codes found matching your filters
              </p>
            </div>
          )}
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-foreground/10 rounded-lg w-full max-w-md p-6">
              <h2 className="font-sentient text-2xl mb-4">
                Generate <i className="font-light">Code</i>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                    Request Amount
                  </label>
                  <input
                    type="number"
                    value={formData.requests}
                    onChange={(e) =>
                      setFormData({ ...formData, requests: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                    Code Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "one-time" | "multi-use" | "unlimited",
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                  >
                    <option value="one-time">One-time use</option>
                    <option value="multi-use">Multi-use (limited)</option>
                    <option value="unlimited">Unlimited uses</option>
                  </select>
                </div>

                {formData.type === "multi-use" && (
                  <div>
                    <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) =>
                        setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={generating}
                  className="flex-1 font-mono"
                >
                  [Cancel]
                </Button>
                <Button onClick={handleGenerate} disabled={generating} className="flex-1 font-mono">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      [Generating...]
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      [Generate]
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRoute>
  );
}
