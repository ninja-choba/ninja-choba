'use client'
import { useEffect, useState } from 'react'
import type { Level, ShurikenBadge } from '@/lib/gamification'

interface LevelUpToastProps {
  level?: Level
  badges?: ShurikenBadge[]
  onClose: () => void
}

export default function LevelUpToast({ level, badges = [], onClose }: LevelUpToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 400) }, 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none
      transition-all duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: visible ? 'rgba(0,0,0,0.5)' : 'transparent' }}>

      {level && (
        <div className={`pointer-events-auto bg-[#1A1A1A] text-white rounded-2xl p-6 mx-6 text-center
          shadow-2xl transition-transform duration-400 ${visible ? 'scale-100' : 'scale-75'}`}>
          {/* パーティクル風の星 */}
          <div className="text-4xl mb-1 animate-bounce">✨</div>
          <div className="text-xs text-[#9A9288] mb-1">レベルアップ！</div>
          <div className="text-5xl mb-2">{level.icon}</div>
          <div className="text-xl font-bold mb-1" style={{ color: level.color }}>
            Lv.{level.level}
          </div>
          <div className="text-2xl font-serif font-bold mb-3">{level.title}</div>
          <button onClick={() => { setVisible(false); setTimeout(onClose, 400) }}
            className="px-6 py-2 bg-white/20 rounded-full text-sm">
            おめでとう！
          </button>
        </div>
      )}

      {badges.length > 0 && !level && (
        <div className={`pointer-events-auto bg-[#1A1A1A] text-white rounded-2xl p-5 mx-6
          shadow-2xl transition-transform duration-400 ${visible ? 'scale-100' : 'scale-75'}`}>
          <div className="text-center mb-3">
            <div className="text-3xl mb-1">🌟</div>
            <div className="text-sm font-bold">バッジを獲得！</div>
          </div>
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-3 bg-white/10 rounded-xl p-3 mb-2">
              <span className="text-3xl">{b.icon}</span>
              <div>
                <div className="font-bold">{b.label}</div>
                <div className="text-xs text-[#9A9288]">{b.desc}</div>
                <div className="text-xs text-[#F0D080] mt-0.5">⭐ 手裏剣 ×{b.shuriken}</div>
              </div>
              {b.rare && <span className="ml-auto text-xs bg-[#9A6B1E] px-2 py-0.5 rounded-full">RARE</span>}
            </div>
          ))}
          <button onClick={() => { setVisible(false); setTimeout(onClose, 400) }}
            className="w-full mt-2 py-2 bg-white/20 rounded-xl text-sm">
            閉じる
          </button>
        </div>
      )}
    </div>
  )
}
