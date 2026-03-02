// src/app/api/notifications/route.ts
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

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { traderId: trader.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.notification.count({ where: { traderId: trader.id, isRead: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const trader = await db.trader.findUnique({ where: { userId: payload.userId }, select: { id: true } })
  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const { id, markAllRead } = await req.json()

  if (markAllRead) {
    await db.notification.updateMany({ where: { traderId: trader.id, isRead: false }, data: { isRead: true, readAt: new Date() } })
    return NextResponse.json({ success: true })
  }

  if (id) {
    await db.notification.update({ where: { id, traderId: trader.id }, data: { isRead: true, readAt: new Date() } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
