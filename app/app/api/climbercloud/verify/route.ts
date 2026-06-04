import { NextRequest, NextResponse } from 'next/server'
import { batchVerify } from '@/lib/climbercloud'

const CC_CONFIG = {
  apiKey:    process.env.CLIMBERCLOUD_API_KEY    ?? '',
  baseUrl:   process.env.CLIMBERCLOUD_BASE_URL   ?? 'https://api.climbercloud.jp/v1',
  companyId: process.env.CLIMBERCLOUD_COMPANY_ID ?? '',
}

export async function POST(req: NextRequest) {
  if (!CC_CONFIG.apiKey) {
    return NextResponse.json({ error: 'APIキー未設定' }, { status: 503 })
  }
  try {
    const { fromDate, toDate } = await req.json()
    const result = await batchVerify(CC_CONFIG, { fromDate, toDate })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
