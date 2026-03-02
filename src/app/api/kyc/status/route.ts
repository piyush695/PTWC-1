// src/app/api/kyc/status/route.ts
// GET /api/kyc/status — returns current KYC record for logged-in trader
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || !user.traderId)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const trader = await db.trader.findUnique({
    where:   { id: user.traderId },
    select:  {
      status: true,
      kycRecord: {
        select: {
          status:           true,
          reviewAnswer:     true,
          reviewRejectType: true,
          rejectLabels:     true,
          clientComment:    true,
          docType:          true,
          docCountry:       true,
          manualDecision:   true,
          manualNote:       true,
          submittedAt:      true,
          completedAt:      true,
          updatedAt:        true,
        }
      }
    }
  })

  if (!trader) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    traderStatus: trader.status,
    kyc: trader.kycRecord ?? { status: 'NOT_STARTED' },
  })
}
