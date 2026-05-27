import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await openai.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 500, temperature: 0.2,
      messages: [
        { role: 'system', content: 'あなたは日本の小規模事業者向け経費レビューAIです。JSONのみで返答。{ "risk":"safe"|"warn"|"danger", "category":"勘定科目", "taxRate":"10%"|"8%"|"0%"|"mixed", "confidence":0~1, "reason":"150文字以内(断定せず)", "alerts":[], "needsHuman":bool }' },
        { role: 'user',   content: JSON.stringify(body) },
      ],
    })
    const result = JSON.parse(res.choices[0]?.message?.content?.replace(/```json|```/g,'').trim() || '{}')
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ risk:'warn', category:'', taxRate:'10%', confidence:0, reason:'AI確認不可。手動確認をお願いします。', alerts:['AI確認不可'], needsHuman:true })
  }
}
