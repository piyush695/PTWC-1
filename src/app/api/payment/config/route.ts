// src/app/api/payment/config/route.ts
// Public endpoint — returns only what the frontend needs (no secrets exposed)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const revalidate = 0

export const DEFAULT_PAYMENT_CONFIG = {
  feeEnabled:          false,
  registrationFee:     10.00,
  feeCurrency:         'USD',
  provider:            'PAYPAL' as const,
  paypalClientId:      '',
  paypalMode:          'sandbox',
  stripePublishableKey:'',
  coinbaseApiKey:      '',       // public for Coinbase charge creation
  nowpaymentsApiKey:   '',
  manualInstructions:  '',
}

export async function GET() {
  try {
    const cfg = await db.paymentConfig.findFirst()
    if (!cfg) return NextResponse.json({ config: DEFAULT_PAYMENT_CONFIG })

    // NEVER return secret keys to the client
    return NextResponse.json({
      config: {
        feeEnabled:           cfg.feeEnabled,
        registrationFee:      Number(cfg.registrationFee),
        feeCurrency:          cfg.feeCurrency,
        provider:             cfg.provider,
        paypalClientId:       cfg.paypalClientId      || '',
        paypalMode:           cfg.paypalMode,
        stripePublishableKey: cfg.stripePublishableKey || '',
        manualInstructions:   cfg.manualInstructions   || '',
      }
    })
  } catch {
    return NextResponse.json({ config: DEFAULT_PAYMENT_CONFIG })
  }
}
