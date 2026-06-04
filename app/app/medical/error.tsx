'use client'
import { useEffect } from 'react'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="text-4xl mb-4">⚠</div>
      <div className="font-serif text-xl font-bold mb-2">エラーが発生しました</div>
      <button onClick={reset} className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium mt-4">再試行</button>
      <a href="/dashboard" className="mt-3 text-sm text-[#2F5D50]">ホームに戻る</a>
    </div>
  )
}
