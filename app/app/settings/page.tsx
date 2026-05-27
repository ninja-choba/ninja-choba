'use client'
import TaxRateCard from '@/components/features/TaxRateCard'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import { getTaxConfig, addTaxSchedule, removeTaxSchedule, getCurrentTaxRates } from '@/lib/etax'
import BottomNav from '@/components/layout/BottomNav'
import { PLAN_CONFIGS } from '@/types/database'

export default function SettingsPage() {
  const { showToast } = useToast()
  const { user, apiKey, setApiKey, journals, properties, cashflowPlan, clearUser } = useAppStore()
  const router = useRouter()
  const plan   = PLAN_CONFIGS[user.plan]

  const [newKey, setNewKey]       = useState('')
  const [keySaved, setKeySaved]   = useState(false)
  const [blurred, setBlurred]     = useState(false)

  function saveKey() {
    if (!newKey.trim()) return
    setApiKey(newKey.trim())
    setNewKey('')
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  function exportBackup() {
    const data = {
      exportedAt:   new Date().toISOString(),
      version:      'v20260527',
      user:         { email: user.email, plan: user.plan, name: user.name },
      journals,
      properties,
      cashflowPlan,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ninja-chouba-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAll() {
    if (!confirm('全データを削除します。この操作は取り消せません。')) return
    clearUser()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    clearUser()
    router.push('/auth')
  }

  function handleBlur() {
    setBlurred(true)
    document.body.style.filter = 'blur(20px)'
    document.body.style.pointerEvents = 'none'
    setTimeout(() => {
      document.body.style.filter = ''
      document.body.style.pointerEvents = ''
      setBlurred(false)
    }, 3000)
  }

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* アカウント情報 */}
        <div className="card">
          <div className="font-serif text-lg font-bold mb-3">アカウント</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B6459]">メールアドレス</span>
              <span className="font-medium">{user.email || '（未ログイン）'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B6459]">現在のプラン</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{plan.name}</span>
                <a href="/plan"
                  className="text-xs text-[#2F5D50] border border-[#2F5D50] px-2 py-0.5 rounded-full">
                  変更
                </a>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex gap-2">
            <button onClick={handleLogout}
              className="flex-1 py-2.5 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
              ログアウト
            </button>
            <button onClick={handleBlur}
              className="px-4 py-2.5 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
              姿を消す
            </button>
          </div>
        </div>

        {/* AI設定 */}
        <div className="card">
          <div className="font-serif text-base font-bold mb-3">AI設定</div>
          <div className="text-xs text-[#6B6459] mb-2">OpenAI APIキー</div>
          <div className="flex gap-2 mb-2">
            <input
              type="password"
              className="form-input flex-1"
              placeholder={apiKey ? '•••••••' + apiKey.slice(-4) : 'sk-...'}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoComplete="off"
            />
            <button onClick={saveKey}
              className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm whitespace-nowrap">
              {keySaved ? '✓' : '保存'}
            </button>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3 text-xs text-[#6B6459] leading-relaxed">
            AIによる判定はあくまで参考情報です。税務・法務上の判断は必ず専門家にご確認ください。
          </div>
        </div>


        {/* 消費税率管理 */}
        <TaxRateCard />

        {/* データ管理 */}
        <div className="card">
          <div className="font-serif text-base font-bold mb-3">データ管理</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[#6B6459] mb-2">
              <span>記録件数</span><span>{journals.length}件</span>
            </div>
            <div className="flex justify-between text-sm text-[#6B6459] mb-3">
              <span>物件数</span><span>{properties.length}件</span>
            </div>
            <button onClick={exportBackup}
              className="w-full py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#1A1A1A] text-left px-4 bg-[#F8F8F8]">
              📥 JSONでバックアップ
            </button>
            <button onClick={handleDeleteAll}
              className="w-full py-3 border border-[#8B2020] rounded-xl text-sm text-[#8B2020] text-left px-4 bg-transparent">
              ⚠ 全データを削除（GDPR対応）
            </button>
          </div>
        </div>

        {/* サポート・法務 */}
        <div className="card">
          <div className="font-serif text-base font-bold mb-3">サポート・法務</div>
          <div className="space-y-2">
            <a href="mailto:support@ninja-chouba.example.com"
              className="block py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#1A1A1A] px-4 bg-[#F8F8F8]">
              ✉ お問い合わせ
            </a>
            {[
              { label: '利用規約',        href: '/legal#terms'    },
              { label: 'プライバシーポリシー', href: '/legal#privacy' },
              { label: 'AI免責事項',      href: '/legal#ai'       },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="block py-2.5 text-sm text-[#2F5D50] border-b border-[#F5F5F5] last:border-0">
                {label} →
              </a>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-[#C0B9AF] py-4">
          忍者帳場 v20260527<br/>
          Next.js + Supabase + Stripe
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
