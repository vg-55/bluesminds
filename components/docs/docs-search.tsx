// ============================================================================
// DOCS SEARCH COMPONENT
// ============================================================================

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation } from './docs-nav'

interface SearchResult {
  title: string
  href: string
  section: string
}

export function DocsSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const searchDocs = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const lowerQuery = searchQuery.toLowerCase()
    const allResults: SearchResult[] = []

    navigation.forEach((section) => {
      section.links.forEach((link) => {
        if (link.name.toLowerCase().includes(lowerQuery)) {
          allResults.push({
            title: link.name,
            href: link.href,
            section: section.title,
          })
        }
      })
    })

    setResults(allResults)
  }, [])

  useEffect(() => {
    searchDocs(query)
  }, [query, searchDocs])

  const handleResultClick = (href: string) => {
    router.push(href)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={cn(
            'w-full pl-10 pr-10 py-2 rounded-lg',
            'bg-foreground/5 border border-foreground/10',
            'text-sm text-foreground placeholder:text-foreground/40',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
            'transition-all duration-200'
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={`${result.href}-${index}`}
                onClick={() => handleResultClick(result.href)}
                className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors border-b border-foreground/5 last:border-b-0"
              >
                <div className="text-sm font-medium text-foreground">
                  {result.title}
                </div>
                <div className="text-xs text-foreground/60 mt-1">
                  {result.section}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-lg shadow-xl p-4 z-50">
          <p className="text-sm text-foreground/60">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
