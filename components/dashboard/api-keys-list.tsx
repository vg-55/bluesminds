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
      <div className="relative group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)] transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <p className="relative z-10 text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
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
          className="relative group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
                  {key.name}
                </h3>
                {key.is_active ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-400/30 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">
                    {key.key_prefix}{'*'.repeat(24)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(key.key_prefix)}
                    className="text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    RPM: <span className="font-medium text-white">{key.rate_limit_rpm}</span>
                  </span>
                  <span className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    TPM: <span className="font-medium text-white">{key.rate_limit_tpm.toLocaleString()}</span>
                  </span>
                  <span className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    Daily: <span className="font-medium text-white">{key.quota_daily.toLocaleString()}</span>
                  </span>
                  <span className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    Monthly: <span className="font-medium text-white">{key.quota_monthly.toLocaleString()}</span>
                  </span>
                </div>

                <div className="text-xs text-gray-500 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && (
                    <span> · Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem
                  onClick={() => handleRotate(key.id)}
                  disabled={rotatingId === key.id}
                  className="text-gray-300 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rotate Key
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
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
                className="bg-white/5 text-gray-300 border-white/20 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom"
              >
                {scope}
              </Badge>
            ))}
          </div>

          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      ))}
    </div>
  )
}
