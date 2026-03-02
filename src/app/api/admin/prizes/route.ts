// src/app/api/admin/prizes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { DEFAULT_PRIZES } from '@/app/api/prizes/route'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ── GET — load all prize tiers for admin panel ─────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await db.prizeTier.findMany({
      orderBy: { position: 'asc' },
    })

    // If DB is empty, return defaults so admin can see/edit them
    if (rows.length === 0) {
      return NextResponse.json({ prizes: DEFAULT_PRIZES })
    }

    return NextResponse.json({ prizes: rows })
  } catch {
    return NextResponse.json({ prizes: DEFAULT_PRIZES })
  }
}

// ── PATCH — bulk upsert all prize tiers ───────────────────────────────────
const tierSchema = z.object({
  key:      z.string().min(1),
  label:    z.string().min(1),
  prize:    z.string().min(1),   // free-form: "$60,000" or "Funded Account" or "Trophy"
  position: z.number().int().min(1),
})

const bodySchema = z.object({
  prizes: z.array(tierSchema),
})

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { prizes } = bodySchema.parse(body)

  // Upsert every tier in a transaction
  await db.$transaction(
    prizes.map(p =>
      db.prizeTier.upsert({
        where:  { key: p.key },
        update: { label: p.label, prize: p.prize, position: p.position, isActive: true, updatedBy: user.email },
        create: { key: p.key, label: p.label, prize: p.prize, position: p.position, isActive: true, updatedBy: user.email },
      })
    )
  )

  await db.adminLog.create({
    data: {
      userId:  user.userId,
      action:  'PRIZES_UPDATED',
      details: JSON.stringify({ updatedBy: user.email, count: prizes.length }),
    },
  })

  const updated = await db.prizeTier.findMany({ orderBy: { position: 'asc' } })
  return NextResponse.json({ prizes: updated, saved: true })
}
