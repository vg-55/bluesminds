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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom">
          API Keys
        </h1>
        <p className="text-gray-400 [text-shadow:_0_2px_10px_rgb(0_0_0_/_50%)] font-open-sans-custom text-lg">
          Manage your API keys for accessing the gateway
        </p>
      </div>

      {/* Create Key Button */}
      <div className="flex justify-end">
        <CreateApiKeyDialog />
      </div>

      {/* Info Card */}
      <div className="relative group bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent backdrop-blur-xl border border-blue-400/20 rounded-2xl p-6 shadow-[0_8px_32px_rgba(59,130,246,0.15)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.25)] transition-all duration-300">
        <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-base font-semibold text-white [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom mb-2">
            Keep your API keys secure
          </h3>
          <p className="text-sm text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom leading-relaxed">
            API keys provide access to your account. Never share them publicly or commit them to version control.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      <ApiKeysList apiKeys={apiKeys || []} />
    </div>
  )
}
