import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default async function Home() {
  // サーバー側でセッション確認
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/auth')
  }
}
