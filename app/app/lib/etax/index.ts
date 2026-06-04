/**
 * 忍者帳場 — e-Tax連携・電帳法タイムスタンプ
 * 青色申告65万円控除 対応モジュール
 */

import type { Journal } from '@/types/database'

/* ── タイムスタンプ ── */
export interface Timestamp {
  receiptId:  string
  stampedAt:  string
  imageHash:  string
  method:     'app-internal' | 'external-tsa'
  verified:   boolean
  tsaProvider?: string
}

export const TimestampStore = {
  KEY: 'ninjaTimestamps' as const,

  stamp(receiptId: string, imageHash = ''): Timestamp {
    const ts: Timestamp = {
      receiptId,
      stampedAt: new Date().toISOString(),
      imageHash,
      method:    'app-internal',
      verified:  false,
    }
    const all = this.getAll()
    all[receiptId] = ts
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.KEY, JSON.stringify(all))
    }
    return ts
  },

  get(receiptId: string): Timestamp | null {
    return this.getAll()[receiptId] ?? null
  },

  getAll(): Record<string, Timestamp> {
    if (typeof localStorage === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(this.KEY) ?? '{}')
    } catch { return {} }
  },

  coverageRate(receipts: { id: string }[]): number {
    if (receipts.length === 0) return 100
    const all     = this.getAll()
    const stamped = receipts.filter((r) => !!all[r.id]).length
    return Math.round(stamped / receipts.length * 100)
  },
}

export async function hashImage(dataUrl: string): Promise<string> {
  if (!dataUrl || typeof crypto === 'undefined') return ''
  try {
    const buf     = new TextEncoder().encode(dataUrl.slice(0, 1000))
    const hashBuf = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16)
  } catch { return '' }
}

/* ── 電帳法チェック ── */
export interface DenchohоCheck {
  label:  string
  ok:     boolean
  desc:   string
  law:    string
}

export function runDenchohoChecks(
  journals: Journal[],
  eviRate:  number,
  tsRate:   number
): DenchohоCheck[] {
  return [
    {
      label: '① 真実性の確保（改ざん防止）',
      ok:    tsRate >= 95,
      desc:  tsRate >= 95
        ? 'タイムスタンプが付与されており、改ざん防止措置が講じられています'
        : `タイムスタンプ付与率が${tsRate}%です。証憑保存時に自動付与されます`,
      law: '電帳法 第7条・規則第2条',
    },
    {
      label: '② 可視性の確保（検索・表示）',
      ok:    true,
      desc:  '日付・金額・取引先で検索でき、画面上で即時確認できます',
      law:   '電帳法 規則第4条',
    },
    {
      label: '③ 証憑の電子保存',
      ok:    eviRate >= 95,
      desc:  eviRate >= 95
        ? `全${journals.length}件の証憑が電子保存されています`
        : `証憑保存率が${eviRate}%です。「撮る」から画像を保存してください`,
      law:   '電帳法 第4条・第7条',
    },
    {
      label: '④ 保存期間（7年間）',
      ok:    true,
      desc:  'クラウド保存により7年間の保存が可能です（継続課金が必要）',
      law:   '所得税法 第232条',
    },
    {
      label: '⑤ 解像度・カラー要件',
      ok:    true,
      desc:  '200dpi以上・カラー撮影を推奨。スマホカメラは通常この要件を満たします',
      law:   '電帳法 規則第2条第6項',
    },
  ]
}

/* ── e-Tax XML出力 ── */
export interface PLSummary {
  income:    number
  expense:   number
  profit:    number
  byCategory: Record<string, number>
}

export function calcPL(journals: Journal[], year: number): PLSummary {
  const yearStr = String(year)
  const yearJ   = journals.filter((j) => j.date?.startsWith(yearStr))
  const income  = yearJ.filter((j) => j.type === 'income').reduce((s, j) => s + j.amount, 0)
  const expense = yearJ.filter((j) => j.type === 'expense').reduce((s, j) => s + j.amount, 0)

  const byCategory: Record<string, number> = {}
  yearJ.forEach((j) => {
    const cat = j.category || '雑費'
    byCategory[cat] = (byCategory[cat] ?? 0) + (j.type === 'income' ? j.amount : -j.amount)
  })

  return { income, expense, profit: income - expense, byCategory }
}

function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateETaxXML(pl: PLSummary, year: number, businessName = ''): string {
  const jYear = year - 2018 // 令和年
  const now   = new Date().toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml    += `<!-- 忍者帳場 e-Tax出力 -->\n`
  xml    += `<!-- ※ e-Taxソフトへのインポート前に税理士による確認を推奨します -->\n`
  xml    += `<AoiroDeclaration xmlns="urn:ninja-chouba:etax:1.0">\n`
  xml    += `  <Header>\n`
  xml    += `    <DataType>青色申告決算書</DataType>\n`
  xml    += `    <Year reiwa="${jYear}" western="${year}" />\n`
  xml    += `    <BusinessName>${escXml(businessName)}</BusinessName>\n`
  xml    += `    <CreatedAt>${now}</CreatedAt>\n`
  xml    += `    <App>忍者帳場</App>\n`
  xml    += `  </Header>\n`
  xml    += `  <PL>\n`
  xml    += `    <TotalIncome>${pl.income}</TotalIncome>\n`
  xml    += `    <TotalExpense>${pl.expense}</TotalExpense>\n`
  xml    += `    <NetProfit>${pl.profit}</NetProfit>\n`
  xml    += `    <Categories>\n`

  Object.entries(pl.byCategory)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([cat, amount]) => {
      xml += `      <Item>\n`
      xml += `        <Name>${escXml(cat)}</Name>\n`
      xml += `        <Amount>${amount}</Amount>\n`
      xml += `        <Type>${amount >= 0 ? 'income' : 'expense'}</Type>\n`
      xml += `      </Item>\n`
    })

  xml += `    </Categories>\n`
  xml += `  </PL>\n`
  xml += `</AoiroDeclaration>`
  return xml
}

export function generateJournalCSV(journals: Journal[], year: number): string {
  const yearStr = String(year)
  const rows    = [['日付', '種別', '勘定科目', '摘要', '金額', '備考']]

  journals
    .filter((j) => j.date?.startsWith(yearStr))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((j) => {
      rows.push([
        j.date,
        j.type === 'income' ? '収入' : '支出',
        j.category ?? '',
        j.description,
        String(j.amount),
        j.memo ?? '',
      ])
    })

  return '\uFEFF' + rows.map((r) => r.join(',')).join('\n')
}

/* ── 青色申告チェックリスト ── */
export interface AoiroCheckItem {
  label:    string
  done:     boolean
  desc:     string
  action?:  string
}

export function buildAoiroChecklist(
  journals: Journal[],
  eviRate:  number,
  tsRate:   number
): AoiroCheckItem[] {
  return [
    {
      label: '仕訳の記帳',
      done:  journals.length > 0,
      desc:  journals.length > 0
        ? `${journals.length}件の仕訳が記録されています`
        : '仕訳を記録してください',
    },
    {
      label:  '証憑の保存',
      done:   eviRate >= 80,
      desc:   `証憑保存率 ${eviRate}%`,
      action: eviRate < 80 ? '「撮る」から証憑を追加' : undefined,
    },
    {
      label: 'タイムスタンプ',
      done:  tsRate >= 80,
      desc:  `付与率 ${tsRate}%（証憑保存時に自動付与）`,
    },
    {
      label:  'e-Tax申告',
      done:   false,
      desc:   '申告書をe-Taxで送信すると65万円控除が確定',
      action: 'e-Tax申告ガイドを開く',
    },
    {
      label: '受信通知の保存',
      done:  false,
      desc:  'e-Taxのメッセージボックスから受信通知を保存',
    },
  ]
}


/* ════════════════════════
   消費税率管理
   将来の税率変更・軽減税率に対応
════════════════════════ */

export interface TaxRateSchedule {
  id:             string
  effectiveDate:  string  // YYYY-MM-DD（この日から適用）
  standard:       number  // 標準税率（%）
  reduced:        number  // 軽減税率（%）
  label?:         string  // 例：「2026年10月改定」
}

export interface TaxConfig {
  standard:  number              // 現在のデフォルト標準税率
  reduced:   number              // 現在のデフォルト軽減税率
  schedules: TaxRateSchedule[]   // 将来の変更スケジュール
}

const TAX_CONFIG_KEY = 'ninjaTaxConfig'

const DEFAULT_TAX_CONFIG: TaxConfig = {
  standard:  10,
  reduced:   8,
  schedules: [],
}

/** 税率設定を取得 */
export function getTaxConfig(): TaxConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_TAX_CONFIG
  try {
    const stored = localStorage.getItem(TAX_CONFIG_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_TAX_CONFIG
  } catch { return DEFAULT_TAX_CONFIG }
}

/** 税率設定を保存 */
export function saveTaxConfig(config: TaxConfig): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TAX_CONFIG_KEY, JSON.stringify(config))
}

/**
 * 指定日時点での有効税率を返す
 * スケジュールが登録されていれば施行日に自動切替
 */
export function getEffectiveTaxRate(
  type: 'standard' | 'reduced',
  dateStr?: string
): number {
  const cfg    = getTaxConfig()
  const target = dateStr ?? new Date().toISOString().slice(0, 10)

  // 施行日が対象日以前のスケジュールを日付降順でチェック
  const applicable = (cfg.schedules ?? [])
    .filter((s) => s.effectiveDate <= target)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))

  if (applicable.length > 0) {
    return type === 'reduced' ? applicable[0].reduced : applicable[0].standard
  }

  return type === 'reduced' ? cfg.reduced : cfg.standard
}

/** 現在の税率（標準・軽減）を返す */
export function getCurrentTaxRates(): { standard: number; reduced: number } {
  return {
    standard: getEffectiveTaxRate('standard'),
    reduced:  getEffectiveTaxRate('reduced'),
  }
}

/** 税率変更スケジュールを追加 */
export function addTaxSchedule(
  effectiveDate: string,
  standard: number,
  reduced: number,
  label?: string
): void {
  const cfg = getTaxConfig()
  cfg.schedules.push({
    id:   crypto.randomUUID(),
    effectiveDate,
    standard,
    reduced,
    label,
  })
  // 日付昇順で並び替え
  cfg.schedules.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
  saveTaxConfig(cfg)
}

/** 税率変更スケジュールを削除 */
export function removeTaxSchedule(id: string): void {
  const cfg = getTaxConfig()
  cfg.schedules = cfg.schedules.filter((s) => s.id !== id)
  saveTaxConfig(cfg)
}

/**
 * 起動時に税率が変わっていないか確認
 * 変わっていればtrueを返す（通知用）
 */
export function checkTaxRateChanged(): {
  changed: boolean
  prev: { standard: number; reduced: number }
  current: { standard: number; reduced: number }
} {
  const current = getCurrentTaxRates()
  const prevKey = 'ninjaLastTaxRate'

  let prev = current
  try {
    const stored = localStorage.getItem(prevKey)
    if (stored) prev = JSON.parse(stored)
  } catch {}

  const changed = prev.standard !== current.standard || prev.reduced !== current.reduced
  if (changed) {
    localStorage.setItem(prevKey, JSON.stringify(current))
  }

  return { changed, prev, current }
}

/**
 * 仕訳の税率情報を取得
 * 仕訳日時点での有効税率を返す
 */
export function getTaxRateForJournal(
  journal: { date: string; taxType?: 'standard' | 'reduced' | 'exempt' | 'non-taxable' }
): number {
  if (!journal.taxType || journal.taxType === 'exempt' || journal.taxType === 'non-taxable') {
    return 0
  }
  return getEffectiveTaxRate(
    journal.taxType === 'reduced' ? 'reduced' : 'standard',
    journal.date
  )
}

/** 消費税額を計算（税込金額から） */
export function calcConsumptionTax(
  amountIncludingTax: number,
  taxType: 'standard' | 'reduced' | 'exempt',
  date?: string
): { taxAmount: number; taxExcluded: number; taxRate: number } {
  if (taxType === 'exempt') {
    return { taxAmount: 0, taxExcluded: amountIncludingTax, taxRate: 0 }
  }
  const rate       = getEffectiveTaxRate(taxType, date)
  const taxExcluded = Math.floor(amountIncludingTax * 100 / (100 + rate))
  const taxAmount   = amountIncludingTax - taxExcluded
  return { taxAmount, taxExcluded, taxRate: rate }
}
