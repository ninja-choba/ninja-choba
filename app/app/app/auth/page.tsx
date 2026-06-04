'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab]       = useState<'login' | 'signup'>('login')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [name, setName]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleSignup() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { name } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handlePasskey() {
    if (!window.PublicKeyCredential) { setError('このブラウザはパスキー非対応です'); return }
    setError('パスキーログインはSupabase設定後に有効になります')
  }

  async function handleDemo() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col items-center px-6">
      {/* ロゴ */}
      <div className="pt-16 pb-12 flex flex-col items-center">
        <div className="font-serif text-5xl font-bold text-[#1A1A1A] tracking-wider mb-2">忍者帳場</div>
        <div className="text-xs text-[#9A9288] tracking-widest">NINJA-CHOBA</div>
      </div>

      {/* フォーム */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {/* タブ */}
        <div className="flex bg-[#EEEBE5] rounded-full p-1 mb-1 gap-1">
          {(['login', 'signup'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                tab === t ? 'bg-[#1A1A1A] text-white' : 'text-[#A09890]'
              }`}>
              {t === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {tab === 'signup' && (
          <input className="form-input" type="text" placeholder="お名前・屋号"
            value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="form-input" type="email" placeholder="メールアドレス"
          value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="form-input" type="password" placeholder="パスワード"
          value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />

        {error && <p className="text-[#8B2020] text-sm text-center">{error}</p>}

        <button className="btn-primary mt-1" onClick={tab === 'login' ? handleLogin : handleSignup} disabled={loading}>
          {loading ? '処理中…' : tab === 'login' ? 'ログイン' : '登録する'}
        </button>

        <button onClick={handlePasskey}
          className="w-full py-3.5 bg-[#F2EFE9] border-none rounded-xl text-sm text-[#6B6459] cursor-pointer">
          🔑 Face ID / パスキーでログイン
        </button>

        <button onClick={handleDemo}
          className="w-full py-3.5 bg-[#F2EFE9] border-none rounded-xl text-sm text-[#6B6459] cursor-pointer">
          デモを試す（登録不要）
        </button>

        {tab === 'login' && (
          <p className="text-center text-xs text-[#B0A89E] py-2 cursor-pointer">パスワードを忘れた方</p>
        )}
      </div>

      <p className="fixed bottom-4 text-[11px] text-[#C8C2BA]">忍者帳場 v20260527</p>
    </div>
  )
}
