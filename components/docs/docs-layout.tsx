// ============================================================================
// DOCS LAYOUT COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Home, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocsSidebar } from './docs-sidebar'
import { DocsSearch } from './docs-search'
import { DocsToc } from './docs-toc'

interface DocsLayoutProps {
  children: React.ReactNode
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(100,100,100,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,100,100,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-foreground/10">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Logo */}
              <Link href="/docs" className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xl font-heading font-bold text-foreground">
                  BluesMinds <span className="text-primary">Docs</span>
                </div>
              </Link>

              {/* Search - Desktop */}
              <div className="hidden md:block flex-1 max-w-md">
                <DocsSearch />
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
                >
                  <Gauge className="w-4 h-4" />
                  Dashboard
                </Link>
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors duration-200"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Search - Mobile */}
            <div className="md:hidden pb-4">
              <DocsSearch />
            </div>
          </div>
        </header>

        <div className="flex w-full">
          {/* Left Sidebar - Navigation */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-40 w-64 bg-background/95 backdrop-blur-xl border-r border-foreground/10 overflow-y-auto transition-transform duration-300 mt-16',
              'lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="p-6">
              <DocsSidebar onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
          </aside>

          {/* Mobile Overlay */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden mt-16"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 min-w-0">
            <div className="max-w-4xl mx-auto lg:mx-0">
              <article className="prose prose-invert prose-lg max-w-none">
                {children}
              </article>
            </div>
          </main>

          {/* Right Sidebar - Table of Contents */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-6">
              <DocsToc />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
