'use client'
import { useEffect, useState } from 'react'

interface Props {
  score: 'controlled' | 'moderate' | 'risky'
  value: number // 0-100
  size?: number
}

const scoreConfig = {
  controlled: { color: '#06D6A0', label: 'Controlled', emoji: '🟢', bg: 'rgba(6,214,160,0.1)' },
  moderate: { color: '#FFD166', label: 'Moderate', emoji: '🟡', bg: 'rgba(255,209,102,0.1)' },
  risky: { color: '#FF6B6B', label: 'Risky', emoji: '🔴', bg: 'rgba(255,107,107,0.1)' },
}

export default function HabitScoreRing({ score, value, size = 120 }: Props) {
  const [animated, setAnimated] = useState(false)
  const config = scoreConfig[score]
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated ? value / 100 : 0) * circumference
  const cx = size / 2
  const cy = size / 2

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl mb-0.5">{config.emoji}</span>
          <span className="font-mono font-bold text-xl" style={{ color: config.color }}>
            {animated ? value : 0}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="font-display font-bold text-sm" style={{ color: config.color }}>
          {config.label}
        </p>
        <p className="text-xs text-rupee-text-dim">Habit Score</p>
      </div>
    </div>
  )
}
