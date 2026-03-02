// src/app/api/trader/account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const trader = await db.trader.findUnique({
    where: { userId: payload.userId },
    include: {
      country: { select: { code: true, name: true, flag: true } },
      accounts: {
        include: {
          platform: { select: { name: true, type: true, brokerName: true, serverName: true } },
          snapshots: { orderBy: { timestamp: 'desc' }, take: 14 },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      qualifierEntry: true,
      kycRecord: { select: { status: true } },
      disqualifications: { select: { reason: true, details: true, issuedAt: true }, take: 1, orderBy: { issuedAt: 'desc' } },
    },
  })

  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const account = trader.accounts[0] || null

  return NextResponse.json({ trader, account })
}
