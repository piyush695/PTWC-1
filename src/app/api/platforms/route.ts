// src/app/api/platforms/route.ts
// GET /api/platforms  — returns platforms visible to authenticated traders
// Only returns platforms where isActive=true AND isPublic=true
// Credentials are NEVER included in this response
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get the trader's current selection (if any)
  let currentSelection: string | null = null
  if (user.traderId) {
    const sel = await db.traderPlatformSelection.findUnique({
      where: { traderId: user.traderId },
      select: { platformId: true, isConfirmed: true, selectedAt: true },
    })
    currentSelection = sel?.platformId ?? null
  }

  const platforms = await db.tradingPlatform.findMany({
    where:   { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id:              true,
      name:            true,
      type:            true,
      brokerName:      true,
      description:     true,
      serverName:      true,
      websiteUrl:      true,
      supportEmail:    true,
      defaultLeverage: true,
      defaultBalance:  true,
      currency:        true,
      accountPrefix:   true,
      allowedPhases:   true,
      supportedPairs:  true,
      connectionStatus: true,
      isActive:        true,
      // NEVER select: managerPassword, apiKey, apiSecret, apiPassphrase, managerLogin
    },
  })

  return NextResponse.json({
    platforms,
    currentPlatformId: currentSelection,
  })
}
