// ============================================================================
// LOGIN PAGE
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LiquidMetalBackground } from '@/components/liquid-metal-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(result.error?.message || 'Login failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <LiquidMetalBackground />

      <div className="fixed inset-0 z-[5] bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                <Image
                  src="/icon.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] mb-2 font-open-sans-custom">
              Welcome Back
            </h1>
            <p className="text-gray-300 [text-shadow:_0_2px_10px_rgb(0_0_0_/_50%)] font-open-sans-custom">
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-sm text-red-200 [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)]">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-open-sans-custom"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-open-sans-custom"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-gray-300 hover:text-white transition-colors [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold py-6 text-base shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.5)] transition-all"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                  New user?
                </span>
              </div>
            </div>

            <Link href="/signup">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold py-6 text-base backdrop-blur-sm transition-all"
              >
                Create Account
              </Button>
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
