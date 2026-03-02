// src/app/api/admin/traders/[traderId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { traderId: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trader = await db.trader.findUnique({
    where: { id: params.traderId },
    include: {
      country: true, accounts: true, qualifierEntry: true,
      disqualifications: { orderBy: { issuedAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      kycRecord: true, crmRecord: true,
    },
  })
  if (!trader) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ trader })
}
