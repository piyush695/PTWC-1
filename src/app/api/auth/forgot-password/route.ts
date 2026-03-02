// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail, templatePasswordReset } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })
const EXPIRES_MINUTES = 30

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json())

    // Always return success — never reveal whether email exists (security)
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user || !user.isActive) {
      // Still return 200 to prevent email enumeration
      return NextResponse.json({ success: true })
    }

    // Invalidate any existing tokens for this user
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } })

    // Generate a cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000)

    await db.passwordResetToken.create({
      data: {
        userId:    user.id,
        token:     rawToken,
        expiresAt,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      },
    })

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

    // Get first name — check trader record too
    const trader = await db.trader.findUnique({ where: { userId: user.id }, select: { firstName: true } })
    const firstName = user.firstName || trader?.firstName || email.split('@')[0]

    await sendEmail({
      to:       email,
      subject:  '🔐 Reset Your Hola Prime World Cup Password',
      html:     templatePasswordReset({ firstName, resetUrl, expiresMinutes: EXPIRES_MINUTES }),
      template: 'password_reset',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('forgot-password error:', err)
    // Return success even on error to prevent enumeration
    return NextResponse.json({ success: true })
  }
}
