/**
 * 忍者帳場 — 予算管理
 * 科目別月次予算の設定・超過アラート
 */

export interface BudgetSetting {
  category:  string
  amount:    number       // 月次予算（円）
  alertAt:   number       // アラート閾値（%）例: 80 = 80%で警告
}

export interface BudgetStatus {
  category:  string
  budget:    number
  used:      number
  rate:      number       // 使用率（%）
  remaining: number
  status:    'safe' | 'warn' | 'over'
}

const BUDGET_KEY = 'ninjaBudgetSettings'

export const BudgetStore = {
  getAll(): BudgetSetting[] {
    if (typeof localStorage === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '[]') } catch { return [] }
  },

  save(settings: BudgetSetting[]) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(settings))
  },

  add(setting: BudgetSetting) {
    const all = this.getAll().filter(s => s.category !== setting.category)
    all.push(setting)
    this.save(all)
  },

  remove(category: string) {
    this.save(this.getAll().filter(s => s.category !== category))
  },

  /** 今月の使用状況を計算 */
  calcStatus(journals: { date: string; type: string; category: string; amount: number }[]): BudgetStatus[] {
    const ym       = new Date().toISOString().slice(0, 7)
    const settings = this.getAll()
    if (settings.length === 0) return []

    // 今月の支出を科目別に集計
    const used: Record<string, number> = {}
    journals
      .filter(j => j.type === 'expense' && j.date?.startsWith(ym))
      .forEach(j => {
        const cat = j.category || '未分類'
        used[cat]  = (used[cat] || 0) + j.amount
      })

    return settings.map(s => {
      const u    = used[s.category] || 0
      const rate = s.amount > 0 ? Math.round(u / s.amount * 100) : 0
      const status: BudgetStatus['status'] =
        rate >= 100 ? 'over' : rate >= s.alertAt ? 'warn' : 'safe'
      return {
        category:  s.category,
        budget:    s.amount,
        used:      u,
        rate,
        remaining: Math.max(0, s.amount - u),
        status,
      }
    })
  },

  /** 超過・警告中の科目だけ返す */
  getAlerts(journals: Parameters<typeof BudgetStore.calcStatus>[0]): BudgetStatus[] {
    return this.calcStatus(journals).filter(s => s.status !== 'safe')
  }
}
