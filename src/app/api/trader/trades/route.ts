// src/app/api/trader/trades/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')   || '1')
  const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const symbol = searchParams.get('symbol')
  const status = searchParams.get('status') // OPEN | CLOSED

  const trader = await db.trader.findUnique({ where: { userId: payload.userId }, select: { id: true } })
  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const accounts = await db.tradingAccount.findMany({ where: { traderId: trader.id }, select: { id: true } })
  const accountIds = accounts.map(a => a.id)

  const where: any = { accountId: { in: accountIds } }
  if (symbol) where.symbol = symbol
  if (status === 'OPEN')   where.isOpen = true
  if (status === 'CLOSED') where.isOpen = false

  const [trades, total] = await Promise.all([
    db.trade.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { openTime: 'desc' } }),
    db.trade.count({ where }),
  ])

  // Stats
  const closed = await db.trade.findMany({ where: { accountId: { in: accountIds }, isOpen: false }, select: { profit: true } })
  const totalPnl   = closed.reduce((s, t) => s + Number(t.profit || 0), 0)
  const wins       = closed.filter(t => Number(t.profit) > 0).length
  const winRate    = closed.length ? ((wins / closed.length) * 100).toFixed(1) : '0'

  return NextResponse.json({ trades, total, page, pages: Math.ceil(total / limit), stats: { totalPnl, wins, losses: closed.length - wins, winRate, totalClosed: closed.length } })
}
