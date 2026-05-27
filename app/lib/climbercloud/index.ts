/**
 * 忍者帳場 — ClimberCloud WebAPI連携
 * 電帳法対応・認定タイムスタンプ付与
 *
 * フロー:
 *   1. PDFをClimberCloudへ送信（AI OCRが動く）
 *   2. OCR結果（インデックス情報）を受け取る
 *   3. 確定情報をClimberCloudへ送信
 *   4. ClimberCloudがタイムスタンプを付与して保管
 *
 * APIキー取得: https://pandora-climber.jp/webapi/
 * 月額: 900円〜（従量課金）
 */

export interface ClimberCloudConfig {
  apiKey:    string   // ClimberCloud WebAPIキー
  baseUrl:   string   // デフォルト: https://api.climbercloud.jp/v1
  companyId: string   // ClimberCloudの会社ID
}

export interface ClimberDocument {
  /** ClimberCloudが返すドキュメントID */
  documentId:   string
  /** タイムスタンプ付与日時（ISO8601） */
  stampedAt?:   string
  /** OCR結果 */
  ocrResult?: {
    date?:      string
    amount?:    number
    merchant?:  string
    taxRate?:   string
  }
  /** ステータス */
  status: 'pending' | 'ocr_complete' | 'stamped' | 'error'
}

export interface ClimberStampResult {
  success:    boolean
  documentId: string
  stampedAt?: string
  error?:     string
}

/**
 * Step1: レシート画像/PDFをClimberCloudに送信
 * → AI OCRが動き、インデックス情報が返ってくる
 */
export async function uploadToClimberCloud(
  config: ClimberCloudConfig,
  params: {
    fileBase64: string      // base64エンコードされたファイル
    fileType:   'pdf' | 'jpeg' | 'png'
    fileName:   string
    documentType: 'receipt' | 'invoice' | 'journal' // 領収書・請求書・帳簿
  }
): Promise<{ documentId: string; ocrResult: ClimberDocument['ocrResult'] }> {

  const res = await fetch(`${config.baseUrl}/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Company-Id':  config.companyId,
    },
    body: JSON.stringify({
      file:          params.fileBase64,
      file_type:     params.fileType,
      file_name:     params.fileName,
      document_type: params.documentType,
      ocr:           true,  // AI OCRを有効化
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`ClimberCloud upload error ${res.status}: ${err.message ?? res.statusText}`)
  }

  const data = await res.json()
  return {
    documentId: data.document_id,
    ocrResult: {
      date:     data.ocr?.date,
      amount:   data.ocr?.amount,
      merchant: data.ocr?.merchant,
      taxRate:  data.ocr?.tax_rate,
    },
  }
}

/**
 * Step2: OCR結果を確認・確定してタイムスタンプを付与
 * 確定情報を送信するとClimberCloudがタイムスタンプを付与して保管
 */
export async function confirmAndStamp(
  config: ClimberCloudConfig,
  params: {
    documentId:   string
    date:         string    // YYYY-MM-DD
    amount:       number    // 税込金額
    merchant:     string    // 取引先名
    category:     string    // 勘定科目
    taxRate:      string    // '10%' | '8%' | '0%'
    memo?:        string
    userId?:      string    // 保存者ID（スキャナ保存の要件）
  }
): Promise<ClimberStampResult> {

  const res = await fetch(`${config.baseUrl}/documents/${params.documentId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Company-Id':  config.companyId,
    },
    body: JSON.stringify({
      date:          params.date,
      amount:        params.amount,
      counter_party: params.merchant,
      category:      params.category,
      tax_rate:      params.taxRate,
      memo:          params.memo ?? '',
      user_id:       params.userId ?? 'user',
      timestamp:     true,  // タイムスタンプ付与を明示
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return {
      success:    false,
      documentId: params.documentId,
      error:      `ClimberCloud confirm error ${res.status}: ${err.message ?? res.statusText}`,
    }
  }

  const data = await res.json()
  return {
    success:    true,
    documentId: params.documentId,
    stampedAt:  data.stamped_at,
  }
}

/**
 * タイムスタンプの検証（税務調査対応）
 * ClimberCloud上のドキュメントのタイムスタンプが有効かを確認
 */
export async function verifyTimestamp(
  config: ClimberCloudConfig,
  documentId: string
): Promise<{ valid: boolean; stampedAt?: string; verifiedAt?: string }> {

  const res = await fetch(`${config.baseUrl}/documents/${documentId}/verify`, {
    method:  'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Company-Id':  config.companyId,
    },
  })

  if (!res.ok) return { valid: false }

  const data = await res.json()
  return {
    valid:      data.timestamp_valid === true,
    stampedAt:  data.stamped_at,
    verifiedAt: new Date().toISOString(),
  }
}

/**
 * 一括検証（電帳法の必須要件）
 * 課税期間中のタイムスタンプを一括検証
 */
export async function batchVerify(
  config: ClimberCloudConfig,
  params: { fromDate: string; toDate: string }
): Promise<{
  total:   number
  valid:   number
  invalid: number
  results: { documentId: string; valid: boolean; stampedAt?: string }[]
}> {

  const res = await fetch(`${config.baseUrl}/documents/batch-verify`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Company-Id':  config.companyId,
    },
    body: JSON.stringify({
      from_date: params.fromDate,
      to_date:   params.toDate,
    }),
  })

  if (!res.ok) throw new Error(`ClimberCloud batch-verify error: ${res.status}`)

  const data = await res.json()
  return {
    total:   data.total,
    valid:   data.valid_count,
    invalid: data.invalid_count,
    results: (data.results ?? []).map((r: any) => ({
      documentId: r.document_id,
      valid:      r.valid,
      stampedAt:  r.stamped_at,
    })),
  }
}

/* ── ローカルのタイムスタンプ記録（Supabaseと併用） ── */
const CC_STORE_KEY = 'ninjaClimberTimestamps'

interface LocalCCRecord {
  receiptId:   string
  documentId:  string
  stampedAt:   string
  verifiedAt?: string
  provider:    'climbercloud'
}

export const ClimberLocalStore = {
  save(receiptId: string, result: ClimberStampResult): void {
    if (typeof localStorage === 'undefined' || !result.success) return
    const all = this.getAll()
    all[receiptId] = {
      receiptId,
      documentId: result.documentId,
      stampedAt:  result.stampedAt ?? new Date().toISOString(),
      provider:   'climbercloud',
    }
    localStorage.setItem(CC_STORE_KEY, JSON.stringify(all))
  },

  get(receiptId: string): LocalCCRecord | null {
    return this.getAll()[receiptId] ?? null
  },

  getAll(): Record<string, LocalCCRecord> {
    if (typeof localStorage === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(CC_STORE_KEY) ?? '{}')
    } catch { return {} }
  },

  coverageRate(receiptIds: string[]): number {
    if (receiptIds.length === 0) return 100
    const all     = this.getAll()
    const stamped = receiptIds.filter((id) => !!all[id]).length
    return Math.round(stamped / receiptIds.length * 100)
  },
}
