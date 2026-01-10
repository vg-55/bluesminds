// ============================================================================
// FORGOT PASSWORD PAGE
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { LiquidMetalBackground } from '@/components/liquid-metal-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
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
              Reset Password
            </h1>
            <p className="text-gray-300 [text-shadow:_0_2px_10px_rgb(0_0_0_/_50%)] font-open-sans-custom">
              Enter your email to receive a password reset link
            </p>
          </div>

          {!success ? (
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

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold py-6 text-base shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.5)] transition-all"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white transition-colors [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-green-200 [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] text-center">
                  Password reset link has been sent to your email. Please check your inbox.
                </p>
              </div>

              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-300 hover:text-white transition-colors [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
