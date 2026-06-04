'use client'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import { PLAN_CONFIGS } from '@/types/database'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { useState } from 'react'

export default function PlanPage() {
  const { showToast } = useToast()
  const { user } = useAppStore()
  const [interval, setInterval] = useState<'month' | 'year'>('month')

  async function handleUpgrade(planId: string) {
    const res  = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval, email: user.email }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        <div className="text-center mb-6">
          <div className="font-serif text-xl font-bold mb-1">プランを選ぶ</div>
          <p className="text-sm text-[#6B6459]">いつでも変更・解約できます</p>
        </div>

        {/* 月額/年額切替 */}
        <div className="flex bg-[#EEEBE5] rounded-full p-1 mb-6 gap-1">
          {(['month', 'year'] as const).map((i) => (
            <button key={i} onClick={() => setInterval(i)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                interval === i ? 'bg-[#1A1A1A] text-white' : 'text-[#A09890]'
              }`}>
              {i === 'month' ? '月払い' : '年払い（2ヶ月お得）'}
            </button>
          ))}
        </div>

        {Object.values(PLAN_CONFIGS).filter(p => !['trial'].includes(p.id)).map((plan) => {
          const isCurrent = user.plan === plan.id
          const price     = interval === 'month' ? plan.price : plan.yearPrice
          return (
            <div key={plan.id}
              className={`card ${isCurrent ? 'border-[#2F5D50] border-2' : ''} ${plan.id === 'pro' ? 'border-[#1A1A1A] border-2' : ''}`}>
              {plan.id === 'pro' && (
                <div className="text-xs font-medium bg-[#1A1A1A] text-white px-3 py-0.5 rounded-full inline-block mb-2">おすすめ</div>
              )}
              {plan.id === 'pro_asset' && (
                <div className="text-xs font-medium bg-[#8B6914] text-white px-3 py-0.5 rounded-full inline-block mb-2">🏯 プレミアム</div>
              )}
              <div className="font-bold text-lg mb-1">{plan.name}</div>
              <div className="text-2xl font-bold mb-1">
                {price === 0 ? '無料' : `¥${price.toLocaleString()}`}
                {price > 0 && <span className="text-sm font-normal text-[#6B6459]">/{interval === 'month' ? '月' : '年'}</span>}
              </div>
              <ul className="text-sm text-[#6B6459] mb-4 space-y-1.5">
                <li className={plan.maxJournals === -1 ? 'text-[#1A1A1A]' : ''}>
                  {plan.maxJournals === -1 ? '✓ 記録無制限' : `△ 月${plan.maxJournals}件まで`}
                </li>
                <li className={plan.aiLimit === -1 ? 'text-[#1A1A1A]' : plan.aiLimit > 0 ? '' : 'line-through'}>
                  {plan.aiLimit === -1 ? '✓ AIレビュー無制限' : plan.aiLimit > 0 ? `△ AIレビュー月${plan.aiLimit}回` : '— AIレビューなし'}
                </li>
                <li className={plan.hasDokuritsu ? 'text-[#1A1A1A]' : 'line-through opacity-40'}>
                  {plan.hasDokuritsu ? '✓' : '—'} 独立の書・電帳法チェック
                </li>
                <li className={plan.hasCashflow ? 'text-[#1A1A1A]' : 'line-through opacity-40'}>
                  {plan.hasCashflow ? '✓' : '—'} 資金繰り予測
                </li>
                <li className={plan.hasRealEstate ? 'text-[#1A1A1A]' : 'line-through opacity-40'}>
                  {plan.hasRealEstate ? '✓' : '—'} 不動産管理・収支シミュレーション
                </li>
              </ul>
              {isCurrent ? (
                <div className="w-full py-3 text-center text-sm text-[#6B6459] bg-[#F0F0F0] rounded-xl">現在のプラン</div>
              ) : price === 0 ? (
                <button className="btn-secondary w-full">ダウングレード</button>
              ) : (
                <button className={`btn-primary ${plan.id === 'pro_asset' ? 'bg-[#8B6914]' : ''}`}
                  onClick={() => handleUpgrade(plan.id)}>
                  このプランにする
                </button>
              )}
            </div>
          )
        })}

        <p className="text-[11px] text-[#C0B9AF] text-center py-4 leading-relaxed">
          年額プランは2ヶ月分お得。<br/>
          Stripe決済・クレジットカード対応。<br/>
          いつでも解約できます。
        </p>
      </div>
      <BottomNav />
    </div>
  )
}
