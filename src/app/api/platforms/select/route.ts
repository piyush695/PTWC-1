// src/app/api/platforms/select/route.ts
// POST /api/platforms/select  — trader selects / changes their trading platform
// GET  /api/platforms/select  — returns current selection details
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const selectSchema = z.object({
  platformId: z.string().min(1),
  confirm:    z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || !user.traderId)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const selection = await db.traderPlatformSelection.findUnique({
    where: { traderId: user.traderId },
    include: {
      platform: {
        select: {
          id: true, name: true, type: true, brokerName: true,
          serverName: true, description: true, websiteUrl: true,
          supportEmail: true, defaultLeverage: true, defaultBalance: true,
          currency: true, connectionStatus: true,
        }
      }
    }
  })

  return NextResponse.json({ selection })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || !user.traderId)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body  = await req.json()
    const { platformId, confirm } = selectSchema.parse(body)

    // Verify platform exists and is active + public
    const platform = await db.tradingPlatform.findFirst({
      where: { id: platformId, isActive: true, isPublic: true }
    })
    if (!platform)
      return NextResponse.json({ error: 'Platform not available' }, { status: 404 })

    // Check if trader already has a confirmed selection — prevent changes during competition
    const existing = await db.traderPlatformSelection.findUnique({
      where: { traderId: user.traderId }
    })
    if (existing?.isConfirmed && existing.platformId !== platformId) {
      return NextResponse.json({
        error: 'Your platform selection has been confirmed and cannot be changed once trading has started. Contact support if you need assistance.',
        code:  'SELECTION_LOCKED',
      }, { status: 409 })
    }

    // Upsert the selection
    const selection = await db.traderPlatformSelection.upsert({
      where:  { traderId: user.traderId },
      create: {
        traderId:    user.traderId,
        platformId:  platformId,
        isConfirmed: confirm ?? false,
        confirmedAt: confirm ? new Date() : null,
      },
      update: {
        platformId:  platformId,
        isConfirmed: confirm ?? false,
        confirmedAt: confirm ? new Date() : null,
        selectedAt:  new Date(),
      },
      include: {
        platform: {
          select: {
            id: true, name: true, type: true, brokerName: true,
            serverName: true, description: true, connectionStatus: true,
          }
        }
      }
    })

    return NextResponse.json({ selection, message: confirm ? 'Platform confirmed!' : 'Platform selected' })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    console.error('Platform select error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
