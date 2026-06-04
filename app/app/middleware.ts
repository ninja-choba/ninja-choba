import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth', '/legal']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // 公開パス・APIはスキップ
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next()
  if (path.startsWith('/api')) return NextResponse.next()

  // Cookieからセッションを確認
  const accessToken = req.cookies.get('sb-access-token')?.value
                   || req.cookies.get('supabase-auth-token')?.value

  // セッションなしで保護ページへ → ログインへリダイレクト
  if (!accessToken) {
    // デモモード（cookieがなくても通す）は本番では削除すること
    const isDemo = req.cookies.get('ninja-demo')?.value === '1'
    if (!isDemo) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
