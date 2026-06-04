import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      risk: 'safe', category: '', taxRate: '10%', confidence: 0,
      reason: 'AIレビューを使用するにはOpenAI APIキーの設定が必要です。',
      alerts: [], needsHuman: false,
    })
  }
  try {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey })
    const body = await req.json()
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 500, temperature: 0.2,
      messages: [
        { role: 'system', content: 'あなたは日本の経費レビューAIです。JSONのみで返答。{ "risk":"safe"|"warn"|"danger", "category":"勘定科目", "taxRate":"10%"|"8%"|"0%"|"mixed", "confidence":0~1, "reason":"150文字以内", "alerts":[], "needsHuman":bool }' },
        { role: 'user', content: JSON.stringify(body) },
      ],
    })
    const result = JSON.parse(res.choices[0]?.message?.content?.replace(/```json|```/g,'').trim()||'{}')
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ risk:'warn', category:'', taxRate:'10%', confidence:0, reason:'AI確認不可。手動確認をお願いします。', alerts:['AI確認不可'], needsHuman:true })
  }
}
