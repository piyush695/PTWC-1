// src/app/api/auth/admin-login/route.ts
// Separate auth endpoint exclusively for admin portal access.
// Only ADMIN and SUPER_ADMIN roles can authenticate here.
// Sets a separate cookie (hp_wc_admin) so admin sessions are
// completely isolated from trader sessions.
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

    const user = await db.user.findUnique({ where: { email } })

    // Generic error message — never reveal whether email exists
    const DENY = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    if (!user || !user.isActive) return DENY

    // Hard block — only admins can use this endpoint
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return DENY

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return DENY

    const token = await signToken({
      userId:   user.id,
      email:    user.email,
      role:     user.role,
      traderId: undefined,
    })

    await db.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    })

    const res = NextResponse.json({
      success: true,
      user: {
        id:    user.id,
        email: user.email,
        role:  user.role,
      },
    })

    // Admin-specific cookie — path '/' so it is sent to /api/* routes too
    res.cookies.set('hp_wc_admin', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',               // must be '/' so /api/admin/* routes receive it
      maxAge:   60 * 60 * 8,       // 8-hour admin session
    })

    return res
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
