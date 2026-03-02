// src/app/api/payment/verify/route.ts
// Called after payment to verify with the provider and mark as COMPLETED.
// Also used by the register flow to check payment status before creating account.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  paymentId:  z.string(),
  // Provider-specific fields
  orderId:    z.string().optional(),   // PayPal
  sessionId:  z.string().optional(),   // Stripe
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { paymentId, orderId, sessionId } = schema.parse(body)

    const payment = await db.registrationPayment.findUnique({ where: { id: paymentId } })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ verified: true, payment })
    }

    const cfg = await db.paymentConfig.findFirst()
    if (!cfg) return NextResponse.json({ error: 'Config not found' }, { status: 400 })

    // ── Verify PayPal ────────────────────────────────────────────────────
    if (payment.provider === 'PAYPAL' && orderId) {
      const baseUrl = cfg.paypalMode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

      const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${cfg.paypalClientId}:${cfg.paypalClientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      })
      const { access_token } = await authRes.json()

      // Capture the order
      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
      })
      const capture = await captureRes.json()

      if (capture.status === 'COMPLETED') {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data: {
            status:      'COMPLETED',
            providerRef: orderId,
            paidAt:      new Date(),
            metadata:    JSON.stringify({ captureId: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id }),
          },
        })
        return NextResponse.json({ verified: true })
      }
      return NextResponse.json({ verified: false, status: capture.status })
    }

    // ── Verify Stripe ────────────────────────────────────────────────────
    if (payment.provider === 'STRIPE' && sessionId) {
      const sessRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${cfg.stripeSecretKey}` },
      })
      const session = await sessRes.json()

      if (session.payment_status === 'paid') {
        await db.registrationPayment.update({
          where: { id: paymentId },
          data: {
            status:      'COMPLETED',
            providerRef: sessionId,
            paidAt:      new Date(),
            metadata:    JSON.stringify({ stripePaymentIntent: session.payment_intent }),
          },
        })
        return NextResponse.json({ verified: true })
      }
      return NextResponse.json({ verified: false, status: session.payment_status })
    }

    // ── Manual / already pending ─────────────────────────────────────────
    if (payment.provider === 'MANUAL') {
      // Manual payments need admin approval — return pending status
      return NextResponse.json({ verified: false, pending: true, status: 'PENDING_REVIEW' })
    }

    return NextResponse.json({ verified: false, status: payment.status })

  } catch (err: any) {
    console.error('verify error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
