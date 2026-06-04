'use client'
import { useToast } from '@/components/ui/Toast'
import { useState, useEffect } from 'react'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

/* ── 控除対象カテゴリ定義 ── */
const DEDUCTION_CATEGORIES = [
  // 医療費控除
  { id: 'hospital',        group: '医療費控除',   label: '病院・診察費',          icon: '🏥', deductible: true,  notes: '保険診療・自由診療問わず対象' },
  { id: 'medicine',        group: '医療費控除',   label: '医薬品・市販薬',        icon: '💊', deductible: true,  notes: '治療目的の医薬品。予防薬は原則対象外' },
  { id: 'dental',          group: '医療費控除',   label: '歯科治療',              icon: '🦷', deductible: true,  notes: '虫歯治療・入れ歯等。審美目的は対象外' },
  { id: 'transport',       group: '医療費控除',   label: '通院交通費',            icon: '🚌', deductible: true,  notes: '公共交通機関のみ。マイカーのガソリン代は原則不可' },
  { id: 'nursing',         group: '医療費控除',   label: '介護・訪問看護',        icon: '👨‍⚕️', deductible: true,  notes: '要介護認定を受けた方の介護サービス費' },
  { id: 'childbirth',      group: '医療費控除',   label: '出産費用',              icon: '👶', deductible: true,  notes: '出産育児一時金を差し引いた実質負担額' },
  { id: 'glasses',         group: '医療費控除',   label: '治療用眼鏡・補聴器',    icon: '👓', deductible: true,  notes: '医師の指示がある場合。一般的な眼鏡は対象外' },
  { id: 'serf',            group: 'セルフメディケーション', label: 'セルフメディケーション税制対象薬', icon: '💉', deductible: true, notes: 'スイッチOTC医薬品。通常の医療費控除と選択適用' },
  // 社会保険料控除
  { id: 'health_ins',      group: '社会保険料控除', label: '国民健康保険料',      icon: '🏛', deductible: true,  notes: '全額控除対象' },
  { id: 'pension',         group: '社会保険料控除', label: '国民年金保険料',      icon: '🏛', deductible: true,  notes: '全額控除対象。付加保険料も含む' },
  { id: 'care_ins',        group: '社会保険料控除', label: '介護保険料',          icon: '🏛', deductible: true,  notes: '全額控除対象' },
  // 小規模企業共済等掛金控除
  { id: 'kyosai',          group: '小規模企業共済等', label: '小規模企業共済掛金', icon: '📋', deductible: true, notes: '全額控除対象。個人事業主の退職金制度' },
  { id: 'ideco',           group: '小規模企業共済等', label: 'iDeCo掛金',         icon: '📋', deductible: true, notes: '全額控除対象。年間最大81.6万円' },
  // 生命保険料控除
  { id: 'life_ins',        group: '生命保険料控除', label: '生命保険料',          icon: '🛡', deductible: true,  notes: '最大12万円控除。新旧契約で計算方法が異なる' },
  { id: 'medical_ins',     group: '生命保険料控除', label: '医療保険・介護保険料', icon: '🛡', deductible: true,  notes: '介護医療保険料控除として最大4万円' },
  // 地震保険料控除
  { id: 'quake_ins',       group: '地震保険料控除', label: '地震保険料',          icon: '🏠', deductible: true,  notes: '最大5万円控除' },
  // 寄附金控除
  { id: 'furusato',        group: '寄附金控除',   label: 'ふるさと納税',          icon: '🎁', deductible: true,  notes: '2,000円を超える部分が控除対象' },
  { id: 'donation',        group: '寄附金控除',   label: '認定NPO等への寄附',     icon: '🎁', deductible: true,  notes: '所得の40%が上限' },
  // 雑損控除
  { id: 'disaster',        group: '雑損控除',     label: '災害・盗難による損失',  icon: '⚠️', deductible: true,  notes: '損失額 - 所得×10% が控除対象' },
  // 対象外
  { id: 'cosmetic',        group: '対象外',       label: '美容・審美目的',        icon: '❌', deductible: false, notes: '美容整形・ホワイトニング等は対象外' },
  { id: 'supplement',      group: '対象外',       label: 'サプリメント・健康食品', icon: '❌', deductible: false, notes: '医師の処方がない限り対象外' },
  { id: 'gym',             group: '対象外',       label: 'ジム・スポーツクラブ',  icon: '❌', deductible: false, notes: '原則対象外（一部疾病治療目的を除く）' },
]

interface MedicalRecord {
  id:         string
  date:       string
  category:   string
  description: string
  amount:     number
  insurance:  number   // 保険給付金
  memo:       string
}

const STORAGE_KEY = 'ninjaMedicalRecords'
const YEAR = new Date().getFullYear()
// 医療費控除の閾値
const THRESHOLD = 100000  // 10万円 or 所得の5%の低い方

export default function MedicalPage() {
  const { showToast } = useToast()
  const [records, setRecords]   = useState<MedicalRecord[]>([])
  const [tab, setTab]           = useState<'list' | 'add' | 'guide' | 'calc'>('list')
  const [showCatGuide, setShowCatGuide] = useState(false)

  // 追加フォーム
  const [fDate, setFDate]       = useState(new Date().toISOString().slice(0,10))
  const [fCat, setFCat]         = useState('hospital')
  const [fDesc, setFDesc]       = useState('')
  const [fAmount, setFAmount]   = useState('')
  const [fInsurance, setFInsurance] = useState('')
  const [fMemo, setFMemo]       = useState('')

  // 所得入力（控除額計算用）
  const [income, setIncome]     = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setRecords(JSON.parse(saved))
    } catch {}
  }, [])

  function save(newRecords: MedicalRecord[]) {
    setRecords(newRecords)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords))
  }

  function addRecord() {
    if (!fAmount) { showToast('金額を入力してください'); return }
    const rec: MedicalRecord = {
      id:          crypto.randomUUID(),
      date:        fDate,
      category:    fCat,
      description: fDesc,
      amount:      Number(fAmount),
      insurance:   Number(fInsurance) || 0,
      memo:        fMemo,
    }
    save([rec, ...records])
    setFDesc(''); setFAmount(''); setFInsurance(''); setFMemo('')
    setTab('list')
  }

  function deleteRecord(id: string) {
    if (!confirm('削除しますか？')) return
    save(records.filter(r => r.id !== id))
  }

  // 集計
  const yearRecords    = records.filter(r => r.date.startsWith(String(YEAR)))
  const totalPaid      = yearRecords.reduce((s, r) => s + r.amount, 0)
  const totalInsurance = yearRecords.reduce((s, r) => s + r.insurance, 0)
  const netAmount      = totalPaid - totalInsurance  // 実質負担額

  // 医療費控除の対象のみ
  const deductibleCats = DEDUCTION_CATEGORIES.filter(c => c.deductible && c.group === '医療費控除').map(c => c.id)
  const deductibleAmount = yearRecords
    .filter(r => deductibleCats.includes(r.category))
    .reduce((s, r) => s + r.amount - r.insurance, 0)

  // 控除額計算
  const incomeNum     = Number(income) * 10000
  const minThreshold  = incomeNum > 0 ? Math.min(THRESHOLD, incomeNum * 0.05) : THRESHOLD
  const deductionAmt  = Math.max(0, deductibleAmount - minThreshold)

  // カテゴリ別集計
  const byCat: Record<string, number> = {}
  yearRecords.forEach(r => {
    byCat[r.category] = (byCat[r.category] || 0) + r.amount
  })

  const getCat = (id: string) => DEDUCTION_CATEGORIES.find(c => c.id === id)

  const groups = Array.from(new Set(DEDUCTION_CATEGORIES.map(c => c.group)))

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* ヘッダー */}
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">🏥</div>
          <div className="font-serif text-lg font-bold">控除対象費用管理</div>
          <p className="text-xs text-[#6B6459] mt-1">医療費控除・社会保険料控除など各種控除を一元管理</p>
        </div>

        {/* タブ */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'list',  label: '記録一覧' },
            { id: 'calc',  label: '控除額計算' },
            { id: 'add',   label: '＋ 追加' },
            { id: 'guide', label: '対象ガイド' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 border transition-all ${
                tab === t.id ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E5E0D8] text-[#6B6459]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 記録一覧 ── */}
        {tab === 'list' && (
          <div>
            {/* 年次サマリー */}
            <div className="card">
              <div className="text-sm font-medium mb-3">{YEAR}年 集計</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#F8F8F8] rounded-xl p-3 text-center">
                  <div className="text-xs text-[#9A9288] mb-1">支払合計</div>
                  <div className="text-base font-bold">¥{totalPaid.toLocaleString()}</div>
                </div>
                <div className="bg-[#F8F8F8] rounded-xl p-3 text-center">
                  <div className="text-xs text-[#9A9288] mb-1">保険給付</div>
                  <div className="text-base font-bold text-[#1E5C3A]">¥{totalInsurance.toLocaleString()}</div>
                </div>
                <div className="bg-[#F0F8F4] rounded-xl p-3 text-center">
                  <div className="text-xs text-[#9A9288] mb-1">実質負担</div>
                  <div className="text-base font-bold text-[#1E5C3A]">¥{netAmount.toLocaleString()}</div>
                </div>
              </div>
              {deductibleAmount >= minThreshold ? (
                <div className="bg-[#E8F4F0] rounded-xl p-3 text-sm text-[#1E5C3A]">
                  ✓ 医療費控除の申請が可能な見込みです（控除対象額 ¥{deductibleAmount.toLocaleString()}）
                </div>
              ) : (
                <div className="bg-[#F5F5F5] rounded-xl p-3 text-sm text-[#9A9288]">
                  医療費控除まであと ¥{Math.max(0, minThreshold - deductibleAmount).toLocaleString()} 程度
                </div>
              )}
            </div>

            {/* 記録一覧 */}
            {records.length === 0 ? (
              <div className="text-center py-12 text-[#9A9288]">
                <div className="text-4xl mb-3">🏥</div>
                <p className="text-sm">「＋ 追加」から記録してください</p>
              </div>
            ) : (
              records.slice(0, 50).map(r => {
                const cat = getCat(r.category)
                const net = r.amount - r.insurance
                return (
                  <div key={r.id} className="card">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat?.icon || '💊'}</span>
                        <div>
                          <div className="text-sm font-medium">{r.description || cat?.label}</div>
                          <div className="text-xs text-[#9A9288]">{r.date} · {cat?.group}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">¥{r.amount.toLocaleString()}</div>
                        {r.insurance > 0 && (
                          <div className="text-xs text-[#1E5C3A]">実質 ¥{net.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    {r.memo && <div className="text-xs text-[#9A9288] ml-8">{r.memo}</div>}
                    <button onClick={() => deleteRecord(r.id)}
                      className="mt-2 text-xs text-[#C0B9AF] bg-transparent border-none cursor-pointer p-0">
                      削除
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── 控除額計算 ── */}
        {tab === 'calc' && (
          <div className="space-y-3.5">
            <div className="card">
              <div className="text-sm font-medium mb-3">医療費控除額の計算</div>
              <div className="mb-3">
                <label className="text-xs text-[#6B6459] block mb-1">年間所得（万円）</label>
                <input type="number" inputMode="numeric" className="form-input"
                  value={income} onChange={e => setIncome(e.target.value)}
                  placeholder="例：300（300万円の場合）" />
                <p className="text-xs text-[#9A9288] mt-1">確定申告書の「所得金額の合計」を入力</p>
              </div>

              <div className="space-y-2 text-sm">
                {[
                  { label: '医療費支払合計',        value: `¥${totalPaid.toLocaleString()}` },
                  { label: '保険給付金等',           value: `▲¥${totalInsurance.toLocaleString()}`, color: 'text-[#1E5C3A]' },
                  { label: '実質医療費負担額',       value: `¥${deductibleAmount.toLocaleString()}`, bold: true },
                  { label: `控除の下限（${income ? `所得の5% or 10万円の低い方` : '10万円'}）`, value: `▲¥${minThreshold.toLocaleString()}` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-[#F5F5F5]">
                    <span className="text-[#6B6459]">{item.label}</span>
                    <span className={`${item.bold ? 'font-bold' : ''} ${item.color || ''}`}>{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-3 font-bold text-base">
                  <span>控除額（概算）</span>
                  <span className={deductionAmt > 0 ? 'text-[#1E5C3A]' : 'text-[#9A9288]'}>
                    ¥{deductionAmt.toLocaleString()}
                  </span>
                </div>
              </div>

              {deductionAmt > 0 && income && (
                <div className="bg-[#E8F4F0] rounded-xl p-3 text-sm text-[#1E5C3A] mt-2">
                  税率20%の場合、約 ¥{Math.round(deductionAmt * 0.2).toLocaleString()} の節税効果の見込み
                </div>
              )}
              <p className="text-xs text-[#9A9288] mt-3 leading-relaxed">
                ※ 概算です。実際の控除額は税理士・税務署にご確認ください。
              </p>
            </div>

            {/* セルフメディケーション税制 */}
            <div className="card">
              <div className="text-sm font-medium mb-2">セルフメディケーション税制</div>
              <p className="text-xs text-[#6B6459] leading-relaxed mb-2">
                スイッチOTC医薬品の購入額が年間12,000円を超えた場合、超えた部分（上限88,000円）が控除対象。
                通常の医療費控除と選択適用（どちらか有利な方を選ぶ）。
              </p>
              {(() => {
                const selfAmt = yearRecords
                  .filter(r => r.category === 'serf')
                  .reduce((s, r) => s + r.amount - r.insurance, 0)
                const selfDeduction = Math.min(88000, Math.max(0, selfAmt - 12000))
                return (
                  <div className="bg-[#F8F8F8] rounded-xl p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B6459]">OTC医薬品購入額</span>
                      <span>¥{selfAmt.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-1 font-bold">
                      <span>控除額（概算）</span>
                      <span className={selfDeduction > 0 ? 'text-[#1E5C3A]' : 'text-[#9A9288]'}>
                        ¥{selfDeduction.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── 追加フォーム ── */}
        {tab === 'add' && (
          <div className="card space-y-3">
            <div className="text-sm font-medium">控除対象費用を追加</div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">カテゴリ</label>
              <select className="form-select" value={fCat} onChange={e => setFCat(e.target.value)}>
                {groups.map(group => (
                  <optgroup key={group} label={group}>
                    {DEDUCTION_CATEGORIES.filter(c => c.group === group).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {fCat && (
                <p className="text-xs text-[#9A9288] mt-1">
                  {getCat(fCat)?.notes}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">内容・病院名など</label>
              <input className="form-input" type="text" value={fDesc}
                onChange={e => setFDesc(e.target.value)} placeholder="例：〇〇クリニック 診察料" />
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">日付</label>
              <input className="form-input" type="date" value={fDate}
                onChange={e => setFDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">支払金額（円）</label>
                <input className="form-input" type="number" inputMode="numeric"
                  value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="3000" />
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">保険給付金（円）</label>
                <input className="form-input" type="number" inputMode="numeric"
                  value={fInsurance} onChange={e => setFInsurance(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">メモ</label>
              <input className="form-input" type="text" value={fMemo}
                onChange={e => setFMemo(e.target.value)} placeholder="任意" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addRecord}
                className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                追加
              </button>
              <button onClick={() => setTab('list')}
                className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ── 控除対象ガイド ── */}
        {tab === 'guide' && (
          <div className="space-y-3">
            <div className="bg-[#FFF8EC] border border-[#F5DFA0] rounded-xl p-4 text-sm text-[#6B4A00]">
              ⚠ 控除の適用可否は個人の状況によります。最終判断は税理士・税務署にご確認ください。
            </div>
            {groups.map(group => (
              <div key={group} className="card">
                <div className="font-medium text-sm mb-3 text-[#2F5D50]">{group}</div>
                {DEDUCTION_CATEGORIES.filter(c => c.group === group).map(c => (
                  <div key={c.id} className="flex items-start gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${c.deductible ? 'text-[#1A1A1A]' : 'text-[#9A9288]'}`}>
                        {c.label}
                        {!c.deductible && <span className="ml-2 text-xs text-[#8B2020]">対象外</span>}
                      </div>
                      <div className="text-xs text-[#9A9288] mt-0.5 leading-relaxed">{c.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
