// src/app/api/admin/payment/recent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payments = await db.registrationPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take:    50,
    select:  { id:true, email:true, amount:true, currency:true, provider:true, status:true, paidAt:true, createdAt:true, providerRef:true, traderId:true },
  })

  const stats = {
    total:     await db.registrationPayment.count(),
    completed: await db.registrationPayment.count({ where: { status:'COMPLETED' } }),
    pending:   await db.registrationPayment.count({ where: { status:'PENDING'   } }),
    revenue:   await db.registrationPayment.aggregate({ where:{ status:'COMPLETED' }, _sum:{ amount:true } }),
  }

  return NextResponse.json({ payments, stats })
}
