'use client'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TopBar() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-5 bg-white/95 backdrop-blur-sm border-b border-[#E5E0D8]">
      <div>
        <div className="font-serif text-xl font-bold tracking-wide">忍者帳場</div>
        <div className="text-[10px] text-[#9A9288]">v20260527</div>
      </div>
      <button onClick={handleLogout}
        className="text-xs text-[#6B6459] border border-[#E5E0D8] rounded-full px-3.5 py-1.5 bg-transparent cursor-pointer">
        姿を消す
      </button>
    </header>
  )
}
