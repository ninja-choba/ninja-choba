'use client'
import { useState, useEffect } from 'react'
import {
  getTaxConfig, getCurrentTaxRates, addTaxSchedule,
  removeTaxSchedule, type TaxRateSchedule,
} from '@/lib/etax'

export default function TaxRateCard() {
  const [rates, setRates]       = useState({ standard: 10, reduced: 8 })
  const [schedules, setSchedules] = useState<TaxRateSchedule[]>([])
  const [showAdd, setShowAdd]   = useState(false)

  // 新規スケジュール入力
  const [newDate, setNewDate]       = useState('')
  const [newStandard, setNewStandard] = useState('10')
  const [newReduced, setNewReduced]   = useState('8')
  const [newLabel, setNewLabel]       = useState('')

  function reload() {
    setRates(getCurrentTaxRates())
    setSchedules(getTaxConfig().schedules ?? [])
  }

  useEffect(() => { reload() }, [])

  function handleAdd() {
    if (!newDate || !newStandard || !newReduced) {
      alert('施行日・標準税率・軽減税率を入力してください')
      return
    }
    if (Number(newReduced) > Number(newStandard)) {
      alert('軽減税率は標準税率以下にしてください')
      return
    }
    addTaxSchedule(newDate, Number(newStandard), Number(newReduced), newLabel || undefined)
    reload()
    setShowAdd(false)
    setNewDate(''); setNewStandard('10'); setNewReduced('8'); setNewLabel('')
  }

  function handleRemove(id: string) {
    if (!confirm('このスケジュールを削除しますか？')) return
    removeTaxSchedule(id)
    reload()
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-serif text-base font-bold">消費税率設定</div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-white bg-[#1A1A1A] px-3 py-1.5 rounded-full">
          ＋ 変更予定を追加
        </button>
      </div>

      {/* 現在の税率 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#F0F8F4] rounded-xl p-3 text-center">
          <div className="text-xs text-[#6B6459] mb-1">現在の標準税率</div>
          <div className="text-2xl font-bold text-[#1E5C3A]">{rates.standard}%</div>
        </div>
        <div className="bg-[#F0F8F4] rounded-xl p-3 text-center">
          <div className="text-xs text-[#6B6459] mb-1">軽減税率</div>
          <div className="text-2xl font-bold text-[#1E5C3A]">{rates.reduced}%</div>
        </div>
      </div>

      <p className="text-xs text-[#9A9288] mb-3 leading-relaxed">
        将来の税率変更（例：15%への引き上げ）を事前に登録しておくと、
        施行日以降の仕訳に新税率が自動適用されます。
      </p>

      {/* 変更スケジュール追加フォーム */}
      {showAdd && (
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3 space-y-3">
          <div className="text-sm font-medium">税率変更スケジュールを追加</div>
          <div>
            <label className="text-xs text-[#6B6459] block mb-1">施行日</label>
            <input type="date" className="form-input" value={newDate}
              onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">標準税率（%）</label>
              <input type="number" className="form-input" value={newStandard}
                onChange={(e) => setNewStandard(e.target.value)} min="0" max="50" />
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">軽減税率（%）</label>
              <input type="number" className="form-input" value={newReduced}
                onChange={(e) => setNewReduced(e.target.value)} min="0" max="50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#6B6459] block mb-1">メモ（任意）</label>
            <input type="text" className="form-input" value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="例：2027年10月改定" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
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

      {/* スケジュール一覧 */}
      {schedules.length === 0 ? (
        <p className="text-xs text-[#9A9288] text-center py-3">
          変更スケジュールは登録されていません
        </p>
      ) : (
        <div className="space-y-0">
          <div className="text-xs text-[#9A9288] mb-2">登録済みスケジュール</div>
          {schedules.map((s) => (
            <div key={s.id}
              className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
              <div>
                <div className="text-sm font-medium">{s.effectiveDate} 施行</div>
                <div className="text-xs text-[#9A9288]">
                  標準 {s.standard}% / 軽減 {s.reduced}%
                  {s.label && ` · ${s.label}`}
                </div>
              </div>
              <button onClick={() => handleRemove(s.id)}
                className="text-xs text-[#9A9288] border border-[#E5E0D8] rounded-lg px-2.5 py-1">
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
