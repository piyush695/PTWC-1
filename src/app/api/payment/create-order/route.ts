// src/app/api/payment/create-order/route.ts
// Creates a payment order/session with the configured provider.
// Returns the data the frontend needs to render the payment UI.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email:    z.string().email(),
  provider: z.enum(['PAYPAL','STRIPE','COINBASE','NOWPAYMENTS','MANUAL']),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, provider } = schema.parse(body)

    const cfg = await db.paymentConfig.findFirst()
    if (!cfg || !cfg.feeEnabled) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 400 })
    }

    const amount   = Number(cfg.registrationFee)
    const currency = cfg.feeCurrency

    // Create a pending payment record first
    const payment = await db.registrationPayment.create({
      data: {
        email,
        amount,
        currency,
        provider,
        status:    'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    })

    // ── PayPal ────────────────────────────────────────────────────────────
    if (provider === 'PAYPAL') {
      if (!cfg.paypalClientId || !cfg.paypalClientSecret) {
        return NextResponse.json({ error: 'PayPal not configured' }, { status: 400 })
      }

      const baseUrl = cfg.paypalMode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

      // Get access token
      const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${cfg.paypalClientId}:${cfg.paypalClientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      })
      const authData = await authRes.json()
      if (!authData.access_token) {
        return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 500 })
      }

      // Create order
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.access_token}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: payment.id,
            description:  'Hola Prime World Cup — Registration Fee',
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          }],
          application_context: {
            brand_name: 'Hola Prime World Cup',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
          },
        }),
      })
      const orderData = await orderRes.json()

      if (orderData.id) {
        await db.registrationPayment.update({
          where: { id: payment.id },
          data:  { providerRef: orderData.id },
        })
        return NextResponse.json({
          paymentId:    payment.id,
          provider:     'PAYPAL',
          orderId:      orderData.id,
          clientId:     cfg.paypalClientId,
          mode:         cfg.paypalMode,
          amount,
          currency,
        })
      }
      return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
    }

    // ── Stripe ────────────────────────────────────────────────────────────
    if (provider === 'STRIPE') {
      if (!cfg.stripeSecretKey) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]':       'card',
          'line_items[0][price_data][currency]':               currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]':     'Hola Prime World Cup Registration',
          'line_items[0][price_data][unit_amount]':            String(Math.round(amount * 100)),
          'line_items[0][quantity]':                           '1',
          'mode':                                              'payment',
          'success_url':                                       `${appUrl}/register?payment=success&session_id={CHECKOUT_SESSION_ID}&pid=${payment.id}`,
          'cancel_url':                                        `${appUrl}/register?payment=cancelled&pid=${payment.id}`,
          'metadata[paymentId]':                               payment.id,
          'metadata[email]':                                   email,
          'customer_email':                                    email,
        }).toString(),
      })
      const session = await sessionRes.json()

      if (session.id && session.url) {
        await db.registrationPayment.update({
          where: { id: payment.id },
          data:  { providerRef: session.id },
        })
        return NextResponse.json({
          paymentId:   payment.id,
          provider:    'STRIPE',
          sessionId:   session.id,
          redirectUrl: session.url,
          amount,
          currency,
        })
      }
      return NextResponse.json({ error: 'Failed to create Stripe session' }, { status: 500 })
    }

    // ── Coinbase Commerce ─────────────────────────────────────────────────
    if (provider === 'COINBASE') {
      if (!cfg.coinbaseApiKey) {
        return NextResponse.json({ error: 'Coinbase not configured' }, { status: 400 })
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const chargeRes = await fetch('https://api.commerce.coinbase.com/charges', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-CC-Api-Key':  cfg.coinbaseApiKey,
          'X-CC-Version':  '2018-03-22',
        },
        body: JSON.stringify({
          name:          'Hola Prime World Cup Registration',
          description:   'Registration fee for the Hola Prime Trading World Cup 2026',
          pricing_type:  'fixed_price',
          local_price:   { amount: amount.toFixed(2), currency },
          metadata:      { paymentId: payment.id, email },
          redirect_url:  `${appUrl}/register?payment=success&pid=${payment.id}`,
          cancel_url:    `${appUrl}/register?payment=cancelled&pid=${payment.id}`,
        }),
      })
      const charge = await chargeRes.json()

      if (charge.data?.code) {
        await db.registrationPayment.update({
          where: { id: payment.id },
          data:  { providerRef: charge.data.code },
        })
        return NextResponse.json({
          paymentId:   payment.id,
          provider:    'COINBASE',
          chargeCode:  charge.data.code,
          redirectUrl: charge.data.hosted_url,
          amount,
          currency,
        })
      }
      return NextResponse.json({ error: 'Failed to create Coinbase charge' }, { status: 500 })
    }

    // ── NOWPayments (crypto) ──────────────────────────────────────────────
    if (provider === 'NOWPAYMENTS') {
      if (!cfg.nowpaymentsApiKey) {
        return NextResponse.json({ error: 'NOWPayments not configured' }, { status: 400 })
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const invoiceRes = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key':   cfg.nowpaymentsApiKey,
          'Content-Type':'application/json',
        },
        body: JSON.stringify({
          price_amount:    amount,
          price_currency:  currency.toLowerCase(),
          order_id:        payment.id,
          order_description: 'Hola Prime World Cup Registration',
          success_url:     `${appUrl}/register?payment=success&pid=${payment.id}`,
          cancel_url:      `${appUrl}/register?payment=cancelled&pid=${payment.id}`,
          ipn_callback_url: `${appUrl}/api/payment/webhook?provider=nowpayments`,
        }),
      })
      const invoice = await invoiceRes.json()

      if (invoice.id) {
        await db.registrationPayment.update({
          where: { id: payment.id },
          data:  { providerRef: String(invoice.id) },
        })
        return NextResponse.json({
          paymentId:   payment.id,
          provider:    'NOWPAYMENTS',
          invoiceId:   invoice.id,
          redirectUrl: invoice.invoice_url,
          amount,
          currency,
        })
      }
      return NextResponse.json({ error: 'Failed to create NOWPayments invoice' }, { status: 500 })
    }

    // ── Manual / Bank Transfer ────────────────────────────────────────────
    if (provider === 'MANUAL') {
      return NextResponse.json({
        paymentId:    payment.id,
        provider:     'MANUAL',
        instructions: cfg.manualInstructions || 'Contact support for bank transfer details.',
        amount,
        currency,
        reference:    payment.id.slice(-8).toUpperCase(),
      })
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })

  } catch (err: any) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
