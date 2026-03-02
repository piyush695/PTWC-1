// src/app/api/admin/payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = await db.paymentConfig.findFirst()
  if (!cfg) return NextResponse.json({ config: null })

  // Return full config including secrets (admin only)
  return NextResponse.json({ config: cfg })
}

const schema = z.object({
  feeEnabled:            z.boolean().optional(),
  registrationFee:       z.number().min(0).optional(),
  feeCurrency:           z.string().optional(),
  provider:              z.enum(['PAYPAL','STRIPE','COINBASE','NOWPAYMENTS','MANUAL']).optional(),
  paypalClientId:        z.string().optional(),
  paypalClientSecret:    z.string().optional(),
  paypalMode:            z.enum(['sandbox','live']).optional(),
  stripePublishableKey:  z.string().optional(),
  stripeSecretKey:       z.string().optional(),
  stripeWebhookSecret:   z.string().optional(),
  coinbaseApiKey:        z.string().optional(),
  coinbaseWebhookSecret: z.string().optional(),
  nowpaymentsApiKey:     z.string().optional(),
  nowpaymentsIpnSecret:  z.string().optional(),
  manualInstructions:    z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can update payment config' }, { status: 403 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const existing = await db.paymentConfig.findFirst()

  const updated = existing
    ? await db.paymentConfig.update({ where: { id: existing.id }, data: { ...data, updatedBy: user.email } })
    : await db.paymentConfig.create({ data: { ...data, updatedBy: user.email } as any })

  await db.adminLog.create({
    data: {
      userId:  user.userId,
      action:  'PAYMENT_CONFIG_UPDATED',
      details: JSON.stringify({ fields: Object.keys(data) }),
    },
  })

  return NextResponse.json({ config: updated, saved: true })
}
