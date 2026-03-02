// src/app/api/admin/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, logAdminAction } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const phase    = searchParams.get('phase')
  const search   = searchParams.get('search')
  const page     = parseInt(searchParams.get('page') || '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const skip     = (page - 1) * limit

  const where: any = {}
  if (status)  where.status = status
  if (phase)   where.phase  = phase
  if (search)  where.OR     = [
    { accountNumber:   { contains: search, mode: 'insensitive' } },
    { brokerAccountId: { contains: search, mode: 'insensitive' } },
    { trader: { displayName: { contains: search, mode: 'insensitive' } } },
    { trader: { email:       { contains: search, mode: 'insensitive' } } },
  ]

  const [accounts, total] = await Promise.all([
    db.tradingAccount.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        trader: {
          select: {
            id: true, displayName: true, email: true, status: true,
            country: { select: { code: true, name: true, flag: true } },
            kycRecord: { select: { status: true } },
            platformSelection: {
              include: { platform: { select: { id: true, name: true, type: true, brokerName: true } } }
            },
          }
        },
      },
    }),
    db.tradingAccount.count({ where }),
  ])

  const config = await db.tournamentConfig.findFirst()

  return NextResponse.json({
    accounts: accounts.map(a => ({
      ...a,
      openingBalance:  parseFloat(a.openingBalance.toString()),
      currentBalance:  parseFloat(a.currentBalance.toString()),
      currentEquity:   parseFloat(a.currentEquity.toString()),
      peakBalance:     parseFloat(a.peakBalance.toString()),
      maxDrawdown:     parseFloat(a.maxDrawdown.toString()),
      totalVolumeLots: parseFloat(a.totalVolumeLots.toString()),
      returnPct: a.openingBalance.toNumber() > 0
        ? ((a.currentBalance.toNumber() - a.openingBalance.toNumber()) / a.openingBalance.toNumber()) * 100
        : 0,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    config: {
      currentPhase:          config?.currentPhase,
      qualifierAccountSize:  config?.qualifierAccountSize ? parseFloat(config.qualifierAccountSize.toString()) : 10000,
    },
  })
}

const provisionSchema = z.object({
  traderId:   z.string(),
  phase:      z.string(),
  balance:    z.number().positive().default(10000),
  platformId: z.string().optional(),
  notes:      z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = provisionSchema.parse(await req.json())

    const trader = await db.trader.findUnique({ where: { id: body.traderId } })
    if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

    // Check if account for this phase already exists
    const existing = await db.tradingAccount.findFirst({
      where: { traderId: body.traderId, phase: body.phase as any },
    })
    if (existing)
      return NextResponse.json({ error: `Account for ${body.phase} already exists` }, { status: 409 })

    // Generate account number
    const ts            = Date.now().toString(36).toUpperCase()
    const accountNumber = `HP-WC-${ts}`

    const account = await db.tradingAccount.create({
      data: {
        traderId:       body.traderId,
        accountNumber,
        phase:          body.phase as any,
        status:         'PENDING',
        openingBalance: body.balance,
        currentBalance: body.balance,
        currentEquity:  body.balance,
        peakBalance:    body.balance,
      },
      include: {
        trader: { select: { displayName: true, email: true } },
      },
    })

    await logAdminAction({
      userId:     user.userId,
      action:     'ACCOUNT_PROVISIONED',
      entityType: 'TradingAccount',
      entityId:   account.id,
      details:    `Provisioned ${body.phase} account ${accountNumber} for ${trader.displayName}`,
    })

    return NextResponse.json({
      account: {
        ...account,
        openingBalance: parseFloat(account.openingBalance.toString()),
        currentBalance: parseFloat(account.currentBalance.toString()),
        currentEquity:  parseFloat(account.currentEquity.toString()),
        peakBalance:    parseFloat(account.peakBalance.toString()),
        maxDrawdown:    parseFloat(account.maxDrawdown.toString()),
        totalVolumeLots: parseFloat(account.totalVolumeLots.toString()),
      }
    }, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    console.error('Provision error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
