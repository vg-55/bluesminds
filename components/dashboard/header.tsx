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
    <header className="bg-slate-900/30 dark:bg-slate-900/30 bg-white/80 backdrop-blur-xl border-b border-white/5 dark:border-white/5 border-slate-200">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="Logo"
            width={28}
            height={28}
            className="object-contain"
          />
          <h1 className="text-lg font-medium text-white dark:text-white text-slate-900 font-open-sans-custom">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-400 dark:text-gray-400 text-slate-600 hover:text-white dark:hover:text-white hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-slate-900/5 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* User Menu */}
          <div className="flex items-center gap-3 bg-white/5 dark:bg-white/5 bg-slate-900/5 backdrop-blur-sm border border-white/10 dark:border-white/10 border-slate-200 rounded-lg px-3 py-2">
            <div className="text-right">
              <p className="text-sm font-medium text-white dark:text-white text-slate-900 font-open-sans-custom">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-slate-600 font-open-sans-custom">
                {user.email}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-gray-400 dark:text-gray-400 text-slate-600 hover:text-white dark:hover:text-white hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 hover:bg-slate-900/5 transition-colors h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
