// ============================================================================
// API DOCS PAGE
// ============================================================================

import type { Metadata } from 'next'
import { readFile } from 'fs/promises'
import { join } from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'

export const metadata: Metadata = {
  title: 'API Documentation - BluesMinds AI Gateway',
  description: 'Complete API reference for BluesMinds AI Gateway. Learn how to integrate with our unified API.',
}

export default async function ApiDocsPage() {
  // Read the API documentation markdown file
  let apiDocsContent = ''
  try {
    const filePath = join(process.cwd(), 'API_DOCS.md')
    apiDocsContent = await readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('Error reading API_DOCS.md:', error)
    apiDocsContent = 'Error loading API documentation. Please try again later.'
  }

  return (
    <DocsLayout>
      <article className="prose prose-invert prose-lg max-w-none prose-headings:font-sentient prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:mt-8 prose-h3:mb-4 prose-p:text-foreground/80 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-strong:font-semibold prose-table:border-collapse prose-th:border prose-th:border-foreground/20 prose-th:bg-foreground/5 prose-th:p-3 prose-td:border prose-td:border-foreground/20 prose-td:p-3 prose-pre:bg-transparent prose-pre:p-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: ({ node, inline, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : 'text'
              const codeString = String(children).replace(/\n$/, '')

              if (!inline && match) {
                return (
                  <CodeBlock
                    code={codeString}
                    language={language as any}
                  />
                )
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
          }}
        >
          {apiDocsContent}
        </ReactMarkdown>
      </article>
    </DocsLayout>
  )
}
