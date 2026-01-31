'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Sparkles, Github, Mail, ArrowRight } from 'lucide-react'
import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)

    // Simulate magic link send
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setEmailSent(true)
    setIsLoading(false)
  }

  const handleGithubLogin = async () => {
    setIsLoading(true)
    // In production, redirect to Supabase OAuth
    // const { data, error } = await supabase.auth.signInWithOAuth({
    //   provider: 'github',
    //   options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` }
    // })

    // Simulate for demo
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push(redirect)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center" padding="lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h1>
            <p className="text-neutral-600 mb-6">
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Use a different email
            </button>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full" padding="lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
            <p className="text-neutral-600 mt-1">Sign in to submit and save resources</p>
          </div>

          {/* GitHub Login */}
          <Button
            onClick={handleGithubLogin}
            variant="secondary"
            size="lg"
            className="w-full mb-4"
            isLoading={isLoading}
          >
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-500">or continue with email</span>
            </div>
          </div>

          {/* Email Login */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Send magic link
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Terms */}
          <p className="text-xs text-neutral-500 text-center mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-orange-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </Card>
      </main>

      <Footer />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
