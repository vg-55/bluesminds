// ============================================================================
// QUICK ACTIONS COMPONENT
// ============================================================================

'use client'

import Link from 'next/link'
import { Plus, FileCode, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  return (
    <div className="flex gap-4 flex-wrap">
      <Link href="/dashboard/keys">
        <Button className="bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.3)] transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </Link>

      <Link href="/docs">
        <Button
          variant="outline"
          className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold backdrop-blur-sm transition-all"
        >
          <Book className="w-4 h-4 mr-2" />
          View Documentation
        </Button>
      </Link>

      <Button
        variant="outline"
        className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold backdrop-blur-sm transition-all"
        onClick={() => {
          const code = `from openai import OpenAI

client = OpenAI(
    base_url="${process.env.NEXT_PUBLIC_APP_URL}/api/v1",
    api_key="your_api_key_here"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`

          navigator.clipboard.writeText(code)
          alert('Example code copied to clipboard!')
        }}
      >
        <FileCode className="w-4 h-4 mr-2" />
        Copy Example Code
      </Button>
    </div>
  )
}
