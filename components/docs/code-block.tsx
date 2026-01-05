// ============================================================================
// CODE BLOCK COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        <SyntaxHighlighter
          language={language === 'curl' ? 'bash' : language}
          style={vscDarkPlus}
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
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
