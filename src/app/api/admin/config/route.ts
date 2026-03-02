// src/app/api/admin/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const configSchema = z.object({
  registrationOpen: z.boolean().optional(),
  registrationDeadline: z.string().optional(),
  qualifierStart: z.string().optional(),
  qualifierEnd: z.string().optional(),
  grandFinalDate: z.string().optional(),
  totalPrizePool: z.number().positive().optional(),
  firstPrize: z.number().positive().optional(),
  secondPrize: z.number().positive().optional(),
  qualifierAccountSize: z.number().positive().optional(),
  knockoutAccountSize: z.number().positive().optional(),
  maxLeverage: z.number().int().min(1).max(500).optional(),
  dailyDrawdownPct: z.number().min(1).max(100).optional(),
  totalDrawdownPct: z.number().min(1).max(100).optional(),
  minTradesPerRound: z.number().int().min(1).optional(),
  maxPositionSizePct: z.number().min(0.1).max(100).optional(),
  allowedInstruments: z.array(z.string()).optional(),
  currentPhase: z.enum(['REGISTRATION','QUALIFIER','ROUND_OF_32','ROUND_OF_16','QUARTERFINAL','SEMIFINAL','GRAND_FINAL','COMPLETED']).optional(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await db.tournamentConfig.findFirst()
  return NextResponse.json({ config })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can update config' }, { status: 403 })
  }

  const body = await req.json()
  const data = configSchema.parse(body)

  const update: any = { ...data, updatedBy: user.email }
  if (data.registrationDeadline) update.registrationDeadline = new Date(data.registrationDeadline)
  if (data.qualifierStart) update.qualifierStart = new Date(data.qualifierStart)
  if (data.qualifierEnd) update.qualifierEnd = new Date(data.qualifierEnd)
  if (data.grandFinalDate) update.grandFinalDate = new Date(data.grandFinalDate)

  const config = await db.tournamentConfig.upsert({
    where: { id: (await db.tournamentConfig.findFirst())?.id || 'new' },
    update,
    create: {
      totalPrizePool: 100000,
      firstPrize: 60000,
      secondPrize: 25000,
      ...update,
    },
  })

  await db.adminLog.create({
    data: {
      userId: user.userId,
      action: 'CONFIG_UPDATED',
      details: JSON.stringify(data),
    },
  })

  return NextResponse.json({ config })
}
