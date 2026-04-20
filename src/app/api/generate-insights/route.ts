import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateLocalInsights } from '@/lib/insights-engine'
import { Transaction } from '@/types'
import { getRollingLabel } from '@/lib/insight-window'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  let body: {
    transactions: Transaction[]
    periodStart?: string
    weekStart?: string
    prevPeriodTotal?: number
    prevWeekTotal?: number
    periodDays?: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ insights: [] })
  }

  const transactions = body.transactions || []
  const periodStart = body.periodStart || body.weekStart || new Date().toISOString().split('T')[0]
  const periodDays = body.periodDays || 7
  const prevPeriodTotal = body.prevPeriodTotal ?? body.prevWeekTotal
  const periodLabel = getRollingLabel(periodDays)

  // Always generate local rule-based insights first (no API needed)
  const localInsights = generateLocalInsights(transactions, periodStart, prevPeriodTotal, periodDays)

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ insights: localInsights })
  }

  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' })

    const summary = {
      totalSpent: transactions.reduce((s, t) => s + t.amount, 0),
      count: transactions.length,
      categories: transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>),
      lateNightCount: transactions.filter(t => {
        const h = parseInt((t.transaction_time || '12:00').split(':')[0])
        return h >= 21 || h < 3
      }).length,
    }

    const prompt = `You are RupeeLens — a friendly AI that helps young Indians (18-30) understand their spending habits.

Analyze spending for the ${periodLabel} and generate 2 short, punchy insight cards in simple conversational language.
You can use light Hinglish (e.g., "Yaar", "bas", "thoda") to feel relatable.

Data:
- Total spent: Rs.${Math.round(summary.totalSpent)}
- Transactions: ${summary.count}
- By category: ${JSON.stringify(summary.categories)}
- Late night transactions (after 9pm): ${summary.lateNightCount}

Already covered insights (don't repeat these):
${localInsights.map(i => `- ${i.title}`).join('\n')}

Generate 2 NEW insights not already covered above for the ${periodLabel}.

Return ONLY a JSON array with exactly 2 objects, each having:
- insight_type: "pattern" or "timing" or "frequency" or "health"
- title: string (max 8 words, catchy)
- body: string (2-3 sentences max, conversational, relatable to young Indians)
- emoji: single emoji character
- severity: "positive" or "neutral" or "warning"

Return ONLY the JSON array, no markdown, no explanation.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
    const aiInsights = JSON.parse(clean)

    const aiCards = aiInsights.map((ins: Record<string, unknown>) => ({
      ...ins,
      week_start: periodStart,
      is_read: false,
    }))

    return NextResponse.json({ insights: [...localInsights, ...aiCards] })
  } catch (error) {
    console.error('Gemini insight error:', error)
    // Gracefully fall back to local insights if Gemini fails
    return NextResponse.json({ insights: localInsights })
  }
}
