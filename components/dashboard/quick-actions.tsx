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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </Link>

      <Link href="/docs">
        <Button
          variant="outline"
          className="border-foreground/30 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:border-foreground/50 font-mono backdrop-blur-sm transition-colors"
        >
          <Book className="w-4 h-4 mr-2" />
          View Documentation
        </Button>
      </Link>

      <Button
        variant="outline"
        className="border-foreground/30 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:border-foreground/50 font-mono backdrop-blur-sm transition-colors"
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
