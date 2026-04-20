'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { InsightCard as InsightCardType, Transaction, WeeklyMetrics } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import HabitScoreRing from '@/components/insights/HabitScoreRing'
import InsightCard from '@/components/insights/InsightCard'
import SpendingChart from '@/components/insights/SpendingChart'
import { analyzeTransactions, computeHabitScore } from '@/lib/insights-engine'
import { getPreviousRollingWindow, getRollingWindow } from '@/lib/insight-window'

export default function DashboardPage() {
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [insights, setInsights] = useState<InsightCardType[]>([])
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null)
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [transactionCount, setTransactionCount] = useState(0)
  const [totalTransactionCount, setTotalTransactionCount] = useState(0)

  const periodDays = 7
  const { startDate: periodStart, endDate: periodEnd } = getRollingWindow(periodDays)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setUserName(user.email?.split('@')[0] || user.phone?.slice(-4) || 'there')

    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    setTotalTransactionCount(totalCount || 0)

    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd)
      .order('transaction_date', { ascending: false })

    const transactions: Transaction[] = txns || []
    setTransactionCount(transactions.length)

    if (transactions.length > 0) {
      const analysis = analyzeTransactions(transactions)
      const cd = Object.entries(analysis.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }))
      setChartData(cd)

      const hs = computeHabitScore(analysis, transactions)
      setMetrics({
        id: '',
        user_id: user.id,
        week_start: periodStart,
        total_spent: analysis.totalSpent,
        top_category: cd[0]?.name,
        habit_score: hs.score as 'controlled' | 'moderate' | 'risky',
        habit_score_value: hs.value,
        transaction_count: transactions.length,
        late_night_percent: analysis.lateNightPercent,
        created_at: new Date().toISOString(),
      })
    } else {
      setChartData([])
      setMetrics(null)
    }

    const { data: insightData } = await supabase
      .from('insight_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', periodStart)
      .order('created_at', { ascending: false })
      .limit(10)

    if (insightData && insightData.length > 0) {
      setInsights(insightData)
    } else if (transactions.length > 0) {
      await generateInsights(user.id, transactions)
    } else {
      setInsights([])
    }

    setLoading(false)
  }, [periodEnd, periodStart, supabase])

  async function generateInsights(userId: string, transactions: Transaction[]) {
    setGenerating(true)
    try {
      const prevWindow = getPreviousRollingWindow(periodDays)
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
          transactions,
          periodStart,
          periodDays,
          prevPeriodTotal,
        }),
      })
      const { insights: generated } = await res.json()

      const toInsert = generated.map((ins: Omit<InsightCardType, 'id' | 'user_id' | 'created_at'>) => ({
        ...ins,
        user_id: userId,
      }))
      const { data: saved } = await supabase
        .from('insight_cards')
        .insert(toInsert)
        .select()

      if (saved) setInsights(saved)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  async function markRead(id: string) {
    await supabase.from('insight_cards').update({ is_read: true }).eq('id', id)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i))
  }

  async function handleRefreshInsights() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('insight_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start', periodStart)

    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd)

    if (txns && txns.length > 0) {
      await generateInsights(user.id, txns)
    } else {
      setInsights([])
    }
  }

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-dvh">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse-slow">👁</div>
          <p className="text-rupee-text-dim text-sm">Loading your lens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <p className="text-rupee-text-dim text-sm">Hey {userName} 👋</p>
            <h1 className="font-display text-2xl font-bold">Your Money Lens</h1>
          </div>
          <button onClick={() => { loadData(); handleRefreshInsights() }} className="w-9 h-9 btn-ghost rounded-xl flex items-center justify-center">
            <RefreshCw size={16} />
          </button>
        </motion.div>

        {totalTransactionCount === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl p-8 text-center mb-6">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-display text-xl font-bold mb-2">No data yet</h2>
            <p className="text-rupee-text-dim text-sm mb-6">
              Import your UPI transactions to start seeing insights about your spending habits.
            </p>
            <Link href="/import"
              className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm">
              <Plus size={16} /> Add Transactions
            </Link>
          </motion.div>
        ) : transactionCount === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-3xl p-8 text-center mb-6">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="font-display text-xl font-bold mb-2">No transactions in last 7 days</h2>
            <p className="text-rupee-text-dim text-sm mb-6">
              You have transaction history, but no activity in the recent 7-day window.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/transactions"
                className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm">
                View History
              </Link>
              <Link href="/import"
                className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm">
                <Plus size={16} /> Add Recent
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-3xl p-5 mb-5">
              <div className="flex items-center gap-6">
                {metrics && (
                  <HabitScoreRing score={metrics.habit_score} value={metrics.habit_score_value} size={110} />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-rupee-text-dim mb-0.5">Last 7 days</p>
                    <p className="font-mono font-bold text-2xl text-rupee-amber">
                      ₹{Math.round(metrics?.total_spent || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/4 rounded-xl p-2">
                      <p className="text-xs text-rupee-text-dim">Transactions</p>
                      <p className="font-mono font-bold">{transactionCount}</p>
                    </div>
                    <div className="bg-white/4 rounded-xl p-2">
                      <p className="text-xs text-rupee-text-dim">Late night</p>
                      <p className="font-mono font-bold">{Math.round(metrics?.late_night_percent || 0)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {chartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-3xl p-5 mb-5">
                <h2 className="font-display font-bold text-base mb-4">Where it went</h2>
                <SpendingChart data={chartData} />
              </motion.div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-bold text-base">Your Insights</h2>
              {generating && (
                <div className="flex items-center gap-2 text-xs text-rupee-text-dim">
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </div>
              )}
            </div>

            {insights.length === 0 && !generating && (
              <div className="glass-card rounded-2xl p-5 text-center">
                <p className="text-rupee-text-dim text-sm">Insights will appear here after analysis</p>
              </div>
            )}

            <div className="space-y-3">
              {insights.map((card, i) => (
                <InsightCard key={card.id} card={card} index={i} onRead={markRead} />
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
