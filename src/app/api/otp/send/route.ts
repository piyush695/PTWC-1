// src/app/api/otp/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const schema = z.object({
  purpose: z.enum(['login_2fa', 'email_verify', 'phone_verify', 'withdrawal']),
  channel: z.enum(['email', 'sms']).default('email'),
})

const EXPIRY_MINUTES: Record<string, number> = {
  login_2fa:     10,
  email_verify:  60,
  phone_verify:  10,
  withdrawal:    10,
}

export async function POST(req: NextRequest) {
  try {
    // Get userId from either trader or admin token
    const traderToken = req.cookies.get('hp_wc_token')?.value
    const adminToken  = req.cookies.get('hp_wc_admin')?.value
    const token       = traderToken || adminToken
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { purpose, channel } = schema.parse(await req.json())

    // Rate limit: max 3 OTPs per purpose per 10 minutes
    const recent = await db.oTPCode.count({
      where: {
        userId:    payload.userId,
        purpose,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    })
    if (recent >= 3) {
      return NextResponse.json({ error: 'Too many requests. Wait 10 minutes before trying again.' }, { status: 429 })
    }

    // Invalidate old OTPs for same purpose
    await db.oTPCode.deleteMany({ where: { userId: payload.userId, purpose, usedAt: null } })

    // Generate 6-digit OTP
    const code      = String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, '0')
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES[purpose] * 60 * 1000)

    await db.oTPCode.create({
      data: { userId: payload.userId, code, purpose, channel, expiresAt },
    })

    if (channel === 'email') {
      const user = await db.user.findUnique({ where: { id: payload.userId } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const purposeLabel: Record<string, string> = {
        login_2fa:     'Login Verification',
        email_verify:  'Email Verification',
        phone_verify:  'Phone Verification',
        withdrawal:    'Withdrawal Approval',
      }

      await sendEmail({
        to:       user.email,
        subject:  `🔐 Your Hola Prime Verification Code: ${code}`,
        html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060a14;font-family:Helvetica Neue,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="background:rgba(7,11,22,0.98);border:1px solid rgba(0,212,255,0.15);border-radius:16px;overflow:hidden;">
      <div style="height:3px;background:linear-gradient(90deg,transparent,#00d4ff,#f0c040,transparent);"></div>
      <div style="padding:40px;text-align:center;">
        <div style="font-size:14px;font-weight:900;letter-spacing:0.1em;color:#fff;margin-bottom:4px;">HOLA PRIME WORLD CUP</div>
        <div style="font-size:10px;letter-spacing:0.25em;color:#00d4ff;margin-bottom:28px;">SECURITY CODE</div>
        <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">${purposeLabel[purpose]}</h2>
        <p style="color:rgba(180,200,235,0.7);font-size:14px;margin-bottom:28px;">Your one-time verification code is:</p>
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:12px;padding:20px 32px;display:inline-block;margin-bottom:20px;">
          <div style="font-family:monospace;font-size:40px;font-weight:900;letter-spacing:12px;color:#00d4ff;">${code}</div>
        </div>
        <p style="color:rgba(240,192,64,0.8);font-size:13px;">Expires in <strong>${EXPIRY_MINUTES[purpose]} minutes</strong></p>
        <p style="color:rgba(180,200,235,0.5);font-size:12px;margin-top:16px;">If you didn't request this code, ignore this email.</p>
      </div>
    </div>
  </div>
</body></html>`,
        template: 'otp',
      })
    }
    // SMS channel: integrate with Twilio/Vonage — plug in SMS_API_KEY in env
    else if (channel === 'sms') {
      const smsApiKey = process.env.SMS_API_KEY
      const smsFrom   = process.env.SMS_FROM_NUMBER
      if (smsApiKey && smsFrom) {
        const user = await db.user.findUnique({ where: { id: payload.userId } })
        const trader = user ? await db.trader.findUnique({ where: { userId: user.id }, select: { phone: true } }) : null
        if (trader?.phone) {
          // Vonage/Nexmo
          await fetch('https://rest.nexmo.com/sms/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key:    process.env.SMS_API_KEY,
              api_secret: process.env.SMS_API_SECRET,
              to:         trader.phone.replace(/\D/g, ''),
              from:       smsFrom,
              text:       `Hola Prime World Cup: Your verification code is ${code}. Expires in ${EXPIRY_MINUTES[purpose]} mins.`,
            }),
          })
        }
      }
    }

    return NextResponse.json({ sent: true, expiresIn: EXPIRY_MINUTES[purpose] * 60 })
  } catch (err: any) {
    console.error('OTP send error:', err)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
