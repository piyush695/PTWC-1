// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalTraders,
    activeTraders,
    kycPending,
    kycApproved,
    kycRejected,
    disqualified,
    eliminated,
    todayRegistrations,
    weekRegistrations,
    totalCountries,
    totalAccounts,
    activeAccounts,
    totalTrades,
    recentActivity,
    paymentStats,
    emailToday,
  ] = await Promise.all([
    db.trader.count(),
    db.trader.count({ where: { status: 'ACTIVE' } }),
    db.trader.count({ where: { status: 'KYC_PENDING' } }),
    db.trader.count({ where: { status: 'KYC_APPROVED' } }),
    db.trader.count({ where: { status: 'KYC_REJECTED' } }),
    db.trader.count({ where: { status: 'DISQUALIFIED' } }),
    db.trader.count({ where: { status: 'ELIMINATED' } }),
    db.trader.count({ where: { registeredAt: { gte: todayStart } } }),
    db.trader.count({ where: { registeredAt: { gte: weekAgo } } }),
    db.country.count({ where: { traders: { some: {} } } }),
    db.tradingAccount.count(),
    db.tradingAccount.count({ where: { status: 'ACTIVE' } }),
    db.trade.count(),
    db.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { email: true, firstName: true } } } }),
    db.registrationPayment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true }, _count: true }),
    db.emailLog.count({ where: { createdAt: { gte: todayStart } } }),
  ])

  // Registrations per day (last 7 days)
  const regByDay = await db.$queryRaw<{ day: string; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "registeredAt")::date::text as day, COUNT(*) as count
    FROM "Trader"
    WHERE "registeredAt" >= NOW() - INTERVAL '7 days'
    GROUP BY day ORDER BY day ASC
  `.catch(() => [])

  return NextResponse.json({
    traders: { total: totalTraders, active: activeTraders, kycPending, kycApproved, kycRejected, disqualified, eliminated, todayNew: todayRegistrations, weekNew: weekRegistrations },
    countries: { withTraders: totalCountries },
    accounts: { total: totalAccounts, active: activeAccounts },
    trades: { total: totalTrades },
    payments: { revenue: paymentStats._sum.amount || 0, count: paymentStats._count },
    email: { today: emailToday },
    regByDay: regByDay.map(r => ({ day: r.day, count: Number(r.count) })),
    recentActivity: recentActivity.map(l => ({
      id: l.id, action: l.action, entityType: l.entityType, details: l.details,
      email: l.user.email, name: l.user.firstName, createdAt: l.createdAt,
    })),
  })
}
