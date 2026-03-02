// src/app/api/admin/accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, logAdminAction } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await db.tradingAccount.findUnique({
    where: { id: params.id },
    include: {
      trader: {
        include: {
          country: true,
          kycRecord: true,
          platformSelection: { include: { platform: true } },
        }
      },
      trades: {
        orderBy: { openTime: 'desc' },
        take: 20,
        select: {
          id: true, symbol: true, direction: true,
          openTime: true, closeTime: true,
          openPrice: true, closePrice: true,
          lots: true, profit: true, isOpen: true, isFlaggedCheat: true,
        }
      },
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { balance: true, equity: true, createdAt: true },
      },
    }
  })

  if (!account)
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  return NextResponse.json({
    ...account,
    openingBalance:  parseFloat(account.openingBalance.toString()),
    currentBalance:  parseFloat(account.currentBalance.toString()),
    currentEquity:   parseFloat(account.currentEquity.toString()),
    peakBalance:     parseFloat(account.peakBalance.toString()),
    maxDrawdown:     parseFloat(account.maxDrawdown.toString()),
    totalVolumeLots: parseFloat(account.totalVolumeLots.toString()),
    returnPct: account.openingBalance.toNumber() > 0
      ? ((account.currentBalance.toNumber() - account.openingBalance.toNumber()) / account.openingBalance.toNumber()) * 100
      : 0,
    trades: account.trades.map(t => ({
      ...t,
      openPrice:  parseFloat(t.openPrice.toString()),
      closePrice: t.closePrice ? parseFloat(t.closePrice.toString()) : null,
      lots:       parseFloat(t.lots.toString()),
      profit:     t.profit ? parseFloat(t.profit.toString()) : null,
    })),
    snapshots: account.snapshots.map(s => ({
      balance: parseFloat(s.balance.toString()),
      equity:  parseFloat(s.equity.toString()),
      date:    s.createdAt,
    })),
  })
}

const patchSchema = z.object({
  status:          z.enum(['PENDING','ACTIVE','FROZEN','CLOSED']).optional(),
  brokerAccountId: z.string().optional(),
  notes:           z.string().optional(),
  manualBalance:   z.number().positive().optional(), // admin correction
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = patchSchema.parse(await req.json())

    const existing = await db.tradingAccount.findUnique({ where: { id: params.id } })
    if (!existing)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const updateData: any = {}
    if (body.status)          updateData.status          = body.status
    if (body.brokerAccountId) updateData.brokerAccountId = body.brokerAccountId
    if (body.manualBalance) {
      updateData.currentBalance = body.manualBalance
      updateData.currentEquity  = body.manualBalance
    }

    const updated = await db.tradingAccount.update({
      where: { id: params.id },
      data:  updateData,
    })

    await logAdminAction({
      userId:     user.userId,
      action:     'ACCOUNT_UPDATED',
      entityType: 'TradingAccount',
      entityId:   params.id,
      details:    JSON.stringify(body),
    })

    return NextResponse.json({
      ...updated,
      openingBalance:  parseFloat(updated.openingBalance.toString()),
      currentBalance:  parseFloat(updated.currentBalance.toString()),
      currentEquity:   parseFloat(updated.currentEquity.toString()),
      peakBalance:     parseFloat(updated.peakBalance.toString()),
      maxDrawdown:     parseFloat(updated.maxDrawdown.toString()),
      totalVolumeLots: parseFloat(updated.totalVolumeLots.toString()),
    })
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

  const existing = await db.tradingAccount.findUnique({
    where: { id: params.id },
    include: { _count: { select: { trades: true } } }
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing._count.trades > 0)
    return NextResponse.json({ error: 'Cannot delete account with trade history' }, { status: 409 })

  await db.tradingAccount.delete({ where: { id: params.id } })
  await logAdminAction({
    userId: user.userId, action: 'ACCOUNT_DELETED',
    entityType: 'TradingAccount', entityId: params.id,
  })
  return NextResponse.json({ ok: true })
}
