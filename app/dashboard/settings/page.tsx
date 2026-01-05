// ============================================================================
// SETTINGS PAGE
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Mail,
  Building,
  Save,
  Loader2,
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  company_name?: string
  tier: string
  status: string
  role?: string
  credits_balance?: number
  referral_code?: string
  created_at?: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setFullName(data.full_name || '')
        setCompanyName(data.company_name || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          company_name: companyName,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="ml-64 p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-foreground/60 text-lg">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-500'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 border border-foreground/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Profile Information
            </h2>
            <p className="text-sm text-foreground/60">
              Update your personal and company information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-2 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground/60 cursor-not-allowed"
            />
            <p className="text-xs text-foreground/60 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name (optional)"
              className="w-full px-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10 border border-foreground/10">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Account Information
            </h2>
            <p className="text-sm text-foreground/60">
              View your account status and tier
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
            <span className="text-sm text-foreground/60">Account Status</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                profile?.status === 'active'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                  : 'bg-red-500/10 text-red-500 border border-red-500/30'
              }`}
            >
              {profile?.status || 'Unknown'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
            <span className="text-sm text-foreground/60">Current Plan</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30 capitalize">
              {profile?.tier || 'Free'}
            </span>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 border border-foreground/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Additional Information
            </h2>
            <p className="text-sm text-foreground/60">
              View your account details and referral code
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {profile?.credits_balance !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
              <span className="text-sm text-foreground/60">Credits Balance</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                ${profile.credits_balance.toFixed(2)}
              </span>
            </div>
          )}

          {profile?.referral_code && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
              <span className="text-sm text-foreground/60">Referral Code</span>
              <span className="px-3 py-1 rounded text-xs font-mono bg-foreground/5 text-foreground border border-foreground/10">
                {profile.referral_code}
              </span>
            </div>
          )}

          {profile?.role && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
              <span className="text-sm text-foreground/60">Role</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/30 capitalize">
                {profile.role}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}
