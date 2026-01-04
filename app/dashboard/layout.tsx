// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { adminEmails } from '@/lib/config/env'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active') {
    redirect('/login')
  }

  // Check if user is admin
  const isAdmin = adminEmails.includes(user.email || '')

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 bg-slate-50">
      {/* Subtle gradient orbs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.015] dark:opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(100,100,100,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,100,100,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 flex">
        <DashboardNav userTier={profile.tier} userEmail={user.email || ''} isAdmin={isAdmin} />

        <div className="flex-1 flex flex-col min-h-screen">
          <DashboardHeader user={profile} />

          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
