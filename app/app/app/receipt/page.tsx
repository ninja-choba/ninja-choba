'use client'
import { useToast } from '@/components/ui/Toast'
import { useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import type { Journal, AIReview } from '@/types/database'

const CATEGORIES = [
  '交際費','会議費','消耗品費','旅費交通費','通信費',
  '広告宣伝費','福利厚生費','地代家賃','水道光熱費','外注費','雑費',
]

const TAX_RATES = ['10%','8%','0%','mixed']

export default function ReceiptPage() {
  const { showToast } = useToast()
  const { user, addJournal } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview]     = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [aiResult, setAiResult]   = useState<AIReview | null>(null)

  // フォーム
  const [merchant, setMerchant]   = useState('')
  const [amount, setAmount]       = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0,10))
  const [taxRate, setTaxRate]     = useState('10%')
  const [category, setCategory]   = useState('')
  const [purpose, setPurpose]     = useState('')
  const [memo, setMemo]           = useState('')
  const [hasEvidence, setHasEvidence] = useState(true)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file))
    }
    setShowForm(true)
    setDate(new Date().toISOString().slice(0,10))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function runAIReview() {
    if (!merchant || !amount) { showToast('店舗名と金額を入力してください'); return }
    setReviewing(true)
    try {
      const res = await fetch('/api/receipt/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant, amount: Number(amount), date, taxRate, category, purpose }),
      })
      const data = await res.json()
      setAiResult(data)
      if (data.category && !category) setCategory(data.category)
      if (data.taxRate) setTaxRate(data.taxRate)
    } catch {
      showToast('AIレビューに失敗しました')
    } finally {
      setReviewing(false)
    }
  }

  async function handleSave() {
    if (!merchant || !amount) { showToast('店舗名と金額は必須です'); return }
    setSaving(true)
    try {
      const journal: Journal = {
        id:          crypto.randomUUID(),
        date,
        description: merchant,
        amount:      Number(amount),
        type:        'expense',
        category:    category || '未分類',
        incomeType:  null,
        memo:        memo || purpose || null,
        imgUrl:      preview,
        aiReview:    aiResult,
      }

      // Supabaseに保存
      if (user.email) {
        await (supabase.from('journals') as any).insert({
          id:            journal.id,
          account_email: user.email,
          date:          journal.date,
          description:   journal.description,
          amount:        journal.amount,
          type:          journal.type,
          category:      journal.category,
          memo:          journal.memo,
          img_url:       journal.imgUrl,
          ai_review:     aiResult ? JSON.stringify(aiResult) : null,
        })
      }

      addJournal(journal)
      resetForm()
      showToast('記録しました')
    } catch (e) {
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setShowForm(false)
    setPreview(null)
    setAiResult(null)
    setMerchant(''); setAmount(''); setPurpose(''); setMemo('')
    setCategory(''); setTaxRate('10%')
    setDate(new Date().toISOString().slice(0,10))
    setHasEvidence(true)
  }

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {!showForm ? (
          <>
            {/* 撮影・アップロードボタン */}
            <div className="card">
              <div className="font-serif text-lg font-bold mb-2">門前</div>
              <p className="text-sm text-[#6B6459] mb-4">撮る。アップする。まず記録、整理は後で。</p>

              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute('capture', 'environment')
                    fileRef.current.setAttribute('accept', 'image/*')
                    fileRef.current.click()
                  }
                }}
                className="w-full h-16 bg-[#1A1A1A] text-white rounded-2xl font-serif text-xl font-bold tracking-widest flex items-center justify-center gap-3 active:opacity-75 mb-3"
              >
                <span className="text-2xl">📷</span> 撮る
              </button>

              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute('capture')
                    fileRef.current.setAttribute('accept', 'image/*,application/pdf')
                    fileRef.current.click()
                  }
                }}
                className="w-full py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459] bg-transparent"
              >
                ファイルをアップロード
              </button>

              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>

            {/* 手入力 */}
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 text-sm text-[#6B6459] border border-[#E5E0D8] rounded-xl bg-transparent"
            >
              ＋ 手入力で記録
            </button>
          </>
        ) : (
          /* 入力フォーム */
          <div className="card">
            {preview && (
              <img src={preview} alt="レシート" className="w-full max-h-48 object-cover rounded-xl mb-4" />
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">店舗名・取引先 *</label>
                <input className="form-input" type="text" value={merchant}
                  onChange={(e) => setMerchant(e.target.value)} placeholder="例：コンビニ、東京食堂" />
              </div>

              <div>
                <label className="text-xs text-[#6B6459] block mb-1">金額（円）*</label>
                <input className="form-input" type="number" inputMode="numeric"
                  value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6B6459] block mb-1">日付</label>
                  <input className="form-input" type="date" value={date}
                    onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#6B6459] block mb-1">税率</label>
                  <select className="form-select" value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}>
                    {TAX_RATES.map((r) => (
                      <option key={r} value={r}>{r === 'mixed' ? '混在' : r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#6B6459] block mb-1">勘定科目</label>
                <select className="form-select" value={category}
                  onChange={(e) => setCategory(e.target.value)}>
                  <option value="">未分類</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#6B6459] block mb-1">用途</label>
                <input className="form-input" type="text" value={purpose}
                  onChange={(e) => setPurpose(e.target.value)} placeholder="例：〇〇打ち合わせ" />
              </div>

              <div>
                <label className="text-xs text-[#6B6459] block mb-1">メモ</label>
                <input className="form-input" type="text" value={memo}
                  onChange={(e) => setMemo(e.target.value)} placeholder="任意" />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasEvidence}
                  onChange={(e) => setHasEvidence(e.target.checked)} />
                証憑あり（写真・レシート）
              </label>
            </div>

            {/* AIレビュー結果 */}
            {aiResult && (
              <div className={`mt-4 p-3 rounded-xl text-sm ${
                aiResult.risk === 'danger' ? 'bg-[#FFF0F0] text-[#8B2020]' :
                aiResult.risk === 'warn'   ? 'bg-[#FFF8EC] text-[#9A6B1E]' :
                'bg-[#E8F4F0] text-[#1E5C3A]'
              }`}>
                <div className="font-medium mb-1">
                  {aiResult.risk === 'danger' ? '⚠ 要確認' :
                   aiResult.risk === 'warn'   ? '△ 注意' : '✓ 問題なし'}
                  <span className="ml-2 text-xs opacity-70">
                    信頼度 {Math.round(aiResult.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">{aiResult.reason}</p>
                {aiResult.alerts.map((a, i) => (
                  <p key={i} className="text-xs mt-1">・{a}</p>
                ))}
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm">
                {saving ? '保存中…' : '記録する'}
              </button>
              <button onClick={runAIReview} disabled={reviewing}
                className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                {reviewing ? '…' : 'AI確認'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                戻る
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
