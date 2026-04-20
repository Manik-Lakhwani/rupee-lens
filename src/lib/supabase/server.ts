import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value ?? null
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Server Component — cookies can be read but not set
          }
        },
        remove(name, options) {
          try {
            if (typeof cookieStore.delete === 'function') {
              cookieStore.delete(name)
            } else {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            }
          } catch {
            // ignore
          }
        },
      },
    }
  )
}
