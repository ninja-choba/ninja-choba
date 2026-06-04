/**
 * 忍者帳場 — ゲーミフィケーション + 番頭AIキャラクター
 * レベルアップ・称号・手裏剣・毎日のメッセージ
 */

/* ── レベルシステム ── */
export interface Level {
  level:   number
  title:   string    // 称号
  icon:    string
  minXP:   number
  color:   string
}

export const LEVELS: Level[] = [
  { level:  1, title: '新米帳付け',     icon: '🌱', minXP:     0, color: '#9A9288' },
  { level:  2, title: '見習い商人',     icon: '📖', minXP:    50, color: '#6B6459' },
  { level:  3, title: '一人前の帳場',   icon: '🏮', minXP:   150, color: '#2F5D50' },
  { level:  4, title: '信頼の番頭',     icon: '⚖️', minXP:   300, color: '#1E5C3A' },
  { level:  5, title: '熟練の経理人',   icon: '🗝️', minXP:   500, color: '#9A6B1E' },
  { level:  6, title: '江戸の豪商',     icon: '🏯', minXP:   800, color: '#8B2020' },
  { level:  7, title: '節税の達人',     icon: '🎯', minXP:  1200, color: '#1A1A1A' },
  { level:  8, title: '帳場の忍び',     icon: '🥷', minXP:  1800, color: '#1A1A1A' },
  { level:  9, title: '天下の大商人',   icon: '👑', minXP:  2500, color: '#9A6B1E' },
  { level: 10, title: '忍者帳場の主',   icon: '⛩️', minXP:  4000, color: '#2F5D50' },
]

/* ── XP獲得ルール ── */
export const XP_RULES = {
  record_receipt:      10,   // レシート記録
  record_with_image:    5,   // 画像付き記録（ボーナス）
  ai_review:            3,   // AIレビュー実行
  monthly_close:       50,   // 月次締め
  full_evidence:       30,   // 今月証憑100%
  no_danger:           20,   // 今月危険フラグなし
  streak_7days:        25,   // 7日連続記録
  streak_30days:      100,   // 30日連続記録
}

/* ── 手裏剣バッジ定義 ── */
export interface ShurikenBadge {
  id:       string
  label:    string
  desc:     string
  icon:     string
  shuriken: number
  rare:     boolean
  check:    (stats: UserStats) => boolean
}

export interface UserStats {
  totalRecords:    number
  monthRecords:    number
  evidenceRate:    number   // %
  dangerCount:     number
  streakDays:      number
  totalAmount:     number
  categoryCount:   number
  totalXP:         number
}

export const BADGES: ShurikenBadge[] = [
  { id: 'first',       label: '初記録',       desc: 'はじめてレシートを記録した',   icon: '🌱', shuriken: 1,  rare: false, check: s => s.totalRecords >= 1   },
  { id: 'ten',         label: '十枚の記録',   desc: '10件記録した',                 icon: '📝', shuriken: 2,  rare: false, check: s => s.totalRecords >= 10  },
  { id: 'fifty',       label: '五十枚',       desc: '50件記録した',                 icon: '📚', shuriken: 5,  rare: false, check: s => s.totalRecords >= 50  },
  { id: 'hundred',     label: '百戦錬磨',     desc: '100件記録した',                icon: '💯', shuriken: 10, rare: false, check: s => s.totalRecords >= 100 },
  { id: 'fullevi',     label: '証憑皆揃い',   desc: '今月の証憑保存率100%',         icon: '📸', shuriken: 3,  rare: false, check: s => s.evidenceRate >= 100 },
  { id: 'nodanger',    label: '無事是名馬',   desc: '今月危険フラグなし',           icon: '✅', shuriken: 3,  rare: false, check: s => s.monthRecords > 0 && s.dangerCount === 0 },
  { id: 'variety',     label: '多芸は無芸',   desc: '5種以上の科目を使用',          icon: '🎭', shuriken: 2,  rare: false, check: s => s.categoryCount >= 5  },
  { id: 'streak7',     label: '七日の誓い',   desc: '7日連続で記録した',            icon: '🔥', shuriken: 5,  rare: false, check: s => s.streakDays >= 7    },
  { id: 'streak30',    label: '一月皆勤',     desc: '30日連続で記録した',           icon: '⚡', shuriken: 20, rare: true,  check: s => s.streakDays >= 30   },
  { id: 'bigspender',  label: '豪快な出費',   desc: '月間支出が100万円を超えた',    icon: '💸', shuriken: 5,  rare: false, check: s => s.totalAmount >= 1000000 },
  { id: 'ninja',       label: '帳場の忍び',   desc: 'XPが1000を超えた',            icon: '🥷', shuriken: 15, rare: true,  check: s => s.totalXP >= 1000    },
  { id: 'master',      label: '節税マスター', desc: 'XPが3000を超えた',            icon: '👑', shuriken: 30, rare: true,  check: s => s.totalXP >= 3000    },
]

const XP_KEY      = 'ninjaXP'
const BADGES_KEY  = 'ninjaBadgesEarned'
const STREAK_KEY  = 'ninjaStreak'

/* ── XP管理 ── */
export const XPStore = {
  get(): number {
    if (typeof localStorage === 'undefined') return 0
    return Number(localStorage.getItem(XP_KEY) || '0')
  },
  add(xp: number): number {
    const current = this.get()
    const next    = current + xp
    localStorage.setItem(XP_KEY, String(next))
    return next
  },
  getLevel(): Level {
    const xp = this.get()
    return [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0]
  },
  getNextLevel(): Level | null {
    const current = this.getLevel()
    return LEVELS.find(l => l.level === current.level + 1) || null
  },
  getProgress(): number {
    const xp      = this.get()
    const current = this.getLevel()
    const next    = this.getNextLevel()
    if (!next) return 100
    const range   = next.minXP - current.minXP
    const gained  = xp - current.minXP
    return Math.min(100, Math.round(gained / range * 100))
  },
}

/* ── バッジ管理 ── */
export const BadgeStore = {
  getEarned(): string[] {
    if (typeof localStorage === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(BADGES_KEY) || '[]') } catch { return [] }
  },
  check(stats: UserStats): ShurikenBadge[] {
    const earned  = this.getEarned()
    const newOnes: ShurikenBadge[] = []
    BADGES.forEach(b => {
      if (!earned.includes(b.id) && b.check(stats)) {
        earned.push(b.id)
        newOnes.push(b)
      }
    })
    if (newOnes.length > 0) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(earned))
      // バッジXPを加算
      newOnes.forEach(b => XPStore.add(b.shuriken * 5))
    }
    return newOnes
  },
  getAll(): ShurikenBadge[] {
    const earned = this.getEarned()
    return BADGES.map(b => ({ ...b, earned: earned.includes(b.id) }))
  },
  getTotalShuriken(): number {
    const earned = this.getEarned()
    return BADGES.filter(b => earned.includes(b.id)).reduce((s, b) => s + b.shuriken, 0)
  },
}

/* ── 連続記録ストリーク ── */
export const StreakStore = {
  get(): { days: number; lastDate: string } {
    if (typeof localStorage === 'undefined') return { days: 0, lastDate: '' }
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"days":0,"lastDate":""}') }
    catch { return { days: 0, lastDate: '' } }
  },
  update(): number {
    const today  = new Date().toISOString().slice(0, 10)
    const { days, lastDate } = this.get()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    let newDays = 1
    if (lastDate === today)      newDays = days          // 今日は既にカウント済み
    else if (lastDate === yesterday) newDays = days + 1  // 連続中
    else                         newDays = 1             // 途切れ

    localStorage.setItem(STREAK_KEY, JSON.stringify({ days: newDays, lastDate: today }))
    return newDays
  },
}

/* ── 番頭AIキャラクターメッセージ ── */
export interface BantoMessage {
  text:    string
  type:    'morning' | 'advice' | 'praise' | 'warning' | 'tip'
  icon:    string
}

export function getBantoMessage(stats: {
  hour:          number
  totalRecords:  number
  monthRecords:  number
  dangerCount:   number
  evidenceRate:  number
  streakDays:    number
  netIncome:     number
  level:         Level
}): BantoMessage {
  const { hour, totalRecords, monthRecords, dangerCount, evidenceRate, streakDays, netIncome, level } = stats

  // 朝の挨拶
  if (hour >= 5 && hour < 10) {
    const greetings = [
      `おはようございます、旦那様。今日も帳場の算盤を弾きましょうぞ。`,
      `夜明けとともに一日が始まりまする。昨日の記録はお済みですかな？`,
      `今朝も元気に商いを始めましょう。天気は帳簿と同じく晴れ模様で。`,
    ]
    return { text: greetings[Math.floor(Math.random() * greetings.length)], type: 'morning', icon: '🌅' }
  }

  // 夜の締め
  if (hour >= 21 || hour < 2) {
    const nights = [
      `今日のお疲れ様でございます。本日の支出はお記録済みですかな？`,
      `一日の締めくくりに、レシートをご確認くださいませ。`,
    ]
    return { text: nights[Math.floor(Math.random() * nights.length)], type: 'morning', icon: '🌙' }
  }

  // 警告系
  if (dangerCount > 0) {
    return { text: `${dangerCount}件ほど確認が必要な記録がございます。お早めにご確認を。`, type: 'warning', icon: '⚠️' }
  }
  if (evidenceRate < 80 && monthRecords > 0) {
    return { text: `証憑の保存率が${evidenceRate}%でございます。電帳法の要件には95%以上が安心でございます。`, type: 'warning', icon: '📋' }
  }

  // 称賛系
  if (streakDays >= 7) {
    return { text: `${streakDays}日連続のご記録、あっぱれでございます！その心がけが節税の近道でございます。`, type: 'praise', icon: '🔥' }
  }
  if (monthRecords >= 20) {
    return { text: `今月${monthRecords}件のご記録。旦那様の勤勉さには頭が下がりまする。`, type: 'praise', icon: '👏' }
  }
  if (evidenceRate === 100 && monthRecords > 0) {
    return { text: `証憑皆揃い！電帳法も税理士への引き継ぎも、これで万全でございます。`, type: 'praise', icon: '✨' }
  }

  // レベルに応じたアドバイス
  if (level.level <= 2) {
    const tips = [
      `まずは毎日1件の記録から始めましょう。継続こそが節税の第一歩にございます。`,
      `レシートは撮影ボタンでサッと記録できます。財布に溜め込まずに即記録が肝心でございます。`,
      `交通費はよく忘れがちでございます。「交通費を記録」ボタンをお試しくださいませ。`,
    ]
    return { text: tips[Math.floor(Math.random() * tips.length)], type: 'tip', icon: '💡' }
  }

  // 収支アドバイス
  if (netIncome < 0) {
    return { text: `今月は支出が収入を上回っております。資金繰りページでご確認くださいませ。`, type: 'advice', icon: '📊' }
  }

  // 一般的なアドバイス
  const advices = [
    `青色申告の65万円控除には、e-Taxでの申告が必要でございます。申告ページをご確認を。`,
    `医療費が10万円を超えたら医療費控除が使えます。医療費ページで管理しておくと楽でございます。`,
    `ふるさと納税も控除対象でございます。控除対象費用ページをお忘れなく。`,
    `iDeCoの掛金は全額控除になりまする。個人事業主には特にお得な制度でございます。`,
    `消費税の申告が必要な場合は、税率ごとの記録が大切でございます。`,
    `今月の資金繰りはご確認済みですか？先を見据えた帳場が繁盛の秘訣でございます。`,
  ]
  return { text: advices[Math.floor(Math.random() * advices.length)], type: 'advice', icon: '🏮' }
}
