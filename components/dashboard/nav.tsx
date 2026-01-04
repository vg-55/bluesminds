// ============================================================================
// DASHBOARD NAVIGATION
// ============================================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Key,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  Server,
  Users,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'API Keys',
    href: '/dashboard/keys',
    icon: Key,
  },
  {
    name: 'Usage',
    href: '/dashboard/usage',
    icon: BarChart3,
  },
  {
    name: 'Logs',
    href: '/dashboard/logs',
    icon: FileText,
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    name: 'Servers',
    href: '/dashboard/admin/servers',
    icon: Server,
    adminOnly: true,
  },
  {
    name: 'Users',
    href: '/dashboard/admin/users',
    icon: Users,
    adminOnly: true,
  },
]

export function DashboardNav({
  userTier,
  userEmail,
  isAdmin = false,
}: {
  userTier: string
  userEmail: string
  isAdmin?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="w-72 bg-slate-900/50 dark:bg-slate-900/50 bg-white/80 backdrop-blur-xl border-r border-white/5 dark:border-white/5 border-slate-200 min-h-screen relative">
      <div className="px-3 py-6 space-y-1">
        {navItems.map((item) => {
          // Hide admin items for non-admins
          if (item.adminOnly && !isAdmin) return null

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-open-sans-custom',
                isActive
                  ? 'bg-white/10 dark:bg-white/10 bg-slate-900/5 text-white dark:text-white text-slate-900'
                  : 'text-gray-400 dark:text-gray-400 text-slate-600 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-slate-900/5 hover:text-gray-200 dark:hover:text-gray-200 hover:text-slate-900'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* Tier Badge */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg p-4 border border-white/10 dark:border-white/10 border-slate-200">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-400 text-slate-600 uppercase tracking-wider font-open-sans-custom">
            Current Plan
          </p>
          <p className="text-xl font-semibold text-white dark:text-white text-slate-900 capitalize mt-1 font-open-sans-custom">
            {userTier}
          </p>
          {userTier === 'free' && (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 text-xs font-medium mt-3 px-3 py-1.5 bg-white/10 dark:bg-white/10 bg-slate-900/10 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-slate-900/20 rounded-md transition-colors font-open-sans-custom text-white dark:text-white text-slate-900"
            >
              Upgrade →
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
