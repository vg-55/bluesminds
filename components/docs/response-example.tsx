// ============================================================================
// API RESPONSE EXAMPLE COMPONENT
// ============================================================================

import { CodeBlock } from './code-block'

interface ResponseExampleProps {
  title?: string
  status: number
  statusText: string
  body: object | string
  headers?: Record<string, string>
}

export function ResponseExample({
  title = 'Response',
  status,
  statusText,
  body,
  headers,
}: ResponseExampleProps) {
  const responseBody = typeof body === 'string' ? body : JSON.stringify(body, null, 2)

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold text-foreground/80">{title}</h4>}

      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground/[0.02] border border-foreground/10">
        <span className="text-xs font-mono text-foreground/60">Status:</span>
        <span
          className={`text-sm font-bold ${
            status >= 200 && status < 300
              ? 'text-green-400'
              : status >= 400
              ? 'text-red-400'
              : 'text-yellow-400'
          }`}
        >
          {status} {statusText}
        </span>
      </div>

      {headers && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            Headers
          </h5>
          <div className="px-4 py-3 rounded-lg bg-foreground/[0.02] border border-foreground/10">
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm font-mono">
                <span className="text-primary">{key}:</span>
                <span className="text-foreground/60">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CodeBlock code={responseBody} language="json" showLineNumbers={false} />
    </div>
  )
}
