// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET — validate token (used by reset page on load to show/hide the form)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, error: 'No token provided' })

  const record = await db.passwordResetToken.findUnique({ where: { token } })
  if (!record)                          return NextResponse.json({ valid: false, error: 'Invalid or expired link' })
  if (record.usedAt)                    return NextResponse.json({ valid: false, error: 'This link has already been used' })
  if (record.expiresAt < new Date())    return NextResponse.json({ valid: false, error: 'This link has expired. Please request a new one.' })

  return NextResponse.json({ valid: true })
}

// POST — set new password
const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).regex(/(?=.*[A-Z])/, 'Must contain uppercase').regex(/(?=.*[0-9])/, 'Must contain number'),
})

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json())

    const record = await db.passwordResetToken.findUnique({
      where:   { token },
      include: { user: true },
    } as any)

    if (!record)                       return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    if ((record as any).usedAt)        return NextResponse.json({ error: 'This link has already been used' }, { status: 400 })
    if ((record as any).expiresAt < new Date()) return NextResponse.json({ error: 'Link has expired. Request a new one.' }, { status: 400 })

    const hashed = await hashPassword(password)

    // Update password and mark token as used in a transaction
    await db.$transaction([
      db.user.update({
        where: { id: (record as any).userId },
        data:  { passwordHash: hashed },
      }),
      db.passwordResetToken.update({
        where: { token },
        data:  { usedAt: new Date() },
      }),
      // Invalidate all active sessions for security
      db.session.deleteMany({ where: { userId: (record as any).userId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.errors) return NextResponse.json({ error: err.errors[0]?.message || 'Invalid input' }, { status: 400 })
    console.error('reset-password error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
