// src/app/api/admin/traders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, logAdminAction } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const country = searchParams.get('country')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const skip = (page - 1) * limit

  const where: any = {}
  if (status) where.status = status
  if (country) where.country = { code: country }
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [traders, total] = await Promise.all([
    db.trader.findMany({
      where,
      skip,
      take: limit,
      orderBy: { registeredAt: 'desc' },
      include: {
        country: { select: { code: true, name: true, flag: true } },
        accounts: {
          select: {
            phase: true,
            status: true,
            currentBalance: true,
            openingBalance: true,
            maxDrawdown: true,
            totalTrades: true,
            accountNumber: true,
          },
        },
        qualifierEntry: { select: { rank: true, returnPct: true, qualified: true } },
        disqualifications: { select: { reason: true, issuedAt: true } },
        _count: { select: { notes: true } },
      },
    }),
    db.trader.count({ where }),
  ])

  return NextResponse.json({
    traders: traders.map(t => ({
      ...t,
      accounts: t.accounts.map(a => ({
        ...a,
        currentBalance: parseFloat(a.currentBalance.toString()),
        openingBalance: parseFloat(a.openingBalance.toString()),
        maxDrawdown: parseFloat(a.maxDrawdown.toString()),
        returnPct: a.openingBalance.toNumber() > 0
          ? ((a.currentBalance.toNumber() - a.openingBalance.toNumber()) / a.openingBalance.toNumber()) * 100
          : 0,
      })),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

// Update trader status (KYC, disqualify, etc.)
const updateSchema = z.object({
  traderId: z.string(),
  status: z.enum(['KYC_PENDING', 'KYC_APPROVED', 'KYC_REJECTED', 'ACTIVE', 'DISQUALIFIED', 'ELIMINATED']).optional(),
  disqualifyReason: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { traderId, status, disqualifyReason } = updateSchema.parse(body)

    const trader = await db.trader.findUnique({ where: { id: traderId } })
    if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

    const config = await db.tournamentConfig.findFirst()

    await db.$transaction(async (tx) => {
      if (status) {
        await tx.trader.update({ where: { id: traderId }, data: { status } })

        // If KYC approved, provision account
        if (status === 'KYC_APPROVED') {
          const accountNumber = `HP-WC-${Date.now().toString(36).toUpperCase()}`
          await tx.tradingAccount.create({
            data: {
              traderId,
              accountNumber,
              phase: config?.currentPhase || 'QUALIFIER',
              status: 'PENDING',
              openingBalance: config?.qualifierAccountSize || 10000,
              currentBalance: config?.qualifierAccountSize || 10000,
              currentEquity: config?.qualifierAccountSize || 10000,
              peakBalance: config?.qualifierAccountSize || 10000,
            },
          })
        }

        // If disqualified, record reason
        if (status === 'DISQUALIFIED' && disqualifyReason) {
          await tx.disqualification.create({
            data: {
              traderId,
              reason: disqualifyReason as any,
              details: `Disqualified by admin ${user.email}`,
              phase: config?.currentPhase || 'QUALIFIER',
              issuedBy: user.userId,
            },
          })
        }
      }

      await logAdminAction({
        userId: user.userId,
        action: `TRADER_STATUS_UPDATE`,
        entityType: 'trader',
        entityId: traderId,
        details: `Status changed to ${status}`,
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
