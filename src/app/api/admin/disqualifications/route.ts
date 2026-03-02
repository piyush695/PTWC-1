// src/app/api/admin/disqualifications/route.ts
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

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get('page')   || '1'))
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50'))
  const reason = searchParams.get('reason') || ''
  const search = searchParams.get('search') || ''
  const skip   = (page - 1) * limit

  const where: any = {}
  if (reason) where.reason = reason
  if (search) {
    where.trader = {
      OR: [
        { displayName: { contains: search, mode: 'insensitive' } },
        { firstName:   { contains: search, mode: 'insensitive' } },
        { lastName:    { contains: search, mode: 'insensitive' } },
      ]
    }
  }

  const [disqualifications, total] = await Promise.all([
    db.disqualification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issuedAt: 'desc' },
      include: {
        trader: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            status: true,
            country: { select: { code: true, name: true, flag: true } },
            accounts: { select: { accountNumber: true, currentBalance: true, maxDrawdown: true } },
          }
        }
      }
    }),
    db.disqualification.count({ where }),
  ])

  // Reason breakdown for stats
  const breakdown = await db.disqualification.groupBy({
    by: ['reason'],
    _count: true,
    orderBy: { _count: { reason: 'desc' } },
  })

  return NextResponse.json({
    disqualifications,
    total,
    page,
    pages: Math.ceil(total / limit),
    breakdown,
  })
}

const createSchema = z.object({
  traderId: z.string(),
  reason:   z.enum(['DRAWDOWN_BREACH','RULE_VIOLATION','MANIPULATION','INACTIVITY','DOCUMENT_FRAUD','MULTIPLE_ACCOUNTS','EXTERNAL_SIGNAL','HFT_ABUSE','OTHER']),
  notes:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { traderId, reason, notes } = createSchema.parse(body)

  const result = await db.$transaction(async (tx) => {
    const dq = await tx.disqualification.create({
      data: { traderId, reason, notes, issuedBy: user.userId },
    })
    await tx.trader.update({
      where: { id: traderId },
      data:  { status: 'DISQUALIFIED' },
    })
    return dq
  })

  await db.adminLog.create({
    data: {
      userId:  user.userId,
      action:  'TRADER_DISQUALIFIED',
      details: JSON.stringify({ traderId, reason, notes }),
    },
  })

  return NextResponse.json({ disqualification: result })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can reinstate traders' }, { status: 403 })
  }

  const { dqId, traderId } = await req.json()

  await db.$transaction([
    db.disqualification.delete({ where: { id: dqId } }),
    db.trader.update({ where: { id: traderId }, data: { status: 'ACTIVE' } }),
  ])

  await db.adminLog.create({
    data: {
      userId:  user.userId,
      action:  'TRADER_REINSTATED',
      details: JSON.stringify({ traderId, dqId }),
    },
  })

  return NextResponse.json({ success: true })
}
