'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { BudgetStore } from '@/lib/budget'
import { XPStore, BadgeStore, StreakStore, type ShurikenBadge } from '@/lib/gamification'
import dynamic from 'next/dynamic'
import AnimatedCounter from '@/components/features/AnimatedCounter'

// クライアントのみ
const BantoCard    = dynamic(() => import('@/components/features/BantoCard'),    { ssr: false })
const LevelUpToast = dynamic(() => import('@/components/features/LevelUpToast'), { ssr: false })

export default function DashboardPage() {
  const { journals, setJournals, user, setUser } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCat, setFilterCat]     = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [levelUpData, setLevelUpData] = useState<any>(null)
  const [newBadges, setNewBadges]     = useState<ShurikenBadge[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUser({ userId: session.user.id, email: session.user.email ?? null })

      const { data } = await (supabase.from('journals') as any)
        .select('*')
        .eq('account_email', session.user.email ?? '')
        .order('date', { ascending: false })
        .limit(200)

      if (data) {
        setJournals(data.map((r: any) => ({
          id: r.id, date: r.date, description: r.description,
          amount: r.amount, type: r.type, category: r.category,
          incomeType: r.income_type, memo: r.memo, imgUrl: r.img_url,
          aiReview: r.ai_review ? JSON.parse(r.ai_review) : null,
        })))
      }
    }
    load()
  }, [])

  // 記録追加時にXP・バッジ・レベルアップをチェック
  useEffect(() => {
    if (journals.length === 0) return
    const now       = new Date()
    const ym        = now.toISOString().slice(0,7)
    const monthJ    = journals.filter(j => j.date?.startsWith(ym))
    const evidRate  = monthJ.length > 0 ? Math.round(monthJ.filter(j=>j.imgUrl).length/monthJ.length*100) : 100
    const danger    = monthJ.filter(j => j.aiReview?.risk === 'danger').length
    const streakDays = StreakStore.get().days

    const prevLevel = XPStore.getLevel()
    const stats = {
      totalRecords: journals.length,
      monthRecords: monthJ.length,
      evidenceRate: evidRate,
      dangerCount:  danger,
      streakDays,
      totalAmount:  monthJ.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0),
      categoryCount: new Set(journals.map(j=>j.category).filter(Boolean)).size,
      totalXP:       XPStore.get(),
    }

    const earned = BadgeStore.check(stats)
    if (earned.length > 0) setNewBadges(earned)

    const newLevel = XPStore.getLevel()
    if (newLevel.level > prevLevel.level) setLevelUpData(newLevel)
  }, [journals.length])

  // 集計
  const now          = new Date()
  const thisMonth    = now.toISOString().slice(0, 7)
  const prevMonth    = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7)
  const monthJ       = journals.filter(j => j.date?.startsWith(thisMonth))
  const prevJ        = journals.filter(j => j.date?.startsWith(prevMonth))
  const income       = monthJ.filter(j => j.type==='income').reduce((s,j)=>s+j.amount, 0)
  const expense      = monthJ.filter(j => j.type==='expense').reduce((s,j)=>s+j.amount, 0)
  const net          = income - expense
  const prevExpense  = prevJ.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0)
  const dangers      = monthJ.filter(j => j.aiReview?.risk==='danger').length
  const noEvi        = monthJ.filter(j => !j.imgUrl).length

  // 前月比アラート
  const catAlerts: string[] = []
  const thisCats: Record<string,number> = {}
  const prevCats:  Record<string,number> = {}
  monthJ.filter(j=>j.type==='expense').forEach(j => { thisCats[j.category||'未分類']=(thisCats[j.category||'未分類']||0)+j.amount })
  prevJ.filter(j=>j.type==='expense').forEach(j  => { prevCats[j.category||'未分類']=(prevCats[j.category||'未分類']||0)+j.amount  })
  Object.entries(thisCats).forEach(([cat,amt]) => {
    const prev = prevCats[cat] || 0
    if (prev > 0 && amt > prev * 1.2) catAlerts.push(`${cat}が先月比${Math.round(amt/prev*100-100)}%増`)
  })

  // 検索・フィルター
  const filtered = journals.filter(j => {
    const ms = !searchQuery || j.description.includes(searchQuery)||(j.category||'').includes(searchQuery)
    const mc = !filterCat   || j.category === filterCat
    const mm = !filterMonth || j.date.startsWith(filterMonth)
    return ms && mc && mm
  })

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />

      {/* レベルアップ演出 */}
      {levelUpData && (
        <LevelUpToast level={levelUpData} onClose={() => setLevelUpData(null)} />
      )}
      {newBadges.length > 0 && !levelUpData && (
        <LevelUpToast badges={newBadges} onClose={() => setNewBadges([])} />
      )}

      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* 番頭カード（AI + レベル） */}
        <BantoCard />

        {/* 今月安全バッジ */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif text-base font-bold">今月の状態</div>
            {dangers === 0 && noEvi === 0
              ? <span className="badge-safe">今月安全</span>
              : <span className="badge-danger">要確認</span>
            }
          </div>
          {dangers > 0 && <p className="text-xs text-[#8B2020] mb-1">⚠ 要確認が{dangers}件あります</p>}
          {noEvi  > 0 && <p className="text-xs text-[#9A6B1E]">· 証憑なしが{noEvi}件あります</p>}
        </div>

        {/* KPIカード（アニメーションカウンター） */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          {[
            { label: '今月収入',  value: income,   color: '#1E5C3A', prefix: '¥' },
            { label: '今月支出',  value: expense,  color: '#8B2020', prefix: '¥' },
            { label: '収支',      value: Math.abs(net), color: net>=0?'#1E5C3A':'#8B2020',
              prefix: net>=0 ? '+¥' : '-¥' },
            { label: '記録件数',  value: monthJ.length, color: '#1A1A1A', suffix: '件' },
          ].map(kpi => (
            <div key={kpi.label} className="card mb-0">
              <div className="text-xs text-[#6B6459] mb-1">{kpi.label}</div>
              <AnimatedCounter
                value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix}
                color={kpi.color} size="lg" />
            </div>
          ))}
        </div>

        {/* 予算アラート */}
        {(() => {
          const alerts = BudgetStore.getAlerts(journals)
          if (alerts.length === 0) return null
          return (
            <div className="card border-[#9A6B1E] border">
              <div className="text-sm font-medium text-[#9A6B1E] mb-2">⚠ 予算アラート</div>
              {alerts.map(a => (
                <div key={a.category} className="flex justify-between items-center py-2 border-b border-[#F5F5F5] last:border-0">
                  <div>
                    <div className="text-sm font-medium">{a.category}</div>
                    <div className="text-xs text-[#9A9288]">予算 ¥{a.budget.toLocaleString()} · 使用 {a.rate}%</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.status==='over' ? 'bg-[#F5E0E0] text-[#8B2020]' : 'bg-[#F5EDD8] text-[#9A6B1E]'
                  }`}>{a.status==='over'?'超過':'警告'}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 前月比アラート */}
        {catAlerts.length > 0 && (
          <div className="card border-[#9A6B1E] border">
            <div className="text-sm font-medium text-[#9A6B1E] mb-2">📊 前月比アラート</div>
            {catAlerts.map((a,i) => (
              <div key={i} className="text-xs text-[#6B6459] py-1 border-b border-[#F5F5F5] last:border-0">{a}</div>
            ))}
          </div>
        )}

        {/* 検索・フィルター */}
        <div className="card">
          <input type="text" className="form-input mb-2"
            placeholder="🔍 店舗名・科目で検索"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="flex gap-2">
            <input type="month" className="form-input flex-1 text-sm"
              value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
            <select className="form-select flex-1 text-sm" value={filterCat}
              onChange={e => setFilterCat(e.target.value)}>
              <option value="">全科目</option>
              {Array.from(new Set(journals.map(j=>j.category).filter(Boolean))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 最近の記録 */}
        <div className="card">
          <div className="font-serif text-base font-bold mb-3">
            {searchQuery||filterCat||filterMonth ? '検索結果' : '最近の記録'}
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-[#9A9288] text-center py-4">
              {searchQuery||filterCat||filterMonth ? '該当する記録がありません' : 'まだ記録がありません'}
            </p>
          ) : (
            filtered.slice(0, 10).map(j => (
              <div key={j.id} className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0] last:border-0">
                <div>
                  <div className="text-sm font-medium">{j.description}</div>
                  <div className="text-xs text-[#9A9288]">{j.date} · {j.category}</div>
                </div>
                <div className={`text-sm font-bold ${j.type==='income'?'text-[#1E5C3A]':'text-[#1A1A1A]'}`}>
                  {j.type==='income'?'+':'-'}¥{j.amount.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
