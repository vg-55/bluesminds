// ============================================================================
// SIGNUP PAGE
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { LiquidMetalBackground } from '@/components/liquid-metal-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    referral_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [referralsEnabled, setReferralsEnabled] = useState(false)

  // Check if referral program is enabled
  useEffect(() => {
    fetch('/api/referrals/enabled')
      .then(res => res.json())
      .then(data => setReferralsEnabled(data.enabled))
      .catch(() => setReferralsEnabled(false))
  }, [])

  // Read referral code from URL parameter
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode && referralsEnabled) {
      setFormData(prev => ({ ...prev, referral_code: refCode }))
    }
  }, [searchParams, referralsEnabled])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        // Check if email verification is needed
        if (result.data?.needs_verification) {
          setNeedsVerification(true)
          setSuccessMessage(
            result.message || 'Account created! Please check your email to verify your account.'
          )
        } else {
          // Email is auto-confirmed, redirect to dashboard
          setSuccessMessage(result.message || 'Account created successfully!')
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 1000)
        }
      } else {
        setError(result.error?.message || 'Signup failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    try {
      setLoading(true)
      setError('')

      // Store referral code in cookie for OAuth flow (expires in 1 hour)
      if (referralsEnabled && formData.referral_code) {
        document.cookie = `referral_code=${formData.referral_code}; path=/; max-age=3600; SameSite=Lax`
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        setError('Failed to sign in with GitHub')
        setLoading(false)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
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
              Get Started
            </h1>
            <p className="text-gray-300 [text-shadow:_0_2px_10px_rgb(0_0_0_/_50%)] font-open-sans-custom">
              Create your account and start building
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-sm text-red-200 [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)]">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-green-200 [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-medium">
                  {successMessage}
                </p>
                {needsVerification && (
                  <p className="text-xs text-green-300/80 [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] mt-2">
                    Didn't receive the email? Check your spam folder or{' '}
                    <Link href="/login" className="underline hover:text-white">
                      try logging in
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="full_name"
                className="text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-open-sans-custom"
              >
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all"
              />
            </div>

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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="you@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-open-sans-custom"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                placeholder="••••••••"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all"
              />
              <p className="text-xs text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {referralsEnabled && (
              <div className="space-y-2">
                <Label
                  htmlFor="referral_code"
                  className="text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] font-open-sans-custom"
                >
                  Referral Code <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="referral_code"
                  type="text"
                  value={formData.referral_code}
                  onChange={(e) =>
                    setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })
                  }
                  placeholder="Enter code"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] focus:border-white/40 focus:bg-white/15 transition-all uppercase"
                />
                {formData.referral_code && (
                  <p className="text-xs text-green-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    ✓ You&apos;ll receive bonus requests on signup
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold py-6 text-base shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.5)] transition-all"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGitHubSignIn}
              variant="outline"
              className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold py-6 text-base backdrop-blur-sm transition-all"
              disabled={loading}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Continue with GitHub
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link href="/login">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom font-semibold py-6 text-base backdrop-blur-sm transition-all"
              >
                Sign In
              </Button>
            </Link>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
