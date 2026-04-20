import { BehaviorPattern, InsightCard, Transaction } from '@/types'

interface SpendingAnalysis {
  totalSpent: number
  byCategory: Record<string, number>
  byDay: Record<string, number>
  hourlyDistribution: Record<number, number>
  frequencyByCategory: Record<string, number>
  dailyAvgByCategory: Record<string, number>
  lateNightPercent: number
  weekendPercent: number
}

export function analyzeTransactions(transactions: Transaction[]): SpendingAnalysis {
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const byCategory: Record<string, number> = {}
  const byDay: Record<string, number> = {}
  const hourlyDistribution: Record<number, number> = {}
  const frequencyByCategory: Record<string, number> = {}

  let lateNightCount = 0
  let weekendCount = 0

  transactions.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
    frequencyByCategory[t.category] = (frequencyByCategory[t.category] || 0) + 1

    const day = t.transaction_date
    byDay[day] = (byDay[day] || 0) + t.amount

    if (t.transaction_time) {
      const hour = parseInt(t.transaction_time.split(':')[0], 10)
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
      if (hour >= 21 || hour < 3) lateNightCount++
    }

    const dayOfWeek = new Date(t.transaction_date).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++
  })

  const lateNightPercent = transactions.length > 0 ? (lateNightCount / transactions.length) * 100 : 0
  const weekendPercent = transactions.length > 0 ? (weekendCount / transactions.length) * 100 : 0

  const uniqueDays = new Set(transactions.map(t => t.transaction_date)).size || 1
  const dailyAvgByCategory: Record<string, number> = {}
  Object.entries(byCategory).forEach(([cat, total]) => {
    dailyAvgByCategory[cat] = Math.round(total / uniqueDays)
  })

  return {
    totalSpent,
    byCategory,
    byDay,
    hourlyDistribution,
    frequencyByCategory,
    dailyAvgByCategory,
    lateNightPercent,
    weekendPercent,
  }
}

export function computeHabitScore(analysis: SpendingAnalysis, transactions: Transaction[]) {
  let value = 50

  if (analysis.lateNightPercent > 40) value -= 15
  else if (analysis.lateNightPercent > 25) value -= 8

  const categoryTotals = Object.values(analysis.byCategory)
  if (categoryTotals.length > 0 && analysis.totalSpent > 0) {
    const topCategoryPercent = Math.max(...categoryTotals) / analysis.totalSpent * 100
    if (topCategoryPercent > 60) value -= 10
  }

  const avgAmount = analysis.totalSpent / (transactions.length || 1)
  if (avgAmount < 100 && transactions.length > 20) value -= 10

  if (analysis.weekendPercent > 50) value -= 8

  const categoryCount = Object.keys(analysis.byCategory).length
  if (categoryCount >= 4) value += 10

  value = Math.max(10, Math.min(90, value))

  if (value >= 65) return { score: 'controlled', value, label: 'Controlled' as const }
  if (value >= 40) return { score: 'moderate', value, label: 'Moderate' as const }
  return { score: 'risky', value, label: 'Risky' as const }
}

export function detectBehaviorPatterns(
  transactions: Transaction[],
  periodStart: string,
): Omit<BehaviorPattern, 'id' | 'user_id' | 'created_at'>[] {
  const patterns: Omit<BehaviorPattern, 'id' | 'user_id' | 'created_at'>[] = []
  const analysis = analyzeTransactions(transactions)

  Object.entries(analysis.dailyAvgByCategory).forEach(([category, avgAmount]) => {
    const freq = analysis.frequencyByCategory[category] || 0
    const days = new Set(transactions.filter(t => t.category === category).map(t => t.transaction_date)).size

    if (days >= 3) {
      let intensity: 'low' | 'moderate' | 'high' = 'low'
      if (days >= 6) intensity = 'high'
      else if (days >= 4) intensity = 'moderate'

      patterns.push({
        pattern_type: 'daily_habit',
        category,
        title: `Daily ${category} habit`,
        description: `You spend Rs.${avgAmount} daily on ${category} (${days} active days).`,
        amount_avg: avgAmount,
        frequency: freq,
        intensity,
        week_start: periodStart,
      })
    }
  })

  if (analysis.lateNightPercent > 25) {
    patterns.push({
      pattern_type: 'time_based',
      category: 'All',
      title: 'Late night spending',
      description: `${Math.round(analysis.lateNightPercent)}% of your transactions happen after 9 PM.`,
      frequency: Math.round(transactions.length * analysis.lateNightPercent / 100),
      time_pattern: 'late_night',
      intensity: analysis.lateNightPercent > 50 ? 'high' : 'moderate',
      week_start: periodStart,
    })
  }

  const topFreqCat = Object.entries(analysis.frequencyByCategory).sort((a, b) => b[1] - a[1])[0]
  if (topFreqCat && topFreqCat[1] >= 5) {
    patterns.push({
      pattern_type: 'frequency',
      category: topFreqCat[0],
      title: `Frequent ${topFreqCat[0]} purchases`,
      description: `You made ${topFreqCat[1]} ${topFreqCat[0]} transactions recently.`,
      frequency: topFreqCat[1],
      intensity: topFreqCat[1] >= 10 ? 'high' : 'moderate',
      week_start: periodStart,
    })
  }

  return patterns
}

export function generateLocalInsights(
  transactions: Transaction[],
  periodStart: string,
  prevPeriodTotal?: number,
  periodDays = 7,
): Omit<InsightCard, 'id' | 'user_id' | 'created_at'>[] {
  const insights: Omit<InsightCard, 'id' | 'user_id' | 'created_at'>[] = []
  const analysis = analyzeTransactions(transactions)
  const periodLabel = `last ${periodDays} days`

  if (transactions.length === 0) return insights

  const topCategory = Object.entries(analysis.byCategory).sort((a, b) => b[1] - a[1])[0]
  if (topCategory) {
    const freq = analysis.frequencyByCategory[topCategory[0]]
    insights.push({
      insight_type: 'pattern',
      title: `${topCategory[0]} is your biggest habit`,
      body: `You spent Rs.${Math.round(topCategory[1])} on ${topCategory[0]} across ${freq} transactions in the ${periodLabel}. That's ${Math.round(topCategory[1] / analysis.totalSpent * 100)}% of your spending.`,
      emoji: getCategoryEmoji(topCategory[0]),
      severity: topCategory[1] / analysis.totalSpent > 0.5 ? 'warning' : 'neutral',
      related_category: topCategory[0],
      amount: topCategory[1],
      week_start: periodStart,
      is_read: false,
    })
  }

  const dailyAvg = Math.round(analysis.totalSpent / Math.max(periodDays, 1))
  insights.push({
    insight_type: 'pattern',
    title: `You spend Rs.${dailyAvg} every day`,
    body: `Your daily average over the ${periodLabel} is Rs.${dailyAvg}. That's about Rs.${dailyAvg * 30} per month if this pattern holds.`,
    emoji: '📊',
    severity: 'neutral',
    week_start: periodStart,
    is_read: false,
  })

  if (analysis.lateNightPercent > 20) {
    insights.push({
      insight_type: 'timing',
      title: 'You spend more after 9 PM',
      body: `${Math.round(analysis.lateNightPercent)}% of your transactions happen late at night. Late-night spending is often impulsive and worth tracking.`,
      emoji: '🌙',
      severity: analysis.lateNightPercent > 40 ? 'warning' : 'neutral',
      week_start: periodStart,
      is_read: false,
    })
  }

  const topFreqCat = Object.entries(analysis.frequencyByCategory).sort((a, b) => b[1] - a[1])[0]
  if (topFreqCat && topFreqCat[1] >= 4) {
    const avgPerOrder = Math.round((analysis.byCategory[topFreqCat[0]] || 0) / topFreqCat[1])
    insights.push({
      insight_type: 'frequency',
      title: `${topFreqCat[1]} ${topFreqCat[0]} orders recently`,
      body: `You ordered ${topFreqCat[0]} ${topFreqCat[1]} times, spending around Rs.${avgPerOrder} each time.`,
      emoji: getFrequencyEmoji(topFreqCat[0]),
      severity: topFreqCat[1] >= 8 ? 'warning' : 'neutral',
      related_category: topFreqCat[0],
      week_start: periodStart,
      is_read: false,
    })
  }

  if (prevPeriodTotal && prevPeriodTotal > 0) {
    const change = ((analysis.totalSpent - prevPeriodTotal) / prevPeriodTotal) * 100
    const isUp = change > 0
    insights.push({
      insight_type: 'health',
      title: isUp
        ? `Spending up ${Math.round(Math.abs(change))}% vs previous ${periodDays}d`
        : `Spending down ${Math.round(Math.abs(change))}% vs previous ${periodDays}d`,
      body: isUp
        ? `You spent Rs.${Math.round(analysis.totalSpent - prevPeriodTotal)} more than the previous ${periodLabel}.`
        : `You spent Rs.${Math.round(prevPeriodTotal - analysis.totalSpent)} less than the previous ${periodLabel}.`,
      emoji: isUp ? '📈' : '📉',
      severity: isUp ? 'warning' : 'positive',
      week_start: periodStart,
      is_read: false,
    })
  }

  const microSpends = transactions.filter(t => t.amount < 100)
  if (microSpends.length >= 5) {
    const microTotal = microSpends.reduce((s, t) => s + t.amount, 0)
    insights.push({
      insight_type: 'pattern',
      title: `Small spends add up to Rs.${Math.round(microTotal)}`,
      body: `You made ${microSpends.length} transactions under Rs.100 in the ${periodLabel}. Together they are ${Math.round(microTotal / analysis.totalSpent * 100)}% of your spending.`,
      emoji: '🪙',
      severity: 'neutral',
      week_start: periodStart,
      is_read: false,
    })
  }

  return insights
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Food & Drinks': '🍽️',
    Transport: '🚗',
    Shopping: '🛍️',
    Entertainment: '🎬',
    Utilities: '⚡',
    Health: '💊',
    Snacks: '🍿',
    Lifestyle: '✨',
    Essentials: '🛒',
  }
  return map[category] || '💡'
}

function getFrequencyEmoji(category: string): string {
  const map: Record<string, string> = {
    'Food & Drinks': '🍕',
    Snacks: '☕',
    Transport: '🚕',
    Shopping: '📦',
  }
  return map[category] || '🔁'
}
