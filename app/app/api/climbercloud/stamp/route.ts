import { NextRequest, NextResponse } from 'next/server'
import { uploadToClimberCloud, confirmAndStamp } from '@/lib/climbercloud'

const CC_CONFIG = {
  apiKey:    process.env.CLIMBERCLOUD_API_KEY    ?? '',
  baseUrl:   process.env.CLIMBERCLOUD_BASE_URL   ?? 'https://api.climbercloud.jp/v1',
  companyId: process.env.CLIMBERCLOUD_COMPANY_ID ?? '',
}

export async function POST(req: NextRequest) {
  if (!CC_CONFIG.apiKey) {
    return NextResponse.json({ error: 'ClimberCloud APIキーが未設定です' }, { status: 503 })
  }
  try {
    const { fileBase64, fileType, fileName, date, amount, merchant, category, taxRate, memo, userId } = await req.json()
    const { documentId, ocrResult } = await uploadToClimberCloud(CC_CONFIG, {
      fileBase64, fileType: fileType ?? 'jpeg',
      fileName: fileName ?? 'receipt.jpg', documentType: 'receipt',
    })
    const stampResult = await confirmAndStamp(CC_CONFIG, {
      documentId, date: date ?? new Date().toISOString().slice(0,10),
      amount: amount ?? 0, merchant: merchant ?? '', category: category ?? '雑費',
      taxRate: taxRate ?? '10%', memo, userId,
    })
    return NextResponse.json({ ...stampResult, ocrResult })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
