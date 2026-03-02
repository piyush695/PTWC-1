// src/app/api/admin/traders/[traderId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, logAdminAction } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['REGISTERED','KYC_PENDING','KYC_APPROVED','KYC_REJECTED','ACTIVE','DISQUALIFIED','ELIMINATED','FINALIST','CHAMPION']

export async function PATCH(req: NextRequest, { params }: { params: { traderId: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const trader = await db.trader.update({ where: { id: params.traderId }, data: { status } })
  await logAdminAction({ userId: user.id, action: 'TRADER_STATUS_CHANGED', entityType: 'TRADER', entityId: params.traderId, details: `Status changed to ${status}` })
  return NextResponse.json({ trader })
}
