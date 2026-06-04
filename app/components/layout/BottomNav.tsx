'use client'
import { useAppStore } from '@/store/useAppStore'
import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { id: 'dashboard',  icon: '宅', label: 'ホーム',   path: '/dashboard'  },
  { id: 'receipt',    icon: '撮', label: '撮影',     path: '/receipt'    },
  { id: 'cashflow',   icon: '流', label: '資金繰り', path: '/cashflow'   },
  { id: 'etax',       icon: '申', label: '申告',     path: '/etax'       },
  { id: 'medical',    icon: '医', label: '医療費',   path: '/medical'    },
  { id: 'settings',   icon: '設', label: '設定',     path: '/settings'   },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.path)
        return (
          <button key={item.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => router.push(item.path)}>
            <span className="text-xl leading-none font-serif">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
