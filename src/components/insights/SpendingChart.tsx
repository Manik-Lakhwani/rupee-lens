'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { name: string; value: number }[]
}

const COLORS = ['#F5A623', '#4CC9F0', '#FF6B6B', '#06D6A0', '#FFD166', '#C77DFF', '#FF9F1C', '#2EC4B6']
const CATEGORY_EMOJIS: Record<string, string> = {
  'Food & Drinks': '🍽️', 'Transport': '🚗', 'Shopping': '🛍️',
  'Entertainment': '🎬', 'Utilities': '⚡', 'Health': '💊',
  'Snacks': '🍿', 'Lifestyle': '✨', 'Essentials': '🛒', 
  'Credit Card Bills & EMIs': '💳', 'Health Insurance': '🏥', 'Uncategorized': '📦',
}

export default function SpendingChart({ data }: Props) {
  if (!data.length) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              labelStyle={{ color: '#E8E8F0' }}
              formatter={(value: number) => [`₹${Math.round(value).toLocaleString('en-IN')}`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-rupee-text-dim">Total</span>
          <span className="font-mono font-bold text-lg text-rupee-amber">
            ₹{Math.round(total).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-rupee-text-dim truncate">
              {CATEGORY_EMOJIS[d.name] || '📦'} {d.name}
            </span>
            <span className="text-xs font-mono text-rupee-text ml-auto">
              {Math.round(d.value / total * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
