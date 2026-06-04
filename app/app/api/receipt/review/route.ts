import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/* ── 日本レシート特化システムプロンプト ── */
const SYSTEM_PROMPT = `
あなたは日本の税務・経費管理の専門AIです。
日本のレシート・領収書を読み取り、以下のJSON形式のみで返答してください。

{
  "merchant":    "店舗名・取引先名",
  "date":        "YYYY-MM-DD形式の日付",
  "amount":      税込合計金額（数値のみ）,
  "taxRate":     "10%" | "8%" | "0%" | "mixed",
  "category":    "勘定科目（交際費/会議費/消耗品費/旅費交通費/通信費/広告宣伝費/福利厚生費/地代家賃/水道光熱費/外注費/雑費 のいずれか）",
  "invoiceNo":   "インボイス登録番号（T+13桁）または null",
  "items":       [{"name":"商品名","price":金額,"taxRate":"10%"|"8%"}],
  "risk":        "safe" | "warn" | "danger",
  "confidence":  0.0〜1.0,
  "reason":      "150文字以内の理由（〜と思われます/〜の可能性があります等の表現を使う）",
  "alerts":      ["問題点のリスト"],
  "needsHuman":  true | false
}

【日本のレシート読み取り時の重要ポイント】
- ※マークや★マークは軽減税率8%の商品を示す
- T+13桁の数字はインボイス（適格請求書）登録番号
- 「内税」「税込」「外税」の表記に注意
- コンビニ・スーパーは食品8%・その他10%の混在が多い
- 日付形式: 令和→西暦変換（令和7年=2025年、令和8年=2026年）
- 手書き領収書は「但書」欄の内容を用途として参照
- 金額は必ず税込合計を返す
- 経費として問題がある場合のみrisk: "warn"/"danger"を使う
`.trim()

/* ── 多数決ロジック ── */
function majorityValue<T>(values: T[]): T {
  const counts = new Map<string, number>()
  values.forEach(v => {
    const key = JSON.stringify(v)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  let best = values[0], bestCount = 0
  counts.forEach((count, key) => {
    if (count > bestCount) { bestCount = count; best = JSON.parse(key) }
  })
  return best
}

function parseResult(raw: string): any {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, imageUrl, merchant, amount, date, taxRate, category, purpose, mode } = body

    // ── 画像があればVision APIで読み取る ──
    const hasImage = !!(imageBase64 || imageUrl)
    const model    = hasImage ? 'gpt-4o' : 'gpt-4o-mini'  // 画像あり→gpt-4o

    // メッセージ構築
    function buildMessages(attempt: number) {
      const userContent: any[] = []

      // 画像を追加（Vision API）
      if (imageBase64) {
        userContent.push({
          type:      'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
        })
      } else if (imageUrl) {
        userContent.push({
          type:      'image_url',
          image_url: { url: imageUrl, detail: 'high' },
        })
      }

      // テキスト情報を追加
      const textInfo = {
        mode:     mode || 'review',
        attempt,
        existing: { merchant, amount, date, taxRate, category, purpose },
        instruction: hasImage
          ? 'レシート画像を正確に読み取り、全フィールドを抽出してください。特に金額・日付・店舗名・インボイス番号に注意。'
          : '入力情報を元に経費の適切性を判断してください。',
      }
      userContent.push({ type: 'text', text: JSON.stringify(textInfo) })

      return [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user'   as const, content: hasImage ? userContent : JSON.stringify(textInfo) },
      ]
    }

    // ── 施策5: 複数回読み取り→多数決 ──
    const attempts = hasImage ? 3 : 1  // 画像あり→3回、テキストのみ→1回
    const results: any[] = []

    for (let i = 0; i < attempts; i++) {
      try {
        const res = await openai.chat.completions.create({
          model,
          max_tokens:  800,
          temperature: hasImage ? 0.1 : 0.2,  // 画像読み取りは低温度で安定
          messages:    buildMessages(i + 1),
        })
        const parsed = parseResult(res.choices[0]?.message?.content || '')
        if (parsed) results.push(parsed)
      } catch {}
    }

    if (results.length === 0) throw new Error('全試行失敗')

    // 多数決で各フィールドを決定
    const finalResult = results.length === 1 ? results[0] : {
      merchant:   majorityValue(results.map(r => r.merchant)),
      date:       majorityValue(results.map(r => r.date)),
      amount:     majorityValue(results.map(r => r.amount)),
      taxRate:    majorityValue(results.map(r => r.taxRate)),
      category:   majorityValue(results.map(r => r.category)),
      invoiceNo:  majorityValue(results.map(r => r.invoiceNo)),
      items:      results[0].items || [],
      risk:       majorityValue(results.map(r => r.risk)),
      // confidenceは平均値
      confidence: Math.round(results.reduce((s, r) => s + (r.confidence || 0), 0) / results.length * 100) / 100,
      reason:     results[0].reason,
      alerts:     results[0].alerts || [],
      needsHuman: results.some(r => r.needsHuman),
      // 一致度をconfidenceに反映
      agreement:  Math.round(results.filter(r =>
        r.amount === results[0].amount && r.merchant === results[0].merchant
      ).length / results.length * 100),
    }

    // 一致度が低い場合は信頼度を下げてhuman確認を推奨
    if (finalResult.agreement !== undefined && finalResult.agreement < 67) {
      finalResult.confidence = Math.min(finalResult.confidence, 0.6)
      finalResult.needsHuman = true
      finalResult.alerts = [...(finalResult.alerts || []), '読み取り結果が不安定です。内容をご確認ください。']
    }

    return NextResponse.json(finalResult)

  } catch (err: any) {
    console.error('[OCR] Error:', err.message)
    return NextResponse.json({
      risk: 'warn', category: '', taxRate: '10%', confidence: 0,
      reason: 'AI確認不可。手動確認をお願いします。',
      alerts: ['AI確認不可'], needsHuman: true,
    })
  }
}
