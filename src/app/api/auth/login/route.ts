// src/app/api/auth/login/route.ts  — TRADER login only
// Admin accounts are blocked here; they must use /api/auth/admin-login
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = schema.parse(body)

    const user = await db.user.findUnique({
      where:   { email },
      include: { trader: { select: { id: true } } },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Admins must use the separate admin portal login
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin accounts must sign in at the admin portal.', redirectTo: '/admin-login' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      traderId: user.trader?.id,
    })

    await db.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    })

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role, traderId: user.trader?.id },
    })

    res.cookies.set('hp_wc_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 days
    })

    return res
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
