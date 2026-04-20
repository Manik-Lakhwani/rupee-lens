'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, TrendingUp, PlusCircle, List, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/insights', icon: TrendingUp, label: 'Insights' },
  { href: '/import', icon: PlusCircle, label: 'Add', accent: true },
  { href: '/transactions', icon: List, label: 'Transactions' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map(({ href, icon: Icon, label, accent }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                active ? 'text-rupee-amber' : 'text-rupee-muted'
              }`}>
              {accent ? (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rupee-amber to-rupee-amber-dim flex items-center justify-center -mt-6 shadow-lg shadow-rupee-amber/30">
                  <Icon size={22} className="text-rupee-void" />
                </div>
              ) : (
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              )}
              <span className={`text-[10px] font-medium ${accent ? 'mt-1' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
