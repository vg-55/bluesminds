"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import {
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralData {
  id: string;
  referrer: {
    name: string;
    email: string;
  };
  referee: {
    name: string;
    email: string;
  };
  status: "pending" | "active" | "completed";
  signupDate: string;
  completionDate?: string;
  reward: number;
}

interface ReferralSettings {
  referrerRewardType: "fixed" | "percentage";
  referrerRewardValue: number;
  refereeRewardType: "fixed" | "percentage";
  refereeRewardValue: number;
  minPurchaseAmount: number;
  enabled: boolean;
}

interface TopReferrer {
  name: string;
  email: string;
  count: number;
  earned: number;
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settings, setSettings] = useState<ReferralSettings>({
    referrerRewardType: "fixed",
    referrerRewardValue: 50,
    refereeRewardType: "fixed",
    refereeRewardValue: 10,
    minPurchaseAmount: 100,
    enabled: true,
  });

  useEffect(() => {
    loadReferrals();
    loadSettings();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
        setTopReferrers(data.topReferrers || []);
      }
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/referrals/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const statusOptions = ["all", "pending", "active", "completed"];

  const saveSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/admin/referrals/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      referral.referrer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referrer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referee.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter((r) => r.status === "completed").length;
  const totalRewardsPaid = referrals.reduce((sum, r) => sum + r.reward, 0);
  const conversionRate = totalReferrals > 0 ? ((completedReferrals / totalReferrals) * 100).toFixed(1) : 0;

  const exportReferralData = () => {
    const csv = [
      ["Referrer Name", "Referrer Email", "Referee Name", "Referee Email", "Status", "Signup Date", "Reward"],
      ...filteredReferrals.map((ref) => [
        ref.referrer.name,
        ref.referrer.email,
        ref.referee.name,
        ref.referee.email,
        ref.status,
        ref.signupDate,
        ref.reward,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referrals-data.csv";
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
                Referral <i className="font-light">Program</i>
              </h1>
              <p className="font-mono text-sm text-foreground/60">
                Monitor and manage platform-wide referral activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="font-mono"
                onClick={() => setSettingsModalOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                [Configure Rewards]
              </Button>
              <Button className="font-mono" onClick={exportReferralData}>
                <Download className="w-4 h-4 mr-2" />
                [Export Data]
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Total Referrals</p>
              <p className="font-mono text-2xl font-semibold">{totalReferrals}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Completed</p>
              <p className="font-mono text-2xl font-semibold">{completedReferrals}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Total Rewards Paid</p>
              <p className="font-mono text-2xl font-semibold">${totalRewardsPaid}</p>
            </div>

            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <p className="font-mono text-sm text-foreground/60 mb-1">Conversion Rate</p>
              <p className="font-mono text-2xl font-semibold">{conversionRate}%</p>
            </div>
          </div>

          {/* Top Referrers */}
          <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
            <h2 className="text-xl font-sentient mb-4">
              Top <i className="font-light">Referrers</i>
            </h2>
            <div className="space-y-3">
              {topReferrers.map((referrer, idx) => (
                <div
                  key={referrer.email}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-foreground/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-mono text-sm font-semibold text-primary">
                        #{idx + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{referrer.name}</p>
                      <p className="font-mono text-xs text-foreground/60">{referrer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{referrer.count} referrals</p>
                    <p className="font-mono text-xs text-foreground/60">${referrer.earned} earned</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/60" />
              <input
                type="text"
                placeholder="Search referrers or referees..."
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

          {/* Referrals Table */}
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-foreground/10">
                  <tr>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Referrer
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Referee
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Signup Date
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Completion Date
                    </th>
                    <th className="text-left py-4 px-6 font-mono text-sm uppercase tracking-wide text-foreground/60">
                      Reward
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-foreground/10 last:border-0 hover:bg-foreground/5"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-mono text-sm font-medium">{referral.referrer.name}</p>
                          <p className="font-mono text-xs text-foreground/60">
                            {referral.referrer.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-mono text-sm font-medium">{referral.referee.name}</p>
                          <p className="font-mono text-xs text-foreground/60">
                            {referral.referee.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-mono text-xs ${
                            referral.status === "completed"
                              ? "bg-green-500/10 text-green-500"
                              : referral.status === "active"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {referral.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                          {referral.status === "active" && <Clock className="w-3 h-3" />}
                          {referral.status === "pending" && <XCircle className="w-3 h-3" />}
                          {referral.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          {new Date(referral.signupDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">
                          {referral.completionDate
                            ? new Date(referral.completionDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            referral.reward > 0 ? "text-green-500" : "text-foreground/60"
                          }`}
                        >
                          {referral.reward > 0 ? `$${referral.reward}` : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredReferrals.length === 0 && (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <p className="font-mono text-sm text-foreground/60">
                No referrals found matching your filters
              </p>
            </div>
          )}
        </div>

        {/* Referral Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-foreground/10 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-foreground/10 flex items-center justify-between">
                <div>
                  <h2 className="font-sentient text-2xl mb-2">
                    Referral <i className="font-light">Settings</i>
                  </h2>
                  <p className="font-mono text-sm text-foreground/60">
                    Configure reward amounts and program settings
                  </p>
                </div>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* Program Status */}
                  <div className="p-4 rounded-lg bg-foreground/[0.02] border border-foreground/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-mono text-sm font-medium">
                          Referral Program Status
                        </label>
                        <p className="font-mono text-xs text-foreground/60 mt-1">
                          Enable or disable the entire referral program
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enabled}
                          onChange={(e) =>
                            setSettings({ ...settings, enabled: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  {/* Referrer Rewards */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-mono font-semibold text-lg mb-1">
                        Referrer Rewards
                      </h3>
                      <p className="font-mono text-xs text-foreground/60">
                        Reward for users who invite others
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                          Reward Type
                        </label>
                        <select
                          value={settings.referrerRewardType}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              referrerRewardType: e.target.value as "fixed" | "percentage",
                            })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                        >
                          <option value="fixed">Fixed Amount ($)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                          Reward Value
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.referrerRewardValue}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                referrerRewardValue: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                            placeholder="50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-foreground/60">
                            {settings.referrerRewardType === "fixed" ? "$" : "%"}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-foreground/40 mt-1">
                          {settings.referrerRewardType === "fixed"
                            ? `Referrer gets $${settings.referrerRewardValue} per successful referral`
                            : `Referrer gets ${settings.referrerRewardValue}% of referee's first purchase`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Referee Rewards */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-mono font-semibold text-lg mb-1">
                        Referee Rewards
                      </h3>
                      <p className="font-mono text-xs text-foreground/60">
                        Reward for new users who sign up via referral link
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                          Reward Type
                        </label>
                        <select
                          value={settings.refereeRewardType}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              refereeRewardType: e.target.value as "fixed" | "percentage",
                            })
                          }
                          className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                        >
                          <option value="fixed">Fixed Amount ($)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                          Reward Value
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.refereeRewardValue}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                refereeRewardValue: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                            placeholder="10"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-foreground/60">
                            {settings.refereeRewardType === "fixed" ? "$" : "%"}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-foreground/40 mt-1">
                          {settings.refereeRewardType === "fixed"
                            ? `New user gets $${settings.refereeRewardValue} credit upon signup`
                            : `New user gets ${settings.refereeRewardValue}% off their first purchase`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Minimum Purchase */}
                  <div className="space-y-2">
                    <label className="block font-mono text-sm font-medium uppercase tracking-wide">
                      Minimum Purchase Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-foreground/60">
                        $
                      </span>
                      <input
                        type="number"
                        value={settings.minPurchaseAmount}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            minPurchaseAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-8 pr-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm"
                        placeholder="100"
                      />
                    </div>
                    <p className="font-mono text-xs text-foreground/40">
                      Referee must spend at least ${settings.minPurchaseAmount} for referrer to receive reward
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-mono text-sm font-semibold text-blue-400 mb-2">
                      Preview
                    </h3>
                    <div className="space-y-1 font-mono text-xs text-blue-300">
                      <p>
                        • Referrer earns:{" "}
                        {settings.referrerRewardType === "fixed"
                          ? `$${settings.referrerRewardValue}`
                          : `${settings.referrerRewardValue}% of purchase`}
                      </p>
                      <p>
                        • Referee gets:{" "}
                        {settings.refereeRewardType === "fixed"
                          ? `$${settings.refereeRewardValue} credit`
                          : `${settings.refereeRewardValue}% discount`}
                      </p>
                      <p>• Minimum purchase required: ${settings.minPurchaseAmount}</p>
                      <p>• Program status: {settings.enabled ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-foreground/10 flex items-center justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setSettingsModalOpen(false)}
                  disabled={settingsLoading}
                  className="font-mono"
                >
                  [Cancel]
                </Button>
                <Button onClick={saveSettings} disabled={settingsLoading} className="font-mono">
                  {settingsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      [Saving...]
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      [Save Settings]
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
