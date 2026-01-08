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
  CreditCard,
  Settings,
  BookOpen,
  Server,
  Users,
  Gift,
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
    name: 'Referrals',
    href: '/dashboard/referrals',
    icon: Gift,
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
    name: 'Documentation',
    href: '/docs',
    icon: BookOpen,
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
  referralsEnabled = true,
}: {
  userTier: string
  userEmail: string
  isAdmin?: boolean
  referralsEnabled?: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 z-40 h-screen w-64 bg-foreground/[0.02] backdrop-blur-2xl border-r border-foreground/10 flex flex-col">
      <div className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          // Hide admin items for non-admins
          if (item.adminOnly && !isAdmin) return null

          // Hide referrals if not enabled
          if (item.href === '/dashboard/referrals' && !referralsEnabled) return null

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium font-mono transition-all duration-300',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5 hover:border-foreground/10 border border-transparent'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* Tier Badge */}
      <div className="p-4 border-t border-foreground/10">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-md rounded-xl p-4 border border-foreground/10 hover:border-primary/30 transition-all duration-300">
          <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider font-mono">
            Current Plan
          </p>
          <p className="text-xl font-semibold text-foreground capitalize mt-1 font-mono">
            {userTier}
          </p>
          {userTier === 'free' && (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 text-xs font-medium font-mono mt-3 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-lg transition-all duration-300 text-primary"
            >
              Upgrade →
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
