/**
 * 忍者帳場 — 交通費経路計算
 * Yahoo路線情報APIまたはフォールバック計算
 */

export interface TransitRoute {
  from:     string
  to:       string
  fare:     number
  line:     string
  minutes:  number
}

export interface TransitHistory {
  from:    string
  to:      string
  fare:    number
  usedAt:  string
}

const HISTORY_KEY = 'ninjaTransitHistory'

/* ── 履歴管理 ── */
export const TransitHistoryStore = {
  getAll(): TransitHistory[] {
    if (typeof localStorage === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
  },

  add(from: string, to: string, fare: number) {
    const all = this.getAll()
    // 重複除去（同じ区間は更新）
    const filtered = all.filter(h => !(h.from === from && h.to === to))
    filtered.unshift({ from, to, fare, usedAt: new Date().toISOString() })
    if (filtered.length > 50) filtered.splice(50)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  },

  getSuggestions(partial: string): TransitHistory[] {
    if (!partial) return this.getAll().slice(0, 5)
    return this.getAll()
      .filter(h => h.from.includes(partial) || h.to.includes(partial))
      .slice(0, 5)
  },

  // よく使う区間
  getFrequent(): TransitHistory[] {
    return this.getAll().slice(0, 5)
  }
}

/**
 * Yahoo路線情報APIで運賃を取得
 * APIキーが不要なスクレイピングは利用規約違反のため
 * 簡易計算（距離ベース）をフォールバックとして実装
 * 実際はYahoo路線情報 Transit API（有料）またはNavitime APIと連携
 */
export async function calcTransitFare(
  from: string,
  to: string,
  apiKey?: string
): Promise<TransitRoute | null> {

  // APIキーがある場合はYahoo Transit APIを呼ぶ
  if (apiKey) {
    try {
      const res = await fetch(
        `/api/transit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { method: 'GET' }
      )
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {}
  }

  // フォールバック：履歴から検索
  const history = TransitHistoryStore.getAll()
  const cached  = history.find(h => h.from === from && h.to === to)
  if (cached) {
    return { from, to, fare: cached.fare, line: '（履歴）', minutes: 0 }
  }

  return null
}

/* ── 主要路線の概算運賃テーブル（東京圏） ── */
// 実際の運賃は路線検索APIで取得するのが正確
export const SAMPLE_ROUTES: TransitHistory[] = [
  { from: '新宿', to: '渋谷',    fare: 220, usedAt: '' },
  { from: '東京', to: '品川',    fare: 210, usedAt: '' },
  { from: '新宿', to: '池袋',    fare: 220, usedAt: '' },
  { from: '渋谷', to: '横浜',    fare: 560, usedAt: '' },
  { from: '東京', to: '新宿',    fare: 220, usedAt: '' },
  { from: '新橋', to: '有楽町',  fare: 170, usedAt: '' },
  { from: '品川', to: '横浜',    fare: 290, usedAt: '' },
  { from: '新宿', to: '吉祥寺',  fare: 220, usedAt: '' },
]
