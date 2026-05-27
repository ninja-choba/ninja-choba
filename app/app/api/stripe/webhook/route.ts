import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  const supabase = createServerClient()
  if (event.type === 'checkout.session.completed') {
    const s       = event.data.object as Stripe.Checkout.Session
    const email   = s.metadata?.email ?? ''
    const planId  = s.metadata?.planId ?? ''
    if (email && planId) {
      await (supabase.from('accounts') as any).update({ plan: planId }).eq('email', email)
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub   = event.data.object as Stripe.Subscription
    const email = (sub.metadata as any)?.email ?? ''
    if (email) {
      await (supabase.from('accounts') as any).update({ plan: 'free' }).eq('email', email)
    }
  }
  return NextResponse.json({ received: true })
}
