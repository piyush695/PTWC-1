// src/app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  code:    z.string().length(6),
  purpose: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const traderToken = req.cookies.get('hp_wc_token')?.value
    const adminToken  = req.cookies.get('hp_wc_admin')?.value
    const token       = traderToken || adminToken
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { code, purpose } = schema.parse(await req.json())

    const otp = await db.oTPCode.findFirst({
      where: {
        userId:  payload.userId,
        purpose,
        usedAt:  null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return NextResponse.json({ valid: false, error: 'Code not found or expired. Request a new code.' }, { status: 400 })
    }

    // Increment attempt counter
    await db.oTPCode.update({
      where: { id: otp.id },
      data:  { attempts: { increment: 1 } },
    })

    // Max 5 attempts
    if (otp.attempts >= 5) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } })
      return NextResponse.json({ valid: false, error: 'Too many attempts. Request a new code.' }, { status: 429 })
    }

    if (otp.code !== code) {
      return NextResponse.json({ valid: false, error: `Incorrect code. ${4 - otp.attempts} attempts remaining.` }, { status: 400 })
    }

    // Mark as used
    await db.oTPCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } })

    return NextResponse.json({ valid: true })
  } catch (err: any) {
    console.error('OTP verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
