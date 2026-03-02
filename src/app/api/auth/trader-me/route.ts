// src/app/api/auth/trader-me/route.ts — for trader dashboard
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value
  if (!token) return NextResponse.json({ user: null })

  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ user: null })

  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true,
        trader: {
          include: {
            country: { select: { code:true, name:true, flag:true } },
            accounts: { select: { phase:true, status:true, currentBalance:true, openingBalance:true, maxDrawdown:true, totalTrades:true, accountNumber:true, totalVolumeLots:true } },
            qualifierEntry: { select: { rank:true, returnPct:true, maxDrawdown:true, qualified:true, totalTrades:true, sharpeRatio:true } },
            kycRecord: { select: { status:true, reviewAnswer:true } },
            disqualifications: { select: { reason:true, details:true, issuedAt:true } },
            notifications: { where: { isRead:false }, select: { id:true }, take:1 },
          }
        }
      }
    })

    if (!user || !user.isActive) return NextResponse.json({ user: null })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: { id: payload.userId, email: payload.email, role: payload.role } })
  }
}
