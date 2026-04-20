import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

type ParsedTransaction = {
  amount: number
  merchant: string | null
  date: string
  time: string | null
  category: string
  remarks: string | null
}

function extractJsonArray(text: string): ParsedTransaction[] {
  const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as unknown
    if (Array.isArray(parsed)) return parsed as ParsedTransaction[]
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { transactions?: unknown }).transactions)) {
      return (parsed as { transactions: ParsedTransaction[] }).transactions
    }
  } catch {
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start !== -1 && end > start) {
      const subset = cleaned.slice(start, end + 1)
      const parsed = JSON.parse(subset) as unknown
      if (Array.isArray(parsed)) return parsed as ParsedTransaction[]
    }
  }

  throw new Error('Model response did not contain a valid JSON array')
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'

    if (!isImage && !isPDF) {
      return NextResponse.json({ error: 'Only images and PDFs supported' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Request JSON directly to avoid markdown-wrapped responses.
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `Extract all debit/payment transactions from this bank statement or receipt.

Return ONLY a valid JSON array. Each item must have:
- amount: number (debit amount in rupees, numbers only)
- merchant: string or null (shop/app name)
- date: string (YYYY-MM-DD format)
- time: string or null (HH:MM format)
- category: one of ["Food & Drinks", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Snacks", "Lifestyle", "Essentials", "Uncategorized"]
- remarks: string or null (any description or reference)

Only include debits/payments (money going out). Skip credits. 
Return ONLY the JSON array, no markdown, no explanation.`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type as string,
          data: base64,
        },
      },
      prompt,
    ])

    const text = result.response.text()
    const transactions = extractJsonArray(text)

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Statement parsing error:', error)
    const message = error instanceof Error ? error.message : 'Failed to parse statement'
    const isQuota = message.includes('429') || message.toLowerCase().includes('quota')
    const isModelMissing = message.includes('404') && message.toLowerCase().includes('not found')
    const status = isQuota ? 429 : 500

    return NextResponse.json(
      {
        error: isQuota
          ? 'Gemini quota exceeded. Try again later or switch to a different model/key.'
          : isModelMissing
            ? 'Configured Gemini model is unavailable. Set GEMINI_MODEL to a supported model (for example gemini-2.5-flash).'
            : 'Failed to parse statement',
      },
      { status },
    )
  }
}
