"use client";

import { useState } from "react";
import { AdminRoute } from "@/components/admin-route";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Zap, DollarSign, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    newUserSignups: true,
    emailNotifications: true,
    rateLimitDefault: "1000",
    defaultPlan: "starter",
  });

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
                  Default Plan for New Users
                </label>
                <select
                  value={settings.defaultPlan}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultPlan: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-background border border-foreground/10 focus:border-primary focus:outline-none font-mono text-sm transition-colors"
                >
                  <option value="starter">Starter (Free)</option>
                  <option value="professional">Professional ($99/mo)</option>
                  <option value="enterprise">Enterprise (Custom)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button className="font-mono">[Save Changes]</Button>
            <Button variant="outline" className="font-mono">
              [Reset to Defaults]
            </Button>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
