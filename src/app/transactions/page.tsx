'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Category } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import { format, parseISO } from 'date-fns'
import { getPreviousRollingWindow, getRollingWindow } from '@/lib/insight-window'

const CATEGORIES: Category[] = [
  'Food & Drinks', 'Transport', 'Shopping', 'Entertainment',
  'Utilities', 'Health', 'Snacks', 'Lifestyle', 'Essentials', 
  'Credit Card Bills & EMIs', 'Health Insurance', 'Uncategorized',
]

const CAT_EMOJI: Record<string, string> = {
  'Food & Drinks': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️',
  'Entertainment': '🎬', 'Utilities': '⚡', 'Health': '💊',
  'Snacks': '🍿', 'Lifestyle': '✨', 'Essentials': '🛒', 
  'Credit Card Bills & EMIs': '💳', 'Health Insurance': '🏥', 'Uncategorized': '📦',
}

// Helper to regenerate insights after transaction changes
async function regenerateRollingInsights(userId: string, supabase: ReturnType<typeof createClient>) {
  try {
    for (const days of [7, 15, 30]) {
      const window = getRollingWindow(days)
      const prevWindow = getPreviousRollingWindow(days)

      await supabase
        .from('insight_cards')
        .delete()
        .eq('user_id', userId)
        .eq('week_start', window.startDate)

      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', window.startDate)
        .lte('transaction_date', window.endDate)

      if (!txns || txns.length === 0) continue

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
          transactions: txns,
          periodStart: window.startDate,
          periodDays: days,
          prevPeriodTotal,
        }),
      })
      const { insights } = await res.json()

      if (insights && insights.length > 0) {
        const toInsert = insights.map((ins: Record<string, unknown>) => ({
          ...ins,
          user_id: userId,
        }))
        await supabase.from('insight_cards').insert(toInsert)
      }
    }
  } catch (error) {
    console.error('Error regenerating rolling insights:', error)
  }
}

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Transaction>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })

    if (!error && data) {
      setTransactions(data)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!editingId) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No auth token')

      const res = await fetch('/api/update-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: editingId, ...editForm }),
      })

      if (res.ok) {
        const { transaction } = await res.json()
        setTransactions(prev =>
          prev.map(t => t.id === editingId ? transaction : t)
        )
        setEditingId(null)
        
        // Regenerate insights after transaction update
        await regenerateRollingInsights(user.id, supabase)
      } else {
        const error = await res.json()
        console.error('Error:', error)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No auth token')

      const res = await fetch('/api/update-transaction', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id))
        
        // Regenerate insights after transaction deletion
        await regenerateRollingInsights(user.id, supabase)
      } else {
        const error = await res.json()
        console.error('Error:', error)
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleting(null)
    }
  }

  function startEdit(txn: Transaction) {
    setEditingId(txn.id)
    setEditForm({
      amount: txn.amount,
      category: txn.category,
      merchant: txn.merchant,
      remarks: txn.remarks,
      transaction_date: txn.transaction_date,
      transaction_time: txn.transaction_time,
    })
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-dvh">
        <p className="text-rupee-text-dim">Loading transactions…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="w-9 h-9 btn-ghost rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center glass-card rounded-2xl p-8">
            <p className="text-rupee-text-dim">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-card rounded-2xl p-4 transition-all ${
                  editingId === txn.id ? 'ring-2 ring-rupee-amber' : ''
                }`}
              >
                {editingId === txn.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-rupee-text-dim mb-1">Amount</label>
                      <input
                        type="number"
                        value={editForm.amount || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                        className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-rupee-text-dim mb-1">Category</label>
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, category: e.target.value as Category }))}
                        className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-rupee-text-dim mb-1">Merchant</label>
                      <input
                        type="text"
                        value={editForm.merchant || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, merchant: e.target.value }))}
                        placeholder="e.g., Swiggy"
                        className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-rupee-text-dim mb-1">Date</label>
                        <input
                          type="date"
                          value={editForm.transaction_date || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, transaction_date: e.target.value }))}
                          className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-rupee-text-dim mb-1">Time</label>
                        <input
                          type="time"
                          value={editForm.transaction_time || ''}
                          onChange={(e) => setEditForm(p => ({ ...p, transaction_time: e.target.value }))}
                          className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-rupee-text-dim mb-1">Notes</label>
                      <input
                        type="text"
                        value={editForm.remarks || ''}
                        onChange={(e) => setEditForm(p => ({ ...p, remarks: e.target.value }))}
                        placeholder="Optional note"
                        className="rupee-input w-full rounded-lg py-2 px-3 text-sm"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-sm btn-ghost"
                      >
                        <X size={14} className="inline mr-1" /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm btn-primary flex items-center gap-1"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{CAT_EMOJI[txn.category] || '📦'}</span>
                        <span className="font-mono font-bold text-rupee-amber">₹{txn.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-xs text-rupee-text-dim">
                        {txn.merchant || txn.category} · {format(parseISO(txn.transaction_date), 'MMM dd, yyyy')}
                      </p>
                      {txn.remarks && <p className="text-xs text-rupee-text-dim mt-1">💬 {txn.remarks}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(txn)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg btn-ghost text-rupee-mint hover:bg-rupee-mint/10"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(txn.id)}
                        disabled={deleting === txn.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg btn-ghost text-rupee-coral hover:bg-rupee-coral/10"
                      >
                        {deleting === txn.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
