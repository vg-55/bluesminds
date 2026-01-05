// ============================================================================
// DOCS SIDEBAR COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation } from './docs-nav'

interface DocsSidebarProps {
  className?: string
  onLinkClick?: () => void
}

export function DocsSidebar({ className, onLinkClick }: DocsSidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<string[]>(
    navigation.map((section) => section.title)
  )

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  return (
    <nav className={cn('space-y-6', className)}>
      {navigation.map((section) => {
        const isOpen = openSections.includes(section.title)
        return (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full group mb-3"
            >
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider group-hover:text-foreground/80 transition-colors">
                {section.title}
              </h3>
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-foreground/40" />
              ) : (
                <ChevronRight className="w-3 h-3 text-foreground/40" />
              )}
            </button>
            {isOpen && (
              <ul className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onLinkClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5 border border-transparent'
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{link.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
