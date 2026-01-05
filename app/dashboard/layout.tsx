// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
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
    <div className="min-h-screen bg-background">
      <DashboardNav userTier={profile.tier} userEmail={user.email || ''} isAdmin={isAdmin} />

      <div className="ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
