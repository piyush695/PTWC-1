// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/(?=.*[A-Z])/, 'Uppercase required').regex(/(?=.*[0-9])/, 'Number required'),
})

export async function POST(req: NextRequest) {
  const token = req.cookies.get('hp_wc_token')?.value || req.cookies.get('hp_wc_admin')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  try {
    const { currentPassword, newPassword } = schema.parse(await req.json())
    const user = await db.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hashed = await hashPassword(newPassword)
    await db.user.update({ where: { id: user.id }, data: { passwordHash: hashed } })
    // Invalidate all sessions except current
    await db.session.deleteMany({ where: { userId: user.id, token: { not: token } } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.errors) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
