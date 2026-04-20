'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { startOfWeek, subWeeks, format, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'
import { analyzeTransactions } from '@/lib/insights-engine'

interface WeekSummary {
  label: string
  total: number
  count: number
  weekStart: string
  byCategory: Record<string, number>
  dailySpend: { day: string; amount: number }[]
  topCategory: string
  lateNightPct: number
}

export default function WeeklyPage() {
  const supabase = createClient()
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadWeeklyData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const summaries: WeekSummary[] = []

    for (let w = 0; w < 4; w++) {
      const weekStart = format(startOfWeek(subWeeks(new Date(), w), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(subWeeks(new Date(), w), { weekStartsOn: 1 }), 'yyyy-MM-dd')

      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', weekStart)
        .lte('transaction_date', weekEnd)

      const transactions: Transaction[] = txns || []
      const analysis = analyzeTransactions(transactions)

      // Daily breakdown
      const days = eachDayOfInterval({
        start: parseISO(weekStart),
        end: parseISO(weekEnd),
      })
      const dailySpend = days.map(d => ({
        day: format(d, 'EEE'),
        amount: analysis.byDay[format(d, 'yyyy-MM-dd')] || 0,
      }))

      const topCat = Object.entries(analysis.byCategory).sort((a, b) => b[1] - a[1])[0]

      summaries.push({
        label: w === 0 ? 'This Week' : w === 1 ? 'Last Week' : `${w}w ago`,
        total: analysis.totalSpent,
        count: transactions.length,
        weekStart,
        byCategory: analysis.byCategory,
        dailySpend,
        topCategory: topCat?.[0] || '—',
        lateNightPct: analysis.lateNightPercent,
      })
    }

    setWeeks(summaries)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadWeeklyData() }, [loadWeeklyData])

  const current = weeks[selectedWeek]
  const prev = weeks[selectedWeek + 1]
  const changeAmt = current && prev ? current.total - prev.total : 0
  const changePct = prev?.total ? (changeAmt / prev.total) * 100 : 0

  const CAT_EMOJI: Record<string, string> = {
    'Food & Drinks': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️',
    'Entertainment': '🎬', 'Utilities': '⚡', 'Health': '💊',
    'Snacks': '🍿', 'Lifestyle': '✨', 'Essentials': '🛒', 
    'Credit Card Bills & EMIs': '💳', 'Health Insurance': '🏥', 'Uncategorized': '📦',
  }

  const COLORS = ['#F5A623', '#4CC9F0', '#FF6B6B', '#06D6A0', '#FFD166', '#C77DFF']

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">

        <h1 className="font-display text-2xl font-bold mb-6">Weekly Summary</h1>

        {/* Week selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {weeks.map((w, i) => (
            <button key={i} onClick={() => setSelectedWeek(i)}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                selectedWeek === i ? 'bg-rupee-amber text-rupee-void' : 'btn-ghost'
              }`}>
              {w.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer h-24 rounded-3xl" />
            ))}
          </div>
        )}

        {!loading && current && (
          <>
            {/* Total + Change */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-5 mb-4">
              <p className="text-xs text-rupee-text-dim mb-1">{current.label} total</p>
              <p className="font-mono font-bold text-3xl text-rupee-amber mb-3">
                ₹{Math.round(current.total).toLocaleString('en-IN')}
              </p>

              {prev && prev.total > 0 && (
                <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${
                  changeAmt > 0
                    ? 'bg-rupee-coral/10 text-rupee-coral'
                    : changeAmt < 0
                    ? 'bg-rupee-mint/10 text-rupee-mint'
                    : 'bg-white/5 text-rupee-text-dim'
                }`}>
                  {changeAmt > 0 ? <TrendingUp size={14} /> : changeAmt < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {Math.abs(Math.round(changePct))}% {changeAmt > 0 ? 'more' : changeAmt < 0 ? 'less' : ''} than {prev.label.toLowerCase()}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <div className="flex-1 bg-white/4 rounded-xl p-3">
                  <p className="text-xs text-rupee-text-dim">Transactions</p>
                  <p className="font-mono font-bold text-lg">{current.count}</p>
                </div>
                <div className="flex-1 bg-white/4 rounded-xl p-3">
                  <p className="text-xs text-rupee-text-dim">Top Category</p>
                  <p className="font-bold text-sm truncate">{CAT_EMOJI[current.topCategory] || ''} {current.topCategory}</p>
                </div>
                <div className="flex-1 bg-white/4 rounded-xl p-3">
                  <p className="text-xs text-rupee-text-dim">Late Night</p>
                  <p className="font-mono font-bold text-lg">{Math.round(current.lateNightPct)}%</p>
                </div>
              </div>
            </motion.div>

            {/* Daily bar chart */}
            {current.count > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-3xl p-5 mb-4">
                <h2 className="font-display font-bold text-sm mb-4">Daily spend</h2>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={current.dailySpend} barSize={28}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false}
                        tick={{ fill: '#9090A8', fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                        formatter={(v: number) => [`₹${Math.round(v).toLocaleString('en-IN')}`, '']}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 2, 2]}>
                        {current.dailySpend.map((_, i) => (
                          <Cell key={i} fill={current.dailySpend[i].amount > 0 ? '#F5A623' : '#2A2A3A'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* 4-week comparison bar */}
            {weeks.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-3xl p-5 mb-4">
                <h2 className="font-display font-bold text-sm mb-4">4-week comparison</h2>
                <div className="space-y-2">
                  {[...weeks].reverse().map((w, i) => {
                    const max = Math.max(...weeks.map(wk => wk.total), 1)
                    const pct = (w.total / max) * 100
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-rupee-text-dim w-14 text-right">{w.label}</span>
                        <div className="flex-1 h-6 bg-white/4 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.1 + 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-lg"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <span className="text-xs font-mono text-rupee-text w-16">
                          ₹{Math.round(w.total / 1000).toFixed(1)}k
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Category breakdown */}
            {Object.keys(current.byCategory).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-3xl p-5">
                <h2 className="font-display font-bold text-sm mb-4">By category</h2>
                <div className="space-y-3">
                  {Object.entries(current.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt], i) => {
                      const pct = (amt / current.total) * 100
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">{CAT_EMOJI[cat] || '📦'} {cat}</span>
                            <span className="text-xs font-mono text-rupee-amber">
                              ₹{Math.round(amt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/4 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.05 + 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                              className="h-full rounded-full"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </motion.div>
            )}

            {current.count === 0 && (
              <div className="glass-card rounded-3xl p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-rupee-text-dim">No transactions for {current.label.toLowerCase()}</p>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
