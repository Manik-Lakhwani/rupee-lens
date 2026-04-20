import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  const cookieStore = cookies()
  const cookiesToPersist: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value ?? null
        },
        set(name, value, options) {
          cookiesToPersist.push({ name, value, options })
        },
        remove(name, options) {
          cookiesToPersist.push({ name, value: '', options: { ...options, maxAge: 0 } })
        },
      },
    }
  )
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=exchange_failed`)
  }

  const response = NextResponse.redirect(`${origin}/dashboard`)

  cookiesToPersist.forEach(({ name, value, options }) => {
    response.cookies.set({
      name,
      value,
      ...options,
    })
  })

  return response
}
