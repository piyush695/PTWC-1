// src/app/api/payment/webhook/route.ts
// Receives webhook events from payment providers to update payment status.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') || ''
  const cfg = await db.paymentConfig.findFirst()

  // ── Stripe webhook ───────────────────────────────────────────────────
  if (provider === 'stripe') {
    const sig     = req.headers.get('stripe-signature') || ''
    const rawBody = await req.text()

    if (cfg?.stripeWebhookSecret) {
      // Verify Stripe signature
      const [, timestamp] = sig.split(',').find(p => p.startsWith('t='))?.split('=') || ['','']
      const [, sigHash]   = sig.split(',').find(p => p.startsWith('v1='))?.split('=') || ['','']
      const payload       = `${timestamp}.${rawBody}`
      const expected      = crypto.createHmac('sha256', cfg.stripeWebhookSecret).update(payload).digest('hex')
      if (expected !== sigHash) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(rawBody)

    if (event.type === 'checkout.session.completed') {
      const session   = event.data.object
      const paymentId = session.metadata?.paymentId
      if (paymentId) {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data: {
            status:      'COMPLETED',
            providerRef: session.id,
            paidAt:      new Date(),
            metadata:    JSON.stringify({ stripePaymentIntent: session.payment_intent }),
          },
        })
      }
    }

    if (event.type === 'checkout.session.expired') {
      const paymentId = event.data.object.metadata?.paymentId
      if (paymentId) {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data:  { status: 'EXPIRED' },
        })
      }
    }

    return NextResponse.json({ received: true })
  }

  // ── Coinbase Commerce webhook ─────────────────────────────────────────
  if (provider === 'coinbase') {
    const sig     = req.headers.get('x-cc-webhook-signature') || ''
    const rawBody = await req.text()

    if (cfg?.coinbaseWebhookSecret) {
      const expected = crypto.createHmac('sha256', cfg.coinbaseWebhookSecret).update(rawBody).digest('hex')
      if (expected !== sig) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(rawBody)
    const paymentId = event.event?.data?.metadata?.paymentId

    if (paymentId) {
      if (event.event?.type === 'charge:confirmed' || event.event?.type === 'charge:resolved') {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data: { status: 'COMPLETED', paidAt: new Date(), providerRef: event.event.data.code },
        })
      }
      if (event.event?.type === 'charge:failed' || event.event?.type === 'charge:expired') {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data:  { status: 'EXPIRED' },
        })
      }
    }

    return NextResponse.json({ received: true })
  }

  // ── NOWPayments IPN ────────────────────────────────────────────────────
  if (provider === 'nowpayments') {
    const rawBody = await req.text()
    const data    = JSON.parse(rawBody)
    const paymentId = data.order_id

    if (paymentId) {
      if (data.payment_status === 'finished' || data.payment_status === 'confirmed') {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data: { status: 'COMPLETED', paidAt: new Date(), providerRef: String(data.payment_id) },
        })
      }
    }
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
