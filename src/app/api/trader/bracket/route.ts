// src/app/api/trader/bracket/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const trader = await db.trader.findUnique({ where: { userId: payload.userId }, select: { id: true } })
  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const matches = await db.match.findMany({
    where: {
      OR: [{ trader1Id: trader.id }, { trader2Id: trader.id }]
    },
    include: {
      trader1: { select: { id: true, displayName: true, country: { select: { code: true, name: true } } } },
      trader2: { select: { id: true, displayName: true, country: { select: { code: true, name: true } } } },
      winner:  { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const config = await db.tournamentConfig.findFirst()

  return NextResponse.json({ matches, traderId: trader.id, config })
}
