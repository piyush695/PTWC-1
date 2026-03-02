// src/app/api/admin/platforms/route.ts
// GET  /api/admin/platforms  — list all platforms
// POST /api/admin/platforms  — create a new platform
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name:             z.string().min(1),
  type:             z.enum(['MT4','MT5','CTRADER','DXTRADE','TRADOVATE','NINJATRADER','MATCHTRADER','TRADELOCKER','CUSTOM']),
  brokerName:       z.string().optional(),
  description:      z.string().optional(),
  serverHost:       z.string().optional(),
  serverPort:       z.number().int().optional().nullable(),
  serverName:       z.string().optional(),
  managerLogin:     z.string().optional(),
  managerPassword:  z.string().optional(),
  apiKey:           z.string().optional(),
  apiSecret:        z.string().optional(),
  apiPassphrase:    z.string().optional(),
  restApiUrl:       z.string().optional(),
  websocketUrl:     z.string().optional(),
  isActive:         z.boolean().optional(),
  isPublic:         z.boolean().optional(),
  accountPrefix:    z.string().optional(),
  defaultLeverage:  z.number().int().optional(),
  defaultBalance:   z.number().optional(),
  currency:         z.string().optional(),
  allowedPhases:    z.string().array().optional(),
  supportedPairs:   z.string().array().optional(),
  websiteUrl:       z.string().optional(),
  supportEmail:     z.string().optional(),
  notes:            z.string().optional(),
  sortOrder:        z.number().int().optional(),
  syncIntervalSec:  z.number().int().optional(),
})

// Sanitise for response — never expose raw secrets
function sanitise(p: any) {
  return {
    ...p,
    managerPassword: p.managerPassword ? '••••••••' : null,
    apiSecret:       p.apiSecret       ? '••••••••' : null,
    apiPassphrase:   p.apiPassphrase   ? '••••••••' : null,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const platforms = await db.tradingPlatform.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { accounts: true, selections: true } }
    },
  })

  return NextResponse.json({ platforms: platforms.map(sanitise) })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    const platform = await db.tradingPlatform.create({
      data: {
        ...data,
        defaultBalance: data.defaultBalance ? data.defaultBalance : 10000,
      },
    })

    return NextResponse.json({ platform: sanitise(platform) }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'A platform with that name already exists' }, { status: 409 })
    if (e.name === 'ZodError')
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 })
    console.error('Platform create error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
