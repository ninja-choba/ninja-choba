/**
 * /api/transit — 交通費経路計算API
 * Yahoo Transit API連携（APIキー設定後に有効）
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || ''
  const to   = searchParams.get('to')   || ''

  if (!from || !to) {
    return NextResponse.json({ error: '出発地・目的地を指定してください' }, { status: 400 })
  }

  // Yahoo Transit API（YAHOO_TRANSIT_API_KEY設定後に有効）
  const apiKey = process.env.YAHOO_TRANSIT_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(
        `https://map.yahooapis.jp/transit/V1/search?appid=${apiKey}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&output=json`,
      )
      if (res.ok) {
        const data = await res.json()
        const route = data?.Feature?.[0]
        if (route) {
          return NextResponse.json({
            from,
            to,
            fare:    route.Property?.Price || 0,
            line:    route.Property?.RouteName || '',
            minutes: route.Property?.MoveTime || 0,
          })
        }
      }
    } catch {}
  }

  // フォールバック：APIキー未設定の場合
  return NextResponse.json({
    from, to, fare: null,
    message: 'Yahoo Transit APIキーを設定すると自動計算が可能になります',
  })
}
