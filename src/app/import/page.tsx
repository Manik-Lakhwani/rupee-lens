'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Upload, PenLine, ChevronRight, X, Check, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'
import { ParsedSMSTransaction, Category } from '@/types'
import { parseBulkSMS } from '@/lib/sms-parser'
import { format } from 'date-fns'
import { getPreviousRollingWindow, getRollingWindow } from '@/lib/insight-window'

type Tab = 'sms' | 'upload' | 'manual'

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

// Helper to regenerate cached insights for rolling windows
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

export default function ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('sms')
  const [smsText, setSmsText] = useState('')
  const [parsed, setParsed] = useState<ParsedSMSTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Manual entry state
  const [manual, setManual] = useState({
    amount: '', category: 'Food & Drinks' as Category,
    merchant: '', date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'), remarks: '',
  })

  // --- SMS ---
  async function handleParseSMS() {
    if (!smsText.trim()) return
    setLoading(true)
    const messages = smsText.split('\n').filter(l => l.trim())

    // Try local parser first
    const local = parseBulkSMS(messages)
    if (local.length > 0) {
      setParsed(local)
      setLoading(false)
      return
    }
    // Fallback to AI
    try {
      const res = await fetch('/api/analyze-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      const data = await res.json()
      setParsed(data.transactions || [])
    } catch { setParsed([]) }
    setLoading(false)
  }

  // --- Upload ---
  async function handleUpload() {
    if (!uploadFile) return
    setLoading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', uploadFile)
    try {
      const res = await fetch('/api/parse-statement', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to parse statement')
      }
      setParsed((data.transactions || []).map((t: ParsedSMSTransaction) => ({
        ...t, raw_sms: `Uploaded from ${uploadFile.name}`,
      })))
    } catch (error) {
      console.error('Upload parse error:', error)
      setParsed([])
      setUploadError(error instanceof Error ? error.message : 'Failed to parse statement')
    }
    setLoading(false)
  }

  // --- Save to DB ---
  async function saveParsed() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = parsed.map(t => ({
      user_id: user.id,
      amount: t.amount,
      category: t.category,
      merchant: t.merchant || null,
      source: tab === 'upload' ? 'upload' : 'sms',
      raw_sms: t.raw_sms,
      transaction_date: t.date,
      transaction_time: t.time || null,
    }))

    await supabase.from('transactions').insert(rows)
    
    // Regenerate insights cache after importing transactions
    await regenerateRollingInsights(user.id, supabase)
    
    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1500)
    setSaving(false)
  }

  // --- Manual save ---
  async function saveManual() {
    if (!manual.amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: parseFloat(manual.amount),
      category: manual.category,
      merchant: manual.merchant || null,
      remarks: manual.remarks || null,
      source: 'manual',
      transaction_date: manual.date,
      transaction_time: manual.time || null,
    })
    
    // Regenerate insights cache after adding transaction
    await regenerateRollingInsights(user.id, supabase)
    
    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1200)
    setSaving(false)
  }

  function removeParsed(i: number) {
    setParsed(prev => prev.filter((_, idx) => idx !== i))
  }

  const tabs: { id: Tab; icon: typeof MessageSquare; label: string }[] = [
    { id: 'sms', icon: MessageSquare, label: 'Paste SMS' },
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'manual', icon: PenLine, label: 'Manual' },
  ]

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="w-9 h-9 btn-ghost rounded-xl flex items-center justify-center">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display text-2xl font-bold">Add Transactions</h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 glass-card rounded-2xl mb-6">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => { setTab(id); setParsed([]); setSaved(false); setUploadError(null) }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                tab === id ? 'bg-rupee-amber text-rupee-void' : 'text-rupee-text-dim'
              }`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* SMS TAB */}
          {tab === 'sms' && (
            <motion.div key="sms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {parsed.length === 0 ? (
                <>
                  <p className="text-rupee-text-dim text-sm mb-3">
                    Paste your UPI/bank SMS messages below. One SMS per line.
                  </p>
                  <textarea
                    value={smsText}
                    onChange={e => setSmsText(e.target.value)}
                    rows={8}
                    placeholder={`Your a/c XXXX1234 debited Rs.350 on 12-04-24 to VPA swiggy@upi\nRs.120.00 debited from a/c **5678 to PhonePe on 13-04-24`}
                    className="rupee-input w-full rounded-2xl p-4 text-sm resize-none mb-4 font-mono"
                  />
                  <button onClick={handleParseSMS} disabled={loading || !smsText.trim()}
                    className="btn-primary w-full rounded-2xl py-4 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? 'Analyzing…' : 'Analyze SMS'}
                  </button>
                </>
              ) : (
                <ParsedList parsed={parsed} onRemove={removeParsed} onSave={saveParsed} saving={saving} saved={saved} />
              )}
            </motion.div>
          )}

          {/* UPLOAD TAB */}
          {tab === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {parsed.length === 0 ? (
                <>
                  <p className="text-rupee-text-dim text-sm mb-4">
                    Upload a bank statement (PDF) or a screenshot/receipt (image). Claude AI will extract all transactions.
                  </p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="glass-card rounded-3xl border-2 border-dashed border-rupee-border hover:border-rupee-amber transition-colors p-10 text-center cursor-pointer mb-4">
                    <Upload size={32} className="mx-auto text-rupee-text-dim mb-3" />
                    {uploadFile ? (
                      <div>
                        <p className="font-medium text-rupee-amber">{uploadFile.name}</p>
                        <p className="text-xs text-rupee-text-dim mt-1">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Tap to choose file</p>
                        <p className="text-xs text-rupee-text-dim">PDF or image (JPG, PNG)</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                  {uploadError && <p className="text-sm text-rupee-coral mb-3">{uploadError}</p>}
                  <button onClick={handleUpload} disabled={loading || !uploadFile}
                    className="btn-primary w-full rounded-2xl py-4 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? 'Extracting…' : 'Extract Transactions'}
                  </button>
                </>
              ) : (
                <ParsedList parsed={parsed} onRemove={removeParsed} onSave={saveParsed} saving={saving} saved={saved} />
              )}
            </motion.div>
          )}

          {/* MANUAL TAB */}
          {tab === 'manual' && (
            <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <Field label="Amount (₹)" required>
                <input type="number" value={manual.amount} onChange={e => setManual(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" className="rupee-input w-full rounded-2xl py-3 px-4 text-lg font-mono" />
              </Field>

              <Field label="Category">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setManual(p => ({ ...p, category: c }))}
                      className={`cat-pill text-xs transition-all ${manual.category === c ? 'border-rupee-amber text-rupee-amber bg-rupee-amber/10' : ''}`}>
                      {CAT_EMOJI[c]} {c}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Merchant / Paid to">
                <input value={manual.merchant} onChange={e => setManual(p => ({ ...p, merchant: e.target.value }))}
                  placeholder="e.g. Swiggy, DMart" className="rupee-input w-full rounded-2xl py-3 px-4" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" value={manual.date} onChange={e => setManual(p => ({ ...p, date: e.target.value }))}
                    className="rupee-input w-full rounded-2xl py-3 px-4 text-sm" />
                </Field>
                <Field label="Time">
                  <input type="time" value={manual.time} onChange={e => setManual(p => ({ ...p, time: e.target.value }))}
                    className="rupee-input w-full rounded-2xl py-3 px-4 text-sm" />
                </Field>
              </div>

              <Field label="Notes">
                <input value={manual.remarks} onChange={e => setManual(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Optional note" className="rupee-input w-full rounded-2xl py-3 px-4" />
              </Field>

              <button onClick={saveManual} disabled={saving || !manual.amount || saved}
                className="btn-primary w-full rounded-2xl py-4 flex items-center justify-center gap-2 mt-2">
                {saved ? <><Check size={18} /> Saved!</> : saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : 'Save Transaction'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-rupee-text-dim mb-2">
        {label} {required && <span className="text-rupee-coral">*</span>}
      </label>
      {children}
    </div>
  )
}

function ParsedList({ parsed, onRemove, onSave, saving, saved }: {
  parsed: ParsedSMSTransaction[]
  onRemove: (i: number) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  const CAT_EMOJI: Record<string, string> = {
    'Food & Drinks': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️',
    'Entertainment': '🎬', 'Utilities': '⚡', 'Health': '💊',
    'Snacks': '🍿', 'Lifestyle': '✨', 'Essentials': '🛒', 
    'Credit Card Bills & EMIs': '💳', 'Health Insurance': '🏥', 'Uncategorized': '📦',
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-rupee-text-dim">{parsed.length} transaction{parsed.length !== 1 ? 's' : ''} found</p>
        <span className="text-xs text-rupee-mint font-medium">Review & confirm</span>
      </div>
      <div className="space-y-2 mb-5">
        {parsed.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xl">{CAT_EMOJI[t.category] || '📦'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-rupee-amber">₹{t.amount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-rupee-text-dim truncate">{t.merchant || t.category} · {t.date}</p>
            </div>
            <button onClick={() => onRemove(i)} className="w-7 h-7 rounded-lg btn-ghost flex items-center justify-center flex-shrink-0">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </div>

      {parsed.length > 0 && (
        <button onClick={onSave} disabled={saving || saved}
          className="btn-primary w-full rounded-2xl py-4 flex items-center justify-center gap-2">
          {saved ? <><Check size={18} /> Saved!</> : saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : <>
            <Check size={18} /> Save {parsed.length} Transactions
          </>}
        </button>
      )}
    </>
  )
}
