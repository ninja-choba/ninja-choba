'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  XPStore, BadgeStore, StreakStore, getBantoMessage,
  type Level, type BantoMessage,
} from '@/lib/gamification'

export default function BantoCard() {
  const { journals } = useAppStore()
  const [level, setLevel]     = useState<Level | null>(null)
  const [progress, setProgress] = useState(0)
  const [xp, setXp]           = useState(0)
  const [shuriken, setShuriken] = useState(0)
  const [streak, setStreak]   = useState(0)
  const [message, setMessage] = useState<BantoMessage | null>(null)
  const [showBadges, setShowBadges] = useState(false)
  const [animXP, setAnimXP]   = useState(0)

  useEffect(() => {
    const now        = new Date()
    const ym         = now.toISOString().slice(0, 7)
    const monthJ     = journals.filter(j => j.date?.startsWith(ym))
    const totalAmt   = monthJ.filter(j => j.type === 'expense').reduce((s, j) => s + j.amount, 0)
    const totalInc   = monthJ.filter(j => j.type === 'income').reduce((s, j) => s + j.amount, 0)
    const evidenceRate = monthJ.length > 0
      ? Math.round(monthJ.filter(j => j.imgUrl).length / monthJ.length * 100) : 100
    const dangerCount = monthJ.filter(j => j.aiReview?.risk === 'danger').length
    const catCount    = new Set(journals.map(j => j.category).filter(Boolean)).size
    const streakDays  = StreakStore.get().days

    const currentXP  = XPStore.get()
    const lv         = XPStore.getLevel()
    const prog       = XPStore.getProgress()
    const total      = BadgeStore.getTotalShuriken()

    setLevel(lv)
    setProgress(prog)
    setXp(currentXP)
    setShuriken(total)
    setStreak(streakDays)

    // XPアニメーション
    let start = 0
    const timer = setInterval(() => {
      start += Math.ceil(currentXP / 30)
      if (start >= currentXP) { setAnimXP(currentXP); clearInterval(timer) }
      else setAnimXP(start)
    }, 30)

    // 番頭メッセージ
    const msg = getBantoMessage({
      hour: now.getHours(),
      totalRecords:  journals.length,
      monthRecords:  monthJ.length,
      dangerCount,
      evidenceRate,
      streakDays,
      netIncome:     totalInc - totalAmt,
      level:         lv,
    })
    setMessage(msg)

    return () => clearInterval(timer)
  }, [journals])

  if (!level) return null

  const nextLevel = XPStore.getNextLevel()
  const badges    = BadgeStore.getAll()
  const earnedBadges = badges.filter((b: any) => b.earned)

  return (
    <div className="card overflow-hidden">
      {/* 番頭メッセージ */}
      {message && (
        <div className="flex gap-3 mb-4 p-3 bg-[#F8F8F8] rounded-xl">
          <span className="text-2xl flex-shrink-0 mt-0.5">{message.icon}</span>
          <div>
            <div className="text-[10px] text-[#9A9288] mb-0.5">番頭より</div>
            <p className="text-sm text-[#1A1A1A] leading-relaxed font-serif">{message.text}</p>
          </div>
        </div>
      )}

      {/* レベル・XP */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{level.icon}</div>
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <span className="text-xs text-[#9A9288]">Lv.{level.level}</span>
              <span className="text-sm font-bold ml-2" style={{ color: level.color }}>{level.title}</span>
            </div>
            <span className="text-xs text-[#9A9288]">{animXP} XP</span>
          </div>
          {/* XPプログレスバー */}
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress}%`, background: level.color }}
            />
          </div>
          {nextLevel && (
            <div className="text-[10px] text-[#9A9288] mt-1">
              次のレベル「{nextLevel.title}」まで {nextLevel.minXP - xp} XP
            </div>
          )}
        </div>
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#F8F8F8] rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-[#1A1A1A]">⭐ {shuriken}</div>
          <div className="text-[10px] text-[#9A9288]">手裏剣</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-[#8B2020]">🔥 {streak}</div>
          <div className="text-[10px] text-[#9A9288]">連続日数</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-[#2F5D50]">🏅 {earnedBadges.length}</div>
          <div className="text-[10px] text-[#9A9288]">バッジ</div>
        </div>
      </div>

      {/* バッジ一覧トグル */}
      <button onClick={() => setShowBadges(!showBadges)}
        className="w-full text-xs text-[#9A9288] py-1 bg-transparent border-none cursor-pointer">
        {showBadges ? '▲ バッジを閉じる' : `▼ バッジを見る（${earnedBadges.length}/${badges.length}）`}
      </button>

      {showBadges && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {badges.map((b: any) => (
            <div key={b.id}
              className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                b.earned ? 'bg-[#F0F8F4]' : 'bg-[#F8F8F8] opacity-40'
              }`}>
              <span className="text-xl mb-0.5">{b.icon}</span>
              <span className="text-[9px] text-[#6B6459] leading-tight">{b.label}</span>
              {b.earned && b.rare && (
                <span className="text-[8px] text-[#9A6B1E] font-bold">RARE</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
