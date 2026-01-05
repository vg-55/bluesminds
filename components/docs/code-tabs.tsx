// ============================================================================
// CODE TABS COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'

export interface CodeExample {
  label: string
  language: string
  code: string
}

interface CodeTabsProps {
  examples: CodeExample[]
  className?: string
}

export function CodeTabs({ examples, className }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-foreground/10">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
              activeTab === index
                ? 'text-primary border-primary'
                : 'text-foreground/60 hover:text-foreground border-transparent'
            )}
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* Code Content */}
      <CodeBlock
        code={examples[activeTab].code}
        language={examples[activeTab].language}
        showLineNumbers={false}
      />
    </div>
  )
}
