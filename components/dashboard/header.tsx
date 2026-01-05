// ============================================================================
// DASHBOARD HEADER
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import type { User as UserType } from '@/lib/types'

export function DashboardHeader({ user }: { user: UserType }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="ml-64 bg-foreground/[0.02] backdrop-blur-2xl border-b border-foreground/10 sticky top-0 z-30">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="Logo"
            width={28}
            height={28}
            className="object-contain"
          />
          <h1 className="text-lg font-medium text-foreground">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-300"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* User Menu */}
          <div className="flex items-center gap-3 bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 rounded-lg px-4 py-2 hover:border-foreground/20 transition-all duration-300">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-foreground/60">
                {user.email}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
