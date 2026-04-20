import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Category } from '@/types'

const CATEGORIES: Category[] = [
  'Food & Drinks',
  'Transport',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Health',
  'Snacks',
  'Lifestyle',
  'Essentials',
  'Credit Card Bills & EMIs',
  'Health Insurance',
  'Uncategorized',
]

function getSupabaseClientFromAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) return null
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type UpdatePayload = {
  id?: string
  amount?: number
  category?: Category
  merchant?: string | null
  remarks?: string | null
  transaction_date?: string
  transaction_time?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClientFromAuth(req)
    if (!supabase) {
      return NextResponse.json({ error: 'Missing or invalid auth token' }, { status: 401 })
    }

    const body = (await req.json()) as UpdatePayload
    if (!body.id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (typeof body.amount !== 'undefined') {
      if (typeof body.amount !== 'number' || Number.isNaN(body.amount) || body.amount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
      updateData.amount = body.amount
    }

    if (typeof body.category !== 'undefined') {
      if (!CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updateData.category = body.category
    }

    if (typeof body.merchant !== 'undefined') {
      updateData.merchant = body.merchant?.trim() || null
    }

    if (typeof body.remarks !== 'undefined') {
      updateData.remarks = body.remarks?.trim() || null
    }

    if (typeof body.transaction_date !== 'undefined') {
      updateData.transaction_date = body.transaction_date
    }

    if (typeof body.transaction_time !== 'undefined') {
      updateData.transaction_time = body.transaction_time || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transaction: data })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClientFromAuth(req)
    if (!supabase) {
      return NextResponse.json({ error: 'Missing or invalid auth token' }, { status: 401 })
    }

    const body = (await req.json()) as { id?: string }
    if (!body.id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 })
    }

    const { error } = await supabase.from('transactions').delete().eq('id', body.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete transaction error:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
