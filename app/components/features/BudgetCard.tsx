'use client'
import { useState, useEffect } from 'react'
import { BudgetStore, type BudgetSetting } from '@/lib/budget'

const CATEGORIES = ['交際費','会議費','消耗品費','旅費交通費','通信費','広告宣伝費','福利厚生費','地代家賃','水道光熱費','外注費','雑費']

export default function BudgetCard() {
  const [budgets, setBudgets]     = useState<BudgetSetting[]>([])
  const [showAdd, setShowAdd]     = useState(false)
  const [newCat, setNewCat]       = useState(CATEGORIES[0])
  const [newAmt, setNewAmt]       = useState('')
  const [newAlert, setNewAlert]   = useState('80')

  function reload() { setBudgets(BudgetStore.getAll()) }
  useEffect(() => { reload() }, [])

  function handleAdd() {
    if (!newAmt) { alert('予算金額を入力してください'); return }
    BudgetStore.add({ category: newCat, amount: Number(newAmt), alertAt: Number(newAlert) })
    reload()
    setShowAdd(false)
    setNewAmt(''); setNewAlert('80')
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-base font-bold">科目別予算管理</div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-white bg-[#1A1A1A] px-3 py-1.5 rounded-full">
          ＋ 予算を追加
        </button>
      </div>

      <p className="text-xs text-[#9A9288] mb-3 leading-relaxed">
        科目ごとに月次予算を設定すると、超過時にダッシュボードで通知されます。
      </p>

      {showAdd && (
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3 space-y-3">
          <div>
            <label className="text-xs text-[#6B6459] block mb-1">勘定科目</label>
            <select className="form-select" value={newCat} onChange={e => setNewCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">月次予算（円）</label>
              <input type="number" inputMode="numeric" className="form-input"
                value={newAmt} onChange={e => setNewAmt(e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">警告閾値（%）</label>
              <select className="form-select" value={newAlert} onChange={e => setNewAlert(e.target.value)}>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
                <option value="100">100%（超過のみ）</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">追加</button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2.5 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">キャンセル</button>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <p className="text-xs text-[#9A9288] text-center py-3">予算が設定されていません</p>
      ) : (
        budgets.map(b => (
          <div key={b.category} className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
            <div>
              <div className="text-sm font-medium">{b.category}</div>
              <div className="text-xs text-[#9A9288]">
                月次 ¥{b.amount.toLocaleString()} · {b.alertAt}%で警告
              </div>
            </div>
            <button onClick={() => { BudgetStore.remove(b.category); reload() }}
              className="text-xs text-[#9A9288] border border-[#E5E0D8] rounded-lg px-2.5 py-1">
              削除
            </button>
          </div>
        ))
      )}
    </div>
  )
}
