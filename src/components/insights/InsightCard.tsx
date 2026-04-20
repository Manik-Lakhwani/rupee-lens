'use client'
import { motion } from 'framer-motion'
import { InsightCard as InsightCardType } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  card: InsightCardType
  index?: number
  onRead?: (id: string) => void
}

function getCardClass(card: InsightCardType): string {
  if (card.insight_type === 'timing') return 'insight-timing'
  if (card.insight_type === 'frequency') return 'insight-frequency'
  if (card.insight_type === 'health') {
    return card.severity === 'positive' ? 'insight-health-positive' : 'insight-health-warning'
  }
  return 'insight-pattern'
}

function getAccentColor(card: InsightCardType): string {
  if (card.insight_type === 'timing') return '#4CC9F0'
  if (card.insight_type === 'frequency') return '#FF6B6B'
  if (card.insight_type === 'health') return card.severity === 'positive' ? '#06D6A0' : '#FF6B6B'
  return '#F5A623'
}

const typeLabels: Record<string, string> = {
  pattern: 'Habit Pattern',
  timing: 'Time Pattern',
  frequency: 'Frequency',
  health: 'Weekly Health',
}

export default function InsightCard({ card, index = 0, onRead }: Props) {
  const accent = getAccentColor(card)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => !card.is_read && onRead?.(card.id)}
      className={`rounded-3xl p-5 cursor-pointer relative overflow-hidden ${getCardClass(card)} ${!card.is_read ? 'ring-1 ring-white/10' : 'opacity-80'}`}
    >
      {/* Unread dot */}
      {!card.is_read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full"
          style={{ background: accent }} />
      )}

      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{card.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: accent }}>
              {typeLabels[card.insight_type]}
            </span>
          </div>
          <h3 className="font-display font-bold text-base leading-tight text-rupee-text">
            {card.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-rupee-text-dim leading-relaxed">
        {card.body}
      </p>

      {/* Amount pill if available */}
      {card.amount && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-xl px-3 py-1.5"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
          <span className="text-xs font-mono font-bold" style={{ color: accent }}>
            ₹{Math.round(card.amount).toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </motion.div>
  )
}
