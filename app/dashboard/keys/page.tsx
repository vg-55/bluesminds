// ============================================================================
// API KEYS MANAGEMENT PAGE
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { ApiKeysList } from '@/components/dashboard/api-keys-list'
import { CreateApiKeyDialog } from '@/components/dashboard/create-api-key-dialog'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ApiKeysPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's API keys
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="ml-64 p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          API Keys
        </h1>
        <p className="text-foreground/60 text-lg">
          Manage your API keys for accessing the gateway
        </p>
      </div>

      {/* Create Key Button */}
      <div className="flex justify-end">
        <CreateApiKeyDialog />
      </div>

      {/* Info Card */}
      <div className="relative group bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
        <div className="absolute inset-0 bg-foreground/[0.02] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Keep your API keys secure
          </h3>
          <p className="text-sm text-foreground/70 leading-relaxed">
            API keys provide access to your account. Never share them publicly or commit them to version control.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      <ApiKeysList apiKeys={apiKeys || []} />
    </div>
  )
}
