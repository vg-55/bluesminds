"use client";

import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Zap, DollarSign, Bell, Loader2, Save, RotateCcw } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    newUserSignups: true,
    emailNotifications: true,
    rateLimitDefault: "1000",
    defaultUserTier: "free",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          maintenanceMode: data.maintenanceMode,
          newUserSignups: data.newUserSignups,
          emailNotifications: data.emailNotifications,
          rateLimitDefault: String(data.rateLimitDefault),
          defaultUserTier: data.defaultUserTier,
        });
        setLastUpdated(data.updatedAt);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          rateLimitDefault: parseInt(settings.rateLimitDefault),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastUpdated(data.updatedAt);
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
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

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8 max-w-4xl">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-sentient mb-2">
              Platform <i className="font-light">Settings</i>
            </h1>
            <p className="font-mono text-sm text-foreground/60">
              Configure platform-wide settings and defaults
            </p>
          </div>

          {/* System Settings */}
          <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-mono uppercase tracking-wide">
                System Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-foreground/10">
                <div>
                  <p className="font-mono text-sm font-medium mb-1">
                    Maintenance Mode
                  </p>
                  <p className="font-mono text-xs text-foreground/60">
                    Temporarily disable access to the platform
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-foreground/10">
                <div>
                  <p className="font-mono text-sm font-medium mb-1">
                    Allow New User Signups
                  </p>
                  <p className="font-mono text-xs text-foreground/60">
                    Enable or disable new user registrations
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.newUserSignups}
                  onChange={(e) =>
                    setSettings({ ...settings, newUserSignups: e.target.checked })
                  }
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-foreground/10">
                <div>
                  <p className="font-mono text-sm font-medium mb-1">
                    Email Notifications
                  </p>
                  <p className="font-mono text-xs text-foreground/60">
                    Send email notifications for system events
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailNotifications: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-mono uppercase tracking-wide">
                Rate Limits
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                  Default Rate Limit (requests/minute)
                </label>
                <input
                  type="number"
                  value={settings.rateLimitDefault}
                  onChange={(e) =>
                    setSettings({ ...settings, rateLimitDefault: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Plan Defaults */}
          <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-mono uppercase tracking-wide">
                Plan Settings
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-sm mb-2 uppercase tracking-wide">
                  Default Tier for New Users
                </label>
                <select
                  value={settings.defaultUserTier}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultUserTier: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          {lastUpdated && (
            <div className="p-4 rounded-lg bg-foreground/[0.02] border border-foreground/10">
              <p className="font-mono text-xs text-foreground/60">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="font-mono"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  [Saving...]
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  [Save Changes]
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="font-mono"
              onClick={loadSettings}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              [Reload]
            </Button>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
