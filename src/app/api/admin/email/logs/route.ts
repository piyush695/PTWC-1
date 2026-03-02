// src/app/api/admin/email/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit  = parseInt(searchParams.get('limit')  || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  try {
    const where: any = {}
    if (status) where.status = status
    if (search) where.OR = [
      { to:      { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ]

    const [logs, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { trader: { select: { displayName: true } } },
      }),
      db.emailLog.count({ where }),
    ])

    // Stats
    const [sent, failed, queued] = await Promise.all([
      db.emailLog.count({ where: { status: 'SENT' } }),
      db.emailLog.count({ where: { status: 'FAILED' } }),
      db.emailLog.count({ where: { status: 'QUEUED' } }),
    ])

    return NextResponse.json({ logs, total, stats: { sent, failed, queued } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 })
  }
}
