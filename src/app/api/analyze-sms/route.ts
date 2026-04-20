import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' })

    const prompt = `You are a financial data extractor. Parse these SMS messages and extract UPI/bank transactions.

SMS Messages:
${messages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Return ONLY a valid JSON array. Each item must have:
- amount: number (the debit amount in rupees)
- merchant: string or null (who was paid)
- date: string (YYYY-MM-DD format, today is ${new Date().toISOString().split('T')[0]})
- time: string or null (HH:MM format)
- category: one of ["Food & Drinks", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Snacks", "Lifestyle", "Essentials", "Uncategorized"]
- raw_sms: string (original SMS)

Only include debit/payment transactions. Skip credit/received messages. Skip if no clear amount found.
Return empty array [] if none found. Return ONLY the JSON array, no explanation, no markdown.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ transactions: parsed })
  } catch (error) {
    console.error('SMS analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze SMS' }, { status: 500 })
  }
}
