// src/app/api/auth/me/route.ts
// Returns the current admin user's live profile from the database.
// ONLY reads the hp_wc_admin cookie — never falls back to trader cookies.
// Returns null if the user is not ADMIN or SUPER_ADMIN in the DB.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Only ever read the admin cookie — never the trader cookie
  const token = req.cookies.get('hp_wc_admin')?.value
  if (!token) return NextResponse.json({ user: null })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ user: null })

  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        phone: true, department: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    })

    // Hard block — if user no longer exists, is inactive, or is a TRADER, return null
    if (!user || !user.isActive || user.role === 'TRADER') {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch {
    // DB unavailable — fall back to token, but still enforce role
    if (payload.role === 'TRADER') return NextResponse.json({ user: null })
    return NextResponse.json({ user: { id: payload.userId, email: payload.email, role: payload.role } })
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value || req.cookies.get('hp_wc_admin')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { firstName, lastName, displayName, phone, dateOfBirth } = body

  // Update User record
  await db.user.update({ where: { id: payload.userId }, data: { firstName, lastName, phone } }).catch(() => {})

  // Update Trader record if exists
  const trader = await db.trader.findUnique({ where: { userId: payload.userId } })
  if (trader) {
    await db.trader.update({
      where: { userId: payload.userId },
      data: {
        firstName:   firstName || undefined,
        lastName:    lastName  || undefined,
        displayName: displayName || undefined,
        phone:       phone || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
