// ============================================================================
// PARAMETER TABLE COMPONENT
// ============================================================================

'use client'

import { Badge } from '@/components/ui/badge'

export interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
  default?: string
}

interface ParameterTableProps {
  parameters: Parameter[]
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Parameter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Required
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr
                key={param.name}
                className={`${
                  index !== parameters.length - 1 ? 'border-b border-foreground/5' : ''
                } hover:bg-foreground/5 transition-colors duration-200`}
              >
                <td className="px-4 py-3">
                  <code className="text-sm font-mono text-primary">{param.name}</code>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-accent">{param.type}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={param.required ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {param.required ? 'Required' : 'Optional'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground/80 space-y-1">
                    <p>{param.description}</p>
                    {param.default && (
                      <p className="text-xs text-foreground/60">
                        Default: <code className="font-mono">{param.default}</code>
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4 p-4">
        {parameters.map((param) => (
          <div
            key={param.name}
            className="space-y-3 p-4 rounded-lg bg-foreground/[0.02] border border-foreground/10"
          >
            <div className="flex items-start justify-between gap-2">
              <code className="text-sm font-mono text-primary">{param.name}</code>
              <Badge
                variant={param.required ? 'default' : 'secondary'}
                className="text-xs"
              >
                {param.required ? 'Required' : 'Optional'}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-foreground/60">Type: </span>
              <span className="text-sm font-mono text-accent">{param.type}</span>
            </div>
            <p className="text-sm text-foreground/80">{param.description}</p>
            {param.default && (
              <p className="text-xs text-foreground/60">
                Default: <code className="font-mono">{param.default}</code>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
