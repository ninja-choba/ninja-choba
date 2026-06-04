import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Stripe APIキーが未設定です' }, { status: 503 })
  }
  try {
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(apiKey, { apiVersion: '2026-04-22.dahlia' })
    const { planId, interval, email } = await req.json()
    const PRICES: Record<string, string> = {
      standard_month: 'price_standard_month',
      standard_year: 'price_standard_year',
      pro_month: 'price_pro_month',
      pro_year: 'price_pro_year',
      pro_asset_month: 'price_pro_asset_month',
      pro_asset_year: 'price_pro_asset_year',
    }
    const priceId = PRICES[`${planId}_${interval}`]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/plan`,
      metadata: { planId, email },
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
