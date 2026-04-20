'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InsightCard as InsightCardType, Transaction } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import InsightCard from '@/components/insights/InsightCard'
import { getPreviousRollingWindow, getRollingLabel, getRollingWindow } from '@/lib/insight-window'

const INSIGHT_TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pattern', label: 'Habits' },
  { id: 'timing', label: 'Timing' },
  { id: 'frequency', label: 'Frequency' },
  { id: 'health', label: 'Health' },
]

const RANGE_OPTIONS = [7, 15, 30] as const

export default function InsightsPage() {
  const supabase = createClient()
  const [insights, setInsights] = useState<InsightCardType[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [rangeDays, setRangeDays] = useState<number>(7)

  const { startDate: periodStart, endDate: periodEnd } = getRollingWindow(rangeDays)
  const periodLabel = getRollingLabel(rangeDays)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('insight_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', periodStart)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      const seen = new Set<string>()
      const toDelete: string[] = []
      const uniqueInsights = data.filter(card => {
        if (seen.has(card.title)) {
          toDelete.push(card.id)
          return false
        }
        seen.add(card.title)
        return true
      })

      if (toDelete.length > 0) {
        await supabase.from('insight_cards').delete().in('id', toDelete)
      }

      setInsights(uniqueInsights)
    } else {
      await generateForRange(user.id)
    }

    setLoading(false)
  }, [periodStart, supabase])

  async function generateForRange(userId: string) {
    setGenerating(true)

    try {
      const { data: existing } = await supabase
        .from('insight_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', periodStart)
        .limit(1)

      if (existing && existing.length > 0) {
        const { data } = await supabase
          .from('insight_cards')
          .select('*')
          .eq('user_id', userId)
          .eq('week_start', periodStart)
          .order('created_at', { ascending: false })
        setInsights(data || [])
        return
      }

      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', periodStart)
        .lte('transaction_date', periodEnd)

      if (!txns || txns.length === 0) {
        setInsights([])
        return
      }

      const prevWindow = getPreviousRollingWindow(rangeDays)
      const { data: prevTxns } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('transaction_date', prevWindow.startDate)
        .lte('transaction_date', prevWindow.endDate)

      const prevPeriodTotal = (prevTxns || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)

      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: txns as Transaction[],
          periodStart,
          periodDays: rangeDays,
          prevPeriodTotal,
        }),
      })
      const { insights: generated } = await res.json()

      const toInsert = generated.map((ins: Omit<InsightCardType, 'id' | 'user_id' | 'created_at'>) => ({
        ...ins,
        user_id: userId,
      }))
      const { data: saved } = await supabase.from('insight_cards').insert(toInsert).select()
      setInsights(saved || [])
    } finally {
      setGenerating(false)
    }
  }

  async function markRead(id: string) {
    await supabase.from('insight_cards').update({ is_read: true }).eq('id', id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i))
  }

  useEffect(() => { loadInsights() }, [loadInsights])

  useEffect(() => {
    const channel = supabase
      .channel(`insights:${periodStart}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'insight_cards', filter: `week_start=eq.${periodStart}` },
        () => { loadInsights() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadInsights, periodStart, supabase])

  const filtered = filter === 'all' ? insights : insights.filter(i => i.insight_type === filter)
  const unreadCount = insights.filter(i => !i.is_read).length

  async function handleRefresh() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('insight_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start', periodStart)

    await generateForRange(user.id)
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Insights</h1>
            <p className="text-xs text-rupee-text-dim mt-0.5">{periodLabel}</p>
            {unreadCount > 0 && (
              <p className="text-xs text-rupee-amber mt-0.5">{unreadCount} new</p>
            )}
          </div>
          <button onClick={handleRefresh} className="w-9 h-9 btn-ghost rounded-xl flex items-center justify-center">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {RANGE_OPTIONS.map(days => (
            <button key={days} onClick={() => setRangeDays(days)}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                rangeDays === days ? 'bg-rupee-amber text-rupee-void' : 'btn-ghost'
              }`}>
              Last {days}d
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {INSIGHT_TYPE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.id ? 'bg-white/10 text-rupee-text' : 'text-rupee-text-dim'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {(loading || generating) && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-rupee-amber" />
            <p className="text-sm text-rupee-text-dim">
              {generating ? 'Analyzing spending patterns...' : 'Loading...'}
            </p>
          </div>
        )}

        {!loading && !generating && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-display font-bold text-lg mb-2">No insights yet</p>
            <p className="text-rupee-text-dim text-sm">
              No transaction data found for the {periodLabel}.
            </p>
          </motion.div>
        )}

        {!loading && !generating && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((card, i) => (
              <InsightCard key={card.id} card={card} index={i} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
