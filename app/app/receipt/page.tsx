'use client'

/* ── 施策4: 画像前処理（Canvas APIで明度・コントラスト補正） ── */
async function preprocessImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      const maxSize = 1200  // 最大1200pxにリサイズ（API送信コスト削減）
      const scale   = Math.min(1, maxSize / Math.max(img.width, img.height))
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // コントラスト・明度補正（レシートの文字を読みやすく）
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data      = imageData.data
      const contrast  = 1.3   // コントラスト強調
      const brightness = 10   // 明度補正

      for (let i = 0; i < data.length; i += 4) {
        data[i]   = Math.min(255, Math.max(0, (data[i]   - 128) * contrast + 128 + brightness))
        data[i+1] = Math.min(255, Math.max(0, (data[i+1] - 128) * contrast + 128 + brightness))
        data[i+2] = Math.min(255, Math.max(0, (data[i+2] - 128) * contrast + 128 + brightness))
      }
      ctx.putImageData(imageData, 0, 0)

      // base64に変換（JPEG品質85%）
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      resolve(base64)
    }
    img.onerror = () => resolve('')
    img.src = imageUrl
  })
}

/* ── 施策6: 修正学習（ユーザーの修正を記録） ── */
const CORRECTION_KEY = 'ninjaOCRCorrections'
function recordCorrection(original: any, corrected: any) {
  try {
    const logs = JSON.parse(localStorage.getItem(CORRECTION_KEY) || '[]')
    logs.unshift({
      original:  { merchant: original.merchant, category: original.category, taxRate: original.taxRate },
      corrected: { merchant: corrected.merchant, category: corrected.category, taxRate: corrected.taxRate },
      at: new Date().toISOString()
    })
    if (logs.length > 100) logs.splice(100)
    localStorage.setItem(CORRECTION_KEY, JSON.stringify(logs))
  } catch {}
}
function getCorrectionHints(): string {
  try {
    const logs = JSON.parse(localStorage.getItem(CORRECTION_KEY) || '[]')
    if (logs.length === 0) return ''
    const patterns = logs.slice(0, 5).map((l: any) =>
      `「${l.original.merchant}」は「${l.corrected.category}」に修正された`
    ).join(', ')
    return `【過去の修正パターン】${patterns}`
  } catch { return '' }
}

import { useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase/client'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { useToast } from '@/components/ui/Toast'
import { TransitHistoryStore, SAMPLE_ROUTES } from '@/lib/transit'
import { BudgetStore } from '@/lib/budget'
import { XPStore, StreakStore } from '@/lib/gamification'
import type { Journal, AIReview } from '@/types/database'

/* ── 店舗記憶 ── */
const MERCHANT_KEY = 'ninjaMerchantMemory'
function getMerchantSuggestions(partial: string): string[] {
  if (!partial || partial.length < 1) return []
  try {
    const mem = JSON.parse(localStorage.getItem(MERCHANT_KEY) || '{}')
    return Object.keys(mem)
      .filter(k => k.includes(partial))
      .sort((a, b) => (mem[b]?.count || 0) - (mem[a]?.count || 0))
      .slice(0, 5)
  } catch { return [] }
}
function saveMerchant(merchant: string, category: string, taxRate: string) {
  if (!merchant) return
  try {
    const mem = JSON.parse(localStorage.getItem(MERCHANT_KEY) || '{}')
    mem[merchant.trim()] = { category, taxRate, count: (mem[merchant.trim()]?.count || 0) + 1, lastUsed: new Date().toISOString() }
    localStorage.setItem(MERCHANT_KEY, JSON.stringify(mem))
  } catch {}
}

/* ── 手裏剣 ── */
const SHURIKEN_KEY = 'ninjaShurikens'
function checkShurikens(count: number): { label: string; num: number } | null {
  try {
    const earned: string[] = JSON.parse(localStorage.getItem(SHURIKEN_KEY) || '[]')
    const rules = [
      { id: 'first',  label: '初記録',     num: 1, check: () => count >= 1  },
      { id: 'ten',    label: '十枚の記録', num: 2, check: () => count >= 10 },
      { id: 'fifty',  label: '五十枚',     num: 5, check: () => count >= 50 },
    ]
    for (const rule of rules) {
      if (!earned.includes(rule.id) && rule.check()) {
        earned.push(rule.id)
        localStorage.setItem(SHURIKEN_KEY, JSON.stringify(earned))
        return { label: rule.label, num: rule.num }
      }
    }
  } catch {}
  return null
}

const CATEGORIES = ['交際費','会議費','消耗品費','旅費交通費','通信費','広告宣伝費','福利厚生費','地代家賃','水道光熱費','外注費','雑費']
const TAX_RATES  = ['10%','8%','0%','mixed']

type Mode = 'menu' | 'receipt' | 'transit' | 'bulk'

export default function ReceiptPage() {
  const { user, journals, addJournal } = useAppStore()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode]           = useState<Mode>('menu')
  const [preview, setPreview]     = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [aiResult, setAiResult]   = useState<AIReview | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // レシートフォーム
  const [merchant, setMerchant]   = useState('')
  const [amount, setAmount]       = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0,10))
  const [taxRate, setTaxRate]     = useState('10%')
  const [category, setCategory]   = useState('')
  const [purpose, setPurpose]     = useState('')
  const [memo, setMemo]           = useState('')
  const [hasEvidence, setHasEvidence] = useState(true)

  // 交通費フォーム
  const [tFrom, setTFrom]         = useState('')
  const [tTo, setTTo]             = useState('')
  const [tFare, setTFare]         = useState('')
  const [tDate, setTDate]         = useState(new Date().toISOString().slice(0,10))
  const [tPurpose, setTPurpose]   = useState('')
  const [tSearching, setTSearching] = useState(false)
  const [tFromSug, setTFromSug]   = useState<string[]>([])
  const [tToSug, setTToSug]       = useState<string[]>([])

  // 一括モード
  const [bulkItems, setBulkItems] = useState<{merchant:string;amount:string;date:string;category:string}[]>(
    [{ merchant:'', amount:'', date: new Date().toISOString().slice(0,10), category:'' }]
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file))
    setMode('receipt')
    if (fileRef.current) fileRef.current.value = ''
  }

  // OCR自動入力（Vision API + 画像前処理 + 多数決）
  const [ocrOriginal, setOcrOriginal] = useState<any>(null)

  async function runOCR() {
    if (!preview) return
    setReviewing(true)
    showToast('🔍 レシートを読み取り中…（高精度モード）')
    try {
      // 施策4: 画像前処理
      const base64 = await preprocessImage(preview)

      // 施策6: 修正学習のヒントをプロンプトに追加
      const hints = getCorrectionHints()

      const res = await fetch('/api/receipt/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          imageUrl:    preview,
          merchant, amount: Number(amount), date, taxRate, category, purpose,
          mode: 'ocr', correctionHints: hints,
        }),
      })
      const data = await res.json()

      // OCR前の状態を記録（修正検知用）
      setOcrOriginal({ merchant, amount, category, taxRate })

      if (data.merchant)  setMerchant(data.merchant)
      if (data.amount)    setAmount(String(data.amount))
      if (data.date)      setDate(data.date)
      if (data.taxRate)   setTaxRate(data.taxRate)
      if (data.category)  setCategory(data.category)
      if (data.risk)      setAiResult(data)

      const conf = Math.round((data.confidence || 0) * 100)
      const agr  = data.agreement ? `・一致率${data.agreement}%` : ''
      showToast(`✓ 読み取り完了（信頼度${conf}%${agr}）`, conf >= 80 ? 'success' : 'warn')
    } catch {
      showToast('OCR読み取りに失敗しました')
    } finally {
      setReviewing(false)
    }
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
      // 予算超過チェック
      const budgetAlerts = BudgetStore.getAlerts(journals)
      const catAlert = budgetAlerts.find(a => a.category === (category || '未分類'))
      if (catAlert?.status === 'over') {
        showToast(`⚠ ${catAlert.category}の予算を超過しています`, 'warn')
      } else if (catAlert?.status === 'warn') {
        showToast(`⚠ ${catAlert.category}の予算が${catAlert.rate}%に達しています`, 'warn')
      }

      const journal: Journal = {
        id: crypto.randomUUID(), date, description: merchant,
        amount: Number(amount), type: 'expense',
        category: category || '未分類', incomeType: null,
        memo: memo || purpose || null, imgUrl: preview, aiReview: aiResult,
      }
      if (user.email) {
        await (supabase.from('journals') as any).insert({
          id: journal.id, account_email: user.email, date: journal.date,
          description: journal.description, amount: journal.amount,
          type: journal.type, category: journal.category,
          memo: journal.memo, img_url: journal.imgUrl,
          ai_review: aiResult ? JSON.stringify(aiResult) : null,
        })
      }
      addJournal(journal)
      saveMerchant(merchant, category, taxRate)
      // XP付与・ストリーク更新
      XPStore.add(10 + (preview ? 5 : 0))  // 画像付きはボーナス5XP
      StreakStore.update()
      // 施策6: OCR結果とユーザーが保存した内容の差分を記録
      if (ocrOriginal) {
        recordCorrection(ocrOriginal, { merchant, category, taxRate })
        setOcrOriginal(null)
      }
      const shuriken = checkShurikens(journals.length + 1)
      if (shuriken) setTimeout(() => showToast(`🌟 ${shuriken.label} — 手裏剣×${shuriken.num}獲得！`, 'success'), 800)
      showToast('記録しました', 'success')
      resetForm()
    } catch {
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setMode('menu'); setPreview(null); setAiResult(null)
    setMerchant(''); setAmount(''); setPurpose(''); setMemo('')
    setCategory(''); setTaxRate('10%')
    setDate(new Date().toISOString().slice(0,10))
    setSuggestions([])
  }

  // 交通費検索
  async function searchTransit() {
    if (!tFrom || !tTo) { showToast('出発地と目的地を入力してください'); return }
    setTSearching(true)
    try {
      const res = await fetch(`/api/transit?from=${encodeURIComponent(tFrom)}&to=${encodeURIComponent(tTo)}`)
      const data = await res.json()
      if (data.fare) {
        setTFare(String(data.fare))
        showToast(`${tFrom}→${tTo}: ¥${data.fare.toLocaleString()}`, 'success')
      } else {
        // 履歴から検索
        const cached = TransitHistoryStore.getAll().find(h => h.from === tFrom && h.to === tTo)
        if (cached) { setTFare(String(cached.fare)); showToast('履歴から取得しました', 'success') }
        else showToast('運賃が見つかりません。手入力してください')
      }
    } catch {
      showToast('検索に失敗しました')
    } finally {
      setTSearching(false)
    }
  }

  async function saveTransit() {
    if (!tFrom || !tTo || !tFare) { showToast('区間と運賃を入力してください'); return }
    setSaving(true)
    try {
      const desc = `${tFrom}→${tTo}${tPurpose ? ' ' + tPurpose : ''}`
      const journal: Journal = {
        id: crypto.randomUUID(), date: tDate, description: desc,
        amount: Number(tFare), type: 'expense',
        category: '旅費交通費', incomeType: null, memo: tPurpose || null, imgUrl: null, aiReview: null,
      }
      if (user.email) {
        await (supabase.from('journals') as any).insert({
          id: journal.id, account_email: user.email, date: tDate,
          description: desc, amount: Number(tFare),
          type: 'expense', category: '旅費交通費', memo: tPurpose,
        })
      }
      addJournal(journal)
      TransitHistoryStore.add(tFrom, tTo, Number(tFare))
      showToast('交通費を記録しました', 'success')
      setTFrom(''); setTTo(''); setTFare(''); setTPurpose('')
      setMode('menu')
    } catch {
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 一括保存
  async function saveBulk() {
    const valid = bulkItems.filter(i => i.merchant && i.amount)
    if (valid.length === 0) { showToast('記録する項目がありません'); return }
    setSaving(true)
    try {
      for (const item of valid) {
        const j: Journal = {
          id: crypto.randomUUID(), date: item.date, description: item.merchant,
          amount: Number(item.amount), type: 'expense',
          category: item.category || '未分類', incomeType: null, memo: null, imgUrl: null, aiReview: null,
        }
        if (user.email) {
          await (supabase.from('journals') as any).insert({
            id: j.id, account_email: user.email, date: j.date,
            description: j.description, amount: j.amount,
            type: j.type, category: j.category,
          })
        }
        addJournal(j)
      }
      showToast(`${valid.length}件を一括記録しました`, 'success')
      setBulkItems([{ merchant:'', amount:'', date: new Date().toISOString().slice(0,10), category:'' }])
      setMode('menu')
    } catch {
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const transitSuggestions = [...SAMPLE_ROUTES, ...TransitHistoryStore.getAll()].slice(0, 5)

  return (
    <div className="min-h-dvh pb-20 bg-white">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* ── メニュー ── */}
        {mode === 'menu' && (
          <>
            <div className="card">
              <div className="font-serif text-lg font-bold mb-4">経費を記録</div>
              <div className="grid grid-cols-2 gap-3">
                {/* 撮影 */}
                <button onClick={() => { fileRef.current?.setAttribute('capture','environment'); fileRef.current?.setAttribute('accept','image/*'); fileRef.current?.click() }}
                  className="h-20 bg-[#1A1A1A] text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 active:opacity-75">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs font-medium">撮影して記録</span>
                </button>
                {/* 交通費 */}
                <button onClick={() => setMode('transit')}
                  className="h-20 bg-[#2F5D50] text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 active:opacity-75">
                  <span className="text-2xl">🚃</span>
                  <span className="text-xs font-medium">交通費を記録</span>
                </button>
                {/* 手入力 */}
                <button onClick={() => setMode('receipt')}
                  className="h-20 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-1.5 active:bg-[#F8F8F8]">
                  <span className="text-2xl">✏️</span>
                  <span className="text-xs text-[#6B6459]">手入力</span>
                </button>
                {/* 一括入力 */}
                <button onClick={() => setMode('bulk')}
                  className="h-20 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-1.5 active:bg-[#F8F8F8]">
                  <span className="text-2xl">📋</span>
                  <span className="text-xs text-[#6B6459]">まとめて入力</span>
                </button>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>

            {/* よく使う交通費 */}
            {transitSuggestions.length > 0 && (
              <div className="card">
                <div className="text-sm font-medium mb-3">よく使う交通費</div>
                {transitSuggestions.slice(0,4).map((r, i) => (
                  <button key={i} onClick={() => { setTFrom(r.from); setTTo(r.to); setTFare(String(r.fare)); setMode('transit') }}
                    className="w-full flex justify-between items-center py-2.5 border-b border-[#F5F5F5] last:border-0 text-left active:bg-[#F8F8F8]">
                    <span className="text-sm text-[#1A1A1A]">{r.from} → {r.to}</span>
                    <span className="text-sm font-medium text-[#2F5D50]">¥{r.fare.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── レシート入力フォーム ── */}
        {mode === 'receipt' && (
          <div className="card">
            {preview && (
              <div className="relative mb-4">
                <img src={preview} alt="レシート" className="w-full max-h-48 object-cover rounded-xl" />
                {/* OCRボタン */}
                <button onClick={runOCR} disabled={reviewing}
                  className="absolute top-2 right-2 bg-[#1A1A1A]/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {reviewing ? '読取中…' : '🔍 自動入力'}
                </button>
              </div>
            )}
            <div className="space-y-3">
              {/* 店舗名（サジェスト付き） */}
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">店舗名・取引先 *</label>
                <input className="form-input" type="text" value={merchant}
                  onChange={e => {
                    setMerchant(e.target.value)
                    setSuggestions(getMerchantSuggestions(e.target.value))
                    const mem = (() => { try { return JSON.parse(localStorage.getItem(MERCHANT_KEY) || '{}') } catch { return {} } })()
                    const saved = mem[e.target.value.trim()]
                    if (saved) { if (saved.category && !category) setCategory(saved.category); if (saved.taxRate) setTaxRate(saved.taxRate) }
                  }}
                  placeholder="例：コンビニ、東京食堂" />
                {suggestions.length > 0 && (
                  <div className="border border-[#E5E0D8] rounded-xl mt-1 overflow-hidden">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => { setMerchant(s); setSuggestions([]) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F5F5F5] border-b border-[#F0F0F0] last:border-0 bg-white">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">金額（円）*</label>
                <input className="form-input" type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6B6459] block mb-1">日付</label>
                  <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#6B6459] block mb-1">税率</label>
                  <select className="form-select" value={taxRate} onChange={e => setTaxRate(e.target.value)}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r === 'mixed' ? '混在' : r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">勘定科目</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">未分類</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">用途</label>
                <input className="form-input" type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="例：〇〇打ち合わせ" />
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">メモ</label>
                <div className="flex gap-2">
                  <input className="form-input flex-1" type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="任意" />
                  <button type="button" title="音声入力"
                    className="px-3 border border-[#E5E0D8] rounded-xl text-xl bg-[#F8F8F8] flex-shrink-0"
                    onClick={() => {
                      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                      if (!SR) { showToast('音声入力は対応ブラウザのみ使用可能です'); return }
                      const recog = new SR(); recog.lang = 'ja-JP'
                      recog.onresult = (e: any) => { setMemo(prev => (prev ? prev + ' ' : '') + e.results[0][0].transcript); showToast('音声入力完了', 'success') }
                      recog.onerror = () => showToast('音声入力に失敗しました')
                      recog.start(); showToast('🎤 話しかけてください…')
                    }}>🎤</button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasEvidence} onChange={e => setHasEvidence(e.target.checked)} />
                証憑あり（写真・レシート）
              </label>
            </div>

            {/* AIレビュー結果 */}
            {aiResult && (
              <div className={`mt-4 p-3 rounded-xl text-sm ${aiResult.risk==='danger'?'bg-[#FFF0F0] text-[#8B2020]':aiResult.risk==='warn'?'bg-[#FFF8EC] text-[#9A6B1E]':'bg-[#E8F4F0] text-[#1E5C3A]'}`}>
                <div className="font-medium mb-1">
                  {aiResult.risk==='danger'?'⚠ 要確認':aiResult.risk==='warn'?'△ 注意':'✓ 問題なし'}
                  <span className="ml-2 text-xs opacity-70">信頼度 {Math.round(aiResult.confidence*100)}%</span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">{aiResult.reason}</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm">
                {saving ? '保存中…' : '記録する'}
              </button>
              <button onClick={runAIReview} disabled={reviewing} className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">
                {reviewing ? '…' : 'AI確認'}
              </button>
              <button onClick={resetForm} className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">戻る</button>
            </div>
          </div>
        )}

        {/* ── 交通費フォーム ── */}
        {mode === 'transit' && (
          <div className="card space-y-3">
            <div className="font-medium text-sm mb-1">交通費を記録</div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">出発地</label>
              <input className="form-input" type="text" value={tFrom}
                onChange={e => { setTFrom(e.target.value); setTFromSug(TransitHistoryStore.getSuggestions(e.target.value).map(h => h.from)) }}
                placeholder="例：新宿" />
              {tFromSug.length > 0 && (
                <div className="border border-[#E5E0D8] rounded-xl mt-1 overflow-hidden">
                  {[...new Set(tFromSug)].slice(0,4).map(s => (
                    <button key={s} onClick={() => { setTFrom(s); setTFromSug([]) }}
                      className="w-full text-left px-4 py-2 text-sm bg-white border-b border-[#F0F0F0] last:border-0">{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">目的地</label>
              <input className="form-input" type="text" value={tTo}
                onChange={e => { setTTo(e.target.value); setTToSug(TransitHistoryStore.getSuggestions(e.target.value).map(h => h.to)) }}
                placeholder="例：渋谷" />
              {tToSug.length > 0 && (
                <div className="border border-[#E5E0D8] rounded-xl mt-1 overflow-hidden">
                  {[...new Set(tToSug)].slice(0,4).map(s => (
                    <button key={s} onClick={() => { setTTo(s); setTToSug([]) }}
                      className="w-full text-left px-4 py-2 text-sm bg-white border-b border-[#F0F0F0] last:border-0">{s}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={searchTransit} disabled={tSearching}
              className="w-full py-2.5 bg-[#2F5D50] text-white rounded-xl text-sm font-medium">
              {tSearching ? '検索中…' : '🚃 運賃を検索'}
            </button>
            <div>
              <label className="text-xs text-[#6B6459] block mb-1">運賃（円）</label>
              <input className="form-input" type="number" inputMode="numeric" value={tFare} onChange={e => setTFare(e.target.value)} placeholder="220" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">日付</label>
                <input className="form-input" type="date" value={tDate} onChange={e => setTDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#6B6459] block mb-1">用途</label>
                <input className="form-input" type="text" value={tPurpose} onChange={e => setTPurpose(e.target.value)} placeholder="〇〇訪問" />
              </div>
            </div>

            {/* よく使う区間 */}
            {transitSuggestions.length > 0 && (
              <div>
                <div className="text-xs text-[#9A9288] mb-1">よく使う区間</div>
                <div className="flex flex-wrap gap-2">
                  {transitSuggestions.slice(0,4).map((r,i) => (
                    <button key={i} onClick={() => { setTFrom(r.from); setTTo(r.to); setTFare(String(r.fare)) }}
                      className="text-xs px-3 py-1.5 border border-[#E5E0D8] rounded-full text-[#6B6459] bg-[#F8F8F8]">
                      {r.from}→{r.to} ¥{r.fare}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={saveTransit} disabled={saving} className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                {saving ? '保存中…' : '記録する'}
              </button>
              <button onClick={() => setMode('menu')} className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">戻る</button>
            </div>
          </div>
        )}

        {/* ── 一括入力モード ── */}
        {mode === 'bulk' && (
          <div className="card">
            <div className="font-medium text-sm mb-3">まとめて入力</div>
            {bulkItems.map((item, i) => (
              <div key={i} className="mb-3 p-3 bg-[#F8F8F8] rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-[#6B6459]">{i+1}件目</span>
                  {bulkItems.length > 1 && (
                    <button onClick={() => setBulkItems(prev => prev.filter((_,j) => j!==i))}
                      className="text-xs text-[#9A9288] bg-transparent border-none cursor-pointer">削除</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="form-input text-sm" type="text" placeholder="店舗名" value={item.merchant}
                    onChange={e => setBulkItems(prev => prev.map((p,j) => j===i ? {...p, merchant:e.target.value} : p))} />
                  <input className="form-input text-sm" type="number" inputMode="numeric" placeholder="金額" value={item.amount}
                    onChange={e => setBulkItems(prev => prev.map((p,j) => j===i ? {...p, amount:e.target.value} : p))} />
                  <input className="form-input text-sm" type="date" value={item.date}
                    onChange={e => setBulkItems(prev => prev.map((p,j) => j===i ? {...p, date:e.target.value} : p))} />
                  <select className="form-select text-sm" value={item.category}
                    onChange={e => setBulkItems(prev => prev.map((p,j) => j===i ? {...p, category:e.target.value} : p))}>
                    <option value="">科目</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button onClick={() => setBulkItems(prev => [...prev, { merchant:'', amount:'', date: new Date().toISOString().slice(0,10), category:'' }])}
              className="w-full py-2.5 border border-dashed border-[#E5E0D8] rounded-xl text-sm text-[#9A9288] mb-3">
              ＋ 項目を追加
            </button>
            <div className="flex gap-2">
              <button onClick={saveBulk} disabled={saving} className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium">
                {saving ? '保存中…' : `${bulkItems.filter(i=>i.merchant&&i.amount).length}件を一括保存`}
              </button>
              <button onClick={() => setMode('menu')} className="px-4 py-3 border border-[#E5E0D8] rounded-xl text-sm text-[#6B6459]">戻る</button>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
