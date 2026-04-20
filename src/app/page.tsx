'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingDown, Clock, BarChart3 } from 'lucide-react'

const features = [
  { icon: BarChart3, label: 'Spending habits', color: '#F5A623' },
  { icon: Clock, label: 'Time patterns', color: '#4CC9F0' },
  { icon: TrendingDown, label: 'Weekly trends', color: '#06D6A0' },
]

const sampleInsights = [
  { emoji: '🍕', text: 'You ordered food 9 times this week, mostly after 10 PM', type: 'frequency' },
  { emoji: '☕', text: 'Daily chai habit costs ₹180 — ₹5,400/month', type: 'pattern' },
  { emoji: '🌙', text: '62% of your spending happens after 9 PM', type: 'timing' },
]

export default function WelcomePage() {
  return (
    <div className="app-shell overflow-hidden">
      <div className="ambient-glow" />

      {/* Hero */}
      <div className="relative z-10 px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rupee-amber to-rupee-amber-dim flex items-center justify-center">
              <span className="text-lg">👁</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">RupeeLens</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.1] tracking-tight mb-4">
            Where did your{' '}
            <span className="text-rupee-amber">money</span>{' '}
            actually go?
          </h1>
          <p className="text-rupee-text-dim text-lg leading-relaxed mb-10">
            RupeeLens turns your UPI transactions into clear spending habits — so you finally understand your money.
          </p>
        </motion.div>

        {/* Sample insight cards */}
        <div className="space-y-3 mb-10">
          {sampleInsights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl p-4 flex items-start gap-3 ${
                insight.type === 'frequency' ? 'insight-pattern' :
                insight.type === 'timing' ? 'insight-timing' : 'insight-frequency'
              }`}
            >
              <span className="text-2xl">{insight.emoji}</span>
              <p className="text-sm text-rupee-text leading-relaxed">{insight.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Features row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 mb-10"
        >
          {features.map((f, i) => (
            <div key={i} className="flex-1 glass-card rounded-xl p-3 text-center">
              <f.icon size={18} style={{ color: f.color }} className="mx-auto mb-1" />
              <span className="text-xs text-rupee-text-dim">{f.label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <Link href="/auth" className="btn-primary w-full rounded-2xl py-4 text-base flex items-center justify-center gap-2 no-underline">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <p className="text-center text-xs text-rupee-text-dim">
            No manual tracking • No strict budgets • Just clarity
          </p>
        </motion.div>
      </div>
    </div>
  )
}
