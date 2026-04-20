'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Trash2, ChevronRight, Shield, Bell, Database, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/layout/BottomNav'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; phone?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [txnCount, setTxnCount] = useState(0)
  const [insightCount, setInsightCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({ email: user.email, phone: user.phone })
        const [{ count: tc }, { count: ic }] = await Promise.all([
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('insight_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])
        setTxnCount(tc || 0)
        setInsightCount(ic || 0)
      }
    }
    load()
  }, [supabase])

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleDeleteData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('transactions').delete().eq('user_id', user.id)
      await supabase.from('insight_cards').delete().eq('user_id', user.id)
      await supabase.from('behavior_patterns').delete().eq('user_id', user.id)
      await supabase.from('weekly_metrics').delete().eq('user_id', user.id)
      setTxnCount(0)
      setInsightCount(0)
    }
    setShowDeleteConfirm(false)
    setLoading(false)
  }

  const SettingRow = ({ icon: Icon, label, sub, onTap, danger, value }: {
    icon: typeof LogOut; label: string; sub?: string;
    onTap?: () => void; danger?: boolean; value?: string
  }) => (
    <button onClick={onTap} disabled={!onTap}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${onTap ? 'hover:bg-white/4 active:bg-white/8' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? 'bg-rupee-coral/10' : 'bg-white/6'}`}>
        <Icon size={17} className={danger ? 'text-rupee-coral' : 'text-rupee-text-dim'} />
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${danger ? 'text-rupee-coral' : 'text-rupee-text'}`}>{label}</p>
        {sub && <p className="text-xs text-rupee-text-dim mt-0.5">{sub}</p>}
      </div>
      {value && <span className="text-xs text-rupee-text-dim">{value}</span>}
      {onTap && <ChevronRight size={16} className="text-rupee-muted" />}
    </button>
  )

  return (
    <div className="app-shell">
      <div className="ambient-glow" />
      <div className="relative z-10 px-5 pt-12 pb-32">

        <h1 className="font-display text-2xl font-bold mb-8">Settings</h1>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-5 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rupee-amber to-rupee-amber-dim flex items-center justify-center">
            <span className="font-display font-bold text-xl text-rupee-void">
              {user?.email?.[0]?.toUpperCase() || user?.phone?.slice(-1) || 'U'}
            </span>
          </div>
          <div>
            <p className="font-display font-bold">{user?.email || user?.phone || 'User'}</p>
            <p className="text-xs text-rupee-text-dim mt-0.5">RupeeLens Member</p>
          </div>
        </motion.div>

        {/* Data */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-1 mb-4">
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-rupee-text-dim uppercase tracking-widest">Your Data</p>
          <SettingRow icon={Database} label="Transactions" value={`${txnCount}`} />
          <SettingRow icon={Info} label="Insights generated" value={`${insightCount}`} />
        </motion.div>

        {/* Permissions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-3xl p-1 mb-4">
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-rupee-text-dim uppercase tracking-widest">Privacy</p>
          <SettingRow icon={Shield}
            label="Data Privacy"
            sub="Your data is encrypted and never sold" />
          <SettingRow icon={Bell}
            label="Notifications"
            sub="Weekly insight summaries" />
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl p-1 mb-4">
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-rupee-text-dim uppercase tracking-widest">Account</p>
          <SettingRow icon={Trash2} label="Clear all data" sub="Delete all transactions and insights"
            onTap={() => setShowDeleteConfirm(true)} danger />
          <SettingRow icon={LogOut} label="Sign out" onTap={handleSignOut} danger />
        </motion.div>

        {/* App version */}
        <p className="text-center text-xs text-rupee-muted mt-6">RupeeLens v1.0.0 · Built with ❤️</p>
      </div>

      {/* Delete confirm sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
            className="w-full max-w-[430px] mx-auto glass-card rounded-t-3xl p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="font-display font-bold text-xl mb-2">Delete all data?</h3>
            <p className="text-rupee-text-dim text-sm mb-6">
              This will permanently delete all {txnCount} transactions and {insightCount} insights. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-ghost rounded-2xl py-3 text-sm font-medium">Cancel</button>
              <button onClick={handleDeleteData} disabled={loading}
                className="flex-1 bg-rupee-coral text-white rounded-2xl py-3 text-sm font-bold">
                {loading ? 'Deleting…' : 'Delete Everything'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
