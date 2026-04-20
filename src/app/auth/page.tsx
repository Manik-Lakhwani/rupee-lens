'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Step = 'input' | 'sent' | 'success'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('input')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Listen for magic link callback — when user clicks the link in email,
  // Supabase redirects back and fires onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setStep('success')
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, router])

  async function handleSendLink() {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      return setError('Please enter a valid email address')
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // This tells Supabase to send magic link (default behaviour)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setStep('sent')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-6 pt-12 pb-8 min-h-dvh flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          {step === 'input' ? (
            <Link href="/" className="w-9 h-9 rounded-xl btn-ghost flex items-center justify-center">
              <ArrowLeft size={18} />
            </Link>
          ) : (
            <button onClick={() => { setStep('input'); setError('') }}
              className="w-9 h-9 rounded-xl btn-ghost flex items-center justify-center">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xl">👁</span>
            <span className="font-display font-bold text-lg">RupeeLens</span>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 1 — Email input */}
          {step === 'input' && (
            <motion.div key="input"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col">

              <h2 className="font-display text-3xl font-bold mb-2">Welcome</h2>
              <p className="text-rupee-text-dim mb-8">
                Enter your email — we'll send you a login link. No password needed.
              </p>

              {/* Email input */}
              <div className="mb-6">
                <label className="block text-sm text-rupee-text-dim mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rupee-text-dim" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                    placeholder="you@gmail.com"
                    className="rupee-input w-full rounded-2xl py-4 pl-11 pr-4 text-base"
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </div>

              <button onClick={handleSendLink} disabled={loading || !email.trim()}
                className="btn-primary w-full rounded-2xl py-4 text-base flex items-center justify-center gap-2 mb-4 disabled:opacity-50">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Sending…' : 'Send Login Link'}
              </button>

              <p className="text-center text-xs text-rupee-text-dim">
                We'll email you a magic link — just click it to sign in instantly.
              </p>
            </motion.div>
          )}

          {/* STEP 2 — Check your email */}
          {step === 'sent' && (
            <motion.div key="sent"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-4">

              {/* Animated envelope */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-6xl mb-6">
                📬
              </motion.div>

              <h2 className="font-display text-2xl font-bold mb-3">Check your inbox</h2>

              <p className="text-rupee-text-dim mb-2">
                We sent a login link to
              </p>
              <p className="font-medium text-rupee-amber mb-6 break-all">{email}</p>

              {/* Steps */}
              <div className="glass-card rounded-2xl p-4 w-full text-left space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-rupee-amber/20 text-rupee-amber text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                  <p className="text-sm text-rupee-text-dim">Open the email from <span className="text-rupee-text">Supabase</span> or <span className="text-rupee-text">RupeeLens</span></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-rupee-amber/20 text-rupee-amber text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                  <p className="text-sm text-rupee-text-dim">Click the <span className="text-rupee-text font-medium">"Log In"</span> link in the email</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-rupee-amber/20 text-rupee-amber text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                  <p className="text-sm text-rupee-text-dim">You'll be signed in automatically — this page will update</p>
                </div>
              </div>

              <p className="text-xs text-rupee-text-dim mb-4">
                Didn't get it? Check your spam folder.
              </p>

              <button onClick={() => { setStep('input'); setEmail(''); }}
                className="btn-ghost rounded-2xl px-6 py-3 text-sm">
                Try a different email
              </button>

              <button onClick={handleSendLink}
                className="mt-3 text-xs text-rupee-text-dim underline underline-offset-2">
                Resend link
              </button>
            </motion.div>
          )}

          {/* STEP 3 — Success */}
          {step === 'success' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="mb-4">
                <CheckCircle2 size={64} className="text-rupee-mint mx-auto" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold mb-2">You're in!</h2>
              <p className="text-rupee-text-dim">Taking you to your dashboard…</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
