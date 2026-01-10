// ============================================================================
// CODE BLOCK COMPONENT
// ============================================================================

'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type SyntaxHighlighterComponent = React.ComponentType<{
  language?: string
  style?: unknown
  showLineNumbers?: boolean
  customStyle?: React.CSSProperties
  codeTagProps?: { style?: React.CSSProperties }
  children: string
}>

interface HighlighterState {
  SyntaxHighlighter: SyntaxHighlighterComponent | null
  style: unknown | null
}

interface CodeBlockProps {
  code: string
  language: 'typescript' | 'javascript' | 'python' | 'bash' | 'json' | 'curl'
  filename?: string
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [highlighter, setHighlighter] = useState<HighlighterState>({
    SyntaxHighlighter: null,
    style: null,
  })

  useEffect(() => {
    let cancelled = false

    // Dynamically import the heavy syntax highlighter only when a code block is actually rendered.
    // This keeps `/docs` initial JS smaller while preserving identical highlighting behavior.
    ;(async () => {
      const [{ Prism: SyntaxHighlighter }, { vscDarkPlus }] = await Promise.all([
        import('react-syntax-highlighter'),
        import('react-syntax-highlighter/dist/esm/styles/prism'),
      ])

      if (!cancelled) {
        setHighlighter({
          SyntaxHighlighter: SyntaxHighlighter as unknown as SyntaxHighlighterComponent,
          style: vscDarkPlus,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lang = language === 'curl' ? 'bash' : language

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-mono text-foreground/60">{filename}</span>
          )}
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/30">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all duration-300',
            copied
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'bg-foreground/5 text-foreground/60 hover:text-foreground hover:bg-foreground/10 border border-foreground/10 hover:border-foreground/20'
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto">
        {highlighter.SyntaxHighlighter ? (
          <highlighter.SyntaxHighlighter
            language={lang}
            style={highlighter.style ?? undefined}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.875rem',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              },
            }}
          >
            {code}
          </highlighter.SyntaxHighlighter>
        ) : (
          // Non-blocking fallback: render plain code immediately, then enhance once highlighter loads.
          <pre className="m-0 p-4 text-sm overflow-x-auto">
            <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  )
}
