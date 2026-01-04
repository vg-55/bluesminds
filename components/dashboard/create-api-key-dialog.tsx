// ============================================================================
// CREATE API KEY DIALOG
// ============================================================================

'use client'

import { useState } from 'react'
import { Plus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const availableScopes = [
  { id: 'chat.completions', label: 'Chat Completions' },
  { id: 'completions', label: 'Completions' },
  { id: 'embeddings', label: 'Embeddings' },
  { id: 'models', label: 'Models' },
]

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['chat.completions'])
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      })

      if (response.ok) {
        const result = await response.json()
        setCreatedKey(result.data.key)
      }
    } catch (error) {
      console.error('Failed to create key', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName('')
    setScopes(['chat.completions'])
    setCreatedKey(null)
    setCopied(false)
    if (createdKey) {
      window.location.reload()
    }
  }

  const toggleScope = (scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((s) => s !== scopeId)
        : [...prev, scopeId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.3)] transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
            Create API Key
          </DialogTitle>
          <DialogDescription className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
            {createdKey
              ? 'Save this key securely. You won\'t be able to see it again!'
              : 'Create a new API key to access the gateway'}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
              <Label className="text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                Your new API key
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm font-mono break-all text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">
                  {createdKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 transition-all"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-400/5 to-transparent backdrop-blur-xl border border-yellow-400/20 rounded-xl p-4">
              <p className="text-sm text-yellow-200 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                <strong>Important:</strong> Copy this key now. For security reasons, you won't be able to view it again.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold transition-all"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                Name
              </Label>
              <Input
                id="name"
                placeholder="My API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom"
              />
            </div>

            <div>
              <Label className="text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                Scopes
              </Label>
              <div className="space-y-2 mt-2">
                {availableScopes.map((scope) => (
                  <div key={scope.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={scope.id}
                      checked={scopes.includes(scope.id)}
                      onCheckedChange={() => toggleScope(scope.id)}
                      className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <label
                      htmlFor={scope.id}
                      className="text-sm font-medium text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {scope.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={!name || scopes.length === 0 || creating}
                className="flex-1 bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold transition-all"
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold backdrop-blur-sm transition-all"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
