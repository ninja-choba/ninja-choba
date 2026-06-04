'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import type { Journal } from '@/types/database'

export default function DashboardPage() {
  const { journals, setJournals, user, setUser } = useAppStore()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setUser({ userId: session.user.id, email: session.user.email ?? null })

      // 仕訳を取得
      const { data } = await (supabase as any)
        .from('journals')
        .select('*')
        .eq('account_email', session.user.email ?? '')
        .order('date', { ascending: false })
        .limit(100)

      if (data) {
        setJournals((data as any[]).map((r: any) => ({
          id:          r.id,
          date:        r.date,
          description: r.description,
          amount:      r.amount,
          type:        r.type,
          category:    r.category,
          incomeType:  r.income_type,
          memo:        r.memo,
          imgUrl:      r.img_url,
          aiReview:    r.ai_review ? JSON.parse(r.ai_review) : null,
        })))
      }
    }
    load()
  }, [])

  // 今月集計
  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const monthJournals = journals.filter((j) => j.date.startsWith(thisMonth))
  const income  = monthJournals.filter((j) => j.type === 'income').reduce((s, j) => s + j.amount, 0)
  const expense = monthJournals.filter((j) => j.type === 'expense').reduce((s, j) => s + j.amount, 0)
  const net     = income - expense
  const dangers = monthJournals.filter((j) => j.aiReview?.risk === 'danger').length
  const noEvi   = monthJournals.filter((j) => !j.imgUrl).length

  return (
    <div className="min-h-dvh pb-20 washi-bg">
      <TopBar />

      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* 今月安全バッジ */}
        <div className="card">
          <div className="font-serif text-lg font-bold mb-2">今月の状態</div>
          {dangers === 0 && noEvi === 0 ? (
            <span className="badge-safe">今月安全</span>
          ) : (
            <span className="badge-danger">要確認</span>
          )}
          <p className="text-sm text-[#6B6459] mt-2">
            {monthJournals.length}件 · 収入 ¥{income.toLocaleString()} · 支出 ¥{expense.toLocaleString()}
          </p>
          {dangers > 0 && <p className="text-xs text-[#8B2020] mt-1">⚠ 要確認が{dangers}件あります</p>}
          {noEvi > 0  && <p className="text-xs text-[#9A6B1E] mt-1">· 証憑なしが{noEvi}件あります</p>}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          {[
            { label: '今月収入',  value: `¥${income.toLocaleString()}`,  color: '#1E5C3A' },
            { label: '今月支出',  value: `¥${expense.toLocaleString()}`, color: '#8B2020' },
            { label: '収支',      value: `${net >= 0 ? '+' : ''}¥${net.toLocaleString()}`, color: net >= 0 ? '#1E5C3A' : '#8B2020' },
            { label: '記録件数',  value: `${monthJournals.length}件`,    color: '#1A1A1A' },
          ].map((kpi) => (
            <div key={kpi.label} className="card mb-0">
              <div className="text-xs text-[#6B6459] mb-1">{kpi.label}</div>
              <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* 最近の記録 */}
        <div className="card">
          <div className="font-serif text-base font-bold mb-3">最近の記録</div>
          {journals.slice(0, 5).length === 0 ? (
            <p className="text-sm text-[#9A9288] text-center py-4">まだ記録がありません</p>
          ) : (
            journals.slice(0, 5).map((j) => (
              <div key={j.id} className="flex justify-between items-center py-2.5 border-b border-[#F0F0F0] last:border-0">
                <div>
                  <div className="text-sm font-medium">{j.description}</div>
                  <div className="text-xs text-[#9A9288]">{j.date} · {j.category}</div>
                </div>
                <div className={`text-sm font-bold ${j.type === 'income' ? 'text-[#1E5C3A]' : 'text-[#1A1A1A]'}`}>
                  {j.type === 'income' ? '+' : '-'}¥{j.amount.toLocaleString()}
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
