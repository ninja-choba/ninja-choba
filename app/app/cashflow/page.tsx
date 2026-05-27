'use client'
import { useToast } from '@/components/ui/Toast'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import type { CashflowPlan } from '@/types/database'

interface MonthData {
  ym:           string
  label:        string
  income:       number
  expense:      number
  net:          number
  openBalance:  number
  closeBalance: number
  isForecast:   boolean
}

function calcMonths(
  journals: any[],
  plan: CashflowPlan[],
  startBalance: number,
  months = 6
): MonthData[] {
  const now    = new Date()
  const result: MonthData[] = []
  let balance  = startBalance

  for (let i = -2; i < months; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym  = d.toISOString().slice(0, 7)
    const label = `${d.getMonth() + 1}月`
    const isPast = i < 0
    const isThis = i === 0

    // 実績（仕訳から）
    const monthJ   = journals.filter((j) => j.date?.startsWith(ym))
    const actInc   = monthJ.filter((j) => j.type === 'income').reduce((s:number, j:any) => s + j.amount, 0)
    const actExp   = monthJ.filter((j) => j.type === 'expense').reduce((s:number, j:any) => s + j.amount, 0)

    // 計画
    const planInc  = plan.filter((p) => p.ym === ym && p.type === 'income').reduce((s, p) => s + p.amount, 0)
    const planExp  = plan.filter((p) => p.ym === ym && p.type === 'expense').reduce((s, p) => s + p.amount, 0)

    const income  = isPast || isThis ? actInc  + planInc  : planInc
    const expense = isPast || isThis ? actExp  + planExp  : planExp
    const net     = income - expense

    result.push({
      ym, label, income, expense, net,
      openBalance:  balance,
      closeBalance: balance + net,
      isForecast:   i > 0,
    })
    balance += net
  }
  return result
}

export default function CashflowPage() {
  const { showToast } = useToast()
  const { journals, cashflowPlan, bankBalance, setBankBalance,
          addCashflowItem, deleteCashflowItem } = useAppStore()

  const [months, setMonths]       = useState<MonthData[]>([])
  const [showAdd, setShowAdd]     = useState(false)
  const [horizon, setHorizon]     = useState(6)

  // 追加フォーム
  const [fcType, setFcType]       = useState<'income' | 'expense'>('expense')
  const [fcName, setFcName]       = useState('')
  const [fcAmount, setFcAmount]   = useState('')
  const [fcYm, setFcYm]           = useState(new Date().toISOString().slice(0, 7))
  const [fcRepeat, setFcRepeat]   = useState('once')

  useEffect(() => {
    setMonths(calcMonths(journals, cashflowPlan, bankBalance, horizon))
  }, [journals, cashflowPlan, bankBalance, horizon])

  const maxAbs = Math.max(...months.map((m) => Math.abs(m.net)), 1)
  const shortage = months.find((m) => m.closeBalance < 0)

  function addItem() {
    if (!fcName || !fcAmount) { showToast('名称と金額を入力してください'); return }
    const count = fcRepeat === 'once' ? 1 : Number(fcRepeat)
    for (let i = 0; i < count; i++) {
      const d = new Date(fcYm + '-01')
      d.setMonth(d.getMonth() + i)
      const ym = d.toISOString().slice(0, 7)
      addCashflowItem({
        id:     crypto.randomUUID(),
        type:   fcType,
        name:   fcName,
        amount: Number(fcAmount),
        ym,
        repeat: fcRepeat,
      })
    }
    setShowAdd(false)
    setFcName(''); setFcAmount('')
  }

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* 残高設定 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-serif text-lg font-bold">資金繰り予測</div>
            <div className="flex gap-2">
              {([3, 6] as const).map((h) => (
                <button key={h} onClick={() => setHorizon(h)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    horizon === h ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E0D8] text-[#6B6459]'
                  }`}>
                  {h}ヶ月
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <label className="text-xs text-[#6B6459] whitespace-nowrap">現在残高</label>
            <input
              type="number" inputMode="numeric"
              value={bankBalance || ''}
              onChange={(e) => setBankBalance(Number(e.target.value))}
              placeholder="1000000"
              className="form-input flex-1"
            />
            <span className="text-sm text-[#6B6459]">円</span>
          </div>

          {/* 資金不足アラート */}
          {shortage ? (
            <div className="mt-3 bg-[#FFF0F0] rounded-xl p-3 text-sm text-[#8B2020]">
              <span className="font-medium">⚠ {shortage.label}に資金不足の可能性</span>
              <span className="text-xs ml-2">残高予測: ¥{shortage.closeBalance.toLocaleString()}</span>
            </div>
          ) : months.length > 0 ? (
            <div className="mt-3 bg-[#E8F4F0] rounded-xl p-3 text-sm text-[#1E5C3A]">
              ✓ {horizon}ヶ月以内に資金不足の見込みはありません
            </div>
          ) : null}
        </div>

        {/* グラフ */}
        <div className="card">
          <div className="text-sm font-medium mb-3">月次キャッシュフロー</div>
          <div className="flex gap-2 items-end h-24 mb-2">
            {months.map((m) => {
              const h   = Math.max(4, Math.round(Math.abs(m.net) / maxAbs * 88))
              const pos = m.net >= 0
              return (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] text-[#9A9288]">
                    {m.net !== 0 ? (m.net > 0 ? '+' : '') + Math.round(m.net / 10000) + '万' : ''}
                  </div>
                  <div className="w-full flex flex-col-reverse" style={{ height: 72 }}>
                    <div style={{
                      height: h,
                      background: pos ? '#2F5D50' : '#8B2020',
                      borderRadius: '4px 4px 0 0',
                      opacity: m.isForecast ? 0.5 : 0.85,
                    }} />
                  </div>
                  <div className="text-[9px] text-[#9A9288]">{m.label}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 text-[11px] text-[#9A9288]">
            <span><span className="inline-block w-2.5 h-2.5 bg-[#2F5D50] rounded-sm mr-1" />黒字</span>
            <span><span className="inline-block w-2.5 h-2.5 bg-[#8B2020] rounded-sm mr-1" />赤字</span>
            <span className="ml-auto opacity-60">薄色=予測</span>
          </div>
        </div>

        {/* 月次テーブル */}
        <div className="card overflow-x-auto">
          <div className="text-sm font-medium mb-3">月次詳細（万円）</div>
          <table className="w-full text-xs" style={{ minWidth: 340 }}>
            <thead>
              <tr className="text-[#9A9288] border-b border-[#F0F0F0]">
                <th className="text-left py-1.5 pr-2">月</th>
                <th className="text-right py-1.5 pr-2">収入</th>
                <th className="text-right py-1.5 pr-2">支出</th>
                <th className="text-right py-1.5 pr-2">収支</th>
                <th className="text-right py-1.5">期末残高</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const w = (v: number) => Math.round(v / 10000).toLocaleString()
                return (
                  <tr key={m.ym}
                    className={`border-b border-[#F8F8F8] ${m.isForecast ? 'opacity-60' : ''}`}>
                    <td className="py-2 pr-2 font-medium">
                      {m.label}{m.isForecast ? '予' : ''}
                    </td>
                    <td className="text-right pr-2 text-[#1E5C3A]">{w(m.income)}</td>
                    <td className="text-right pr-2">{w(m.expense)}</td>
                    <td className={`text-right pr-2 font-medium ${m.net >= 0 ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}`}>
                      {m.net >= 0 ? '+' : ''}{w(m.net)}
                    </td>
                    <td className={`text-right font-bold ${m.closeBalance >= 0 ? 'text-[#1A1A1A]' : 'text-[#8B2020]'}`}>
                      {w(m.closeBalance)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 収支計画一覧 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">収支計画</div>
            <button onClick={() => setShowAdd(!showAdd)}
              className="text-xs text-white bg-[#1A1A1A] px-3 py-1.5 rounded-full">
              ＋ 追加
            </button>
          </div>

          {/* 追加フォーム */}
          {showAdd && (
            <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3 space-y-3">
              <select className="form-select" value={fcType}
                onChange={(e) => setFcType(e.target.value as 'income' | 'expense')}>
                <option value="expense">支出（固定費・支払予定）</option>
                <option value="income">収入（売上予定・入金予定）</option>
              </select>
              <input className="form-input" type="text" placeholder="名称（例：家賃、ローン返済）"
                value={fcName} onChange={(e) => setFcName(e.target.value)} />
              <input className="form-input" type="number" inputMode="numeric"
                placeholder="金額（円）" value={fcAmount} onChange={(e) => setFcAmount(e.target.value)} />
              <input className="form-input" type="month" value={fcYm}
                onChange={(e) => setFcYm(e.target.value)} />
              <select className="form-select" value={fcRepeat}
                onChange={(e) => setFcRepeat(e.target.value)}>
                <option value="once">1回のみ</option>
                <option value="3">3ヶ月繰り返し</option>
                <option value="6">6ヶ月繰り返し</option>
                <option value="12">12ヶ月繰り返し</option>
              </select>
              <div className="flex gap-2">
                <button onClick={addItem}
                  className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                  追加
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {cashflowPlan.length === 0 ? (
            <p className="text-sm text-[#9A9288] text-center py-4">
              収支計画を追加すると予測精度が上がります
            </p>
          ) : (
            cashflowPlan.slice(0, 20).map((item) => (
              <div key={item.id}
                className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-[#9A9288]">{item.ym} · {item.type === 'income' ? '収入' : '支出'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${item.type === 'income' ? 'text-[#1E5C3A]' : 'text-[#8B2020]'}`}>
                    {item.type === 'income' ? '+' : '-'}¥{item.amount.toLocaleString()}
                  </span>
                  <button onClick={() => deleteCashflowItem(item.id)}
                    className="text-[#9A9288] text-xs border border-[#E5E0D8] rounded-lg px-2 py-1">
                    削除
                  </button>
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
