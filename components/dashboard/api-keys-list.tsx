// ============================================================================
// API KEYS LIST COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Eye, EyeOff, Trash2, RefreshCw, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ApiKey } from '@/lib/types'

export function ApiKeysList({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Add toast notification
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setRevokingId(id)
    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to revoke key', error)
    } finally {
      setRevokingId(null)
    }
  }

  const handleRotate = async (id: string) => {
    if (!confirm('Rotate this API key? The old key will be revoked and a new one will be generated.')) {
      return
    }

    setRotatingId(id)
    try {
      const response = await fetch(`/api/keys/${id}/rotate`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        // Show the new key
        alert(`New API Key: ${result.data.key}\n\nSave this key securely - you won't be able to see it again!`)
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to rotate key', error)
    } finally {
      setRotatingId(null)
    }
  }

  if (apiKeys.length === 0) {
    return (
      <div className="relative group bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 rounded-xl p-12 text-center hover:border-foreground/20 transition-colors">
        <p className="relative z-10 text-foreground/60 font-mono">
          No API keys yet. Create one to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((key) => (
        <div
          key={key.id}
          className="relative group bg-foreground/[0.02] backdrop-blur-xl border border-foreground/10 rounded-xl p-6 hover:bg-foreground/5 hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground font-mono">
                  {key.name}
                </h3>
                {key.is_active ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground/60 border-foreground/20">
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-foreground/80">
                    {key.key_prefix}{'*'.repeat(24)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(key.key_prefix)}
                    className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-foreground/60 font-mono">
                    RPM: <span className="font-medium text-foreground">{key.rate_limit_rpm}</span>
                  </span>
                  <span className="text-foreground/60 font-mono">
                    TPM: <span className="font-medium text-foreground">{key.rate_limit_tpm.toLocaleString()}</span>
                  </span>
                  <span className="text-foreground/60 font-mono">
                    Daily: <span className="font-medium text-foreground">{key.quota_daily.toLocaleString()}</span>
                  </span>
                  <span className="text-foreground/60 font-mono">
                    Monthly: <span className="font-medium text-foreground">{key.quota_monthly.toLocaleString()}</span>
                  </span>
                </div>

                <div className="text-xs text-foreground/60 font-mono">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && (
                    <span> · Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-foreground/10">
                <DropdownMenuItem
                  onClick={() => handleRotate(key.id)}
                  disabled={rotatingId === key.id}
                  className="text-foreground hover:text-foreground hover:bg-foreground/10 focus:bg-foreground/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rotate Key
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoke
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Scopes */}
          <div className="mt-4 flex flex-wrap gap-2">
            {key.scopes.map((scope) => (
              <Badge
                key={scope}
                variant="outline"
                className="bg-foreground/5 text-foreground/80 border-foreground/20 font-mono"
              >
                {scope}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
