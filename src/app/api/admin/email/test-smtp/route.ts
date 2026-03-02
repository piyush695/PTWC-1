// src/app/api/admin/email/test-smtp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const smtp = body.smtp || body

    // Load saved config if password is placeholder
    let password = smtp.password
    if (!password || password === '••••••••') {
      const saved = await db.emailConfig.findFirst({ orderBy: { createdAt: 'desc' } })
      password = saved?.password || process.env.SMTP_PASSWORD || ''
    }

    const transporter = nodemailer.createTransport({
      host:   smtp.host   || process.env.SMTP_HOST,
      port:   parseInt(smtp.port || process.env.SMTP_PORT || '587'),
      secure: smtp.secure || false,
      auth: {
        user: smtp.username || smtp.user || process.env.SMTP_USER,
        pass: password,
      },
    })

    await transporter.verify()

    // Update testedAt in DB
    const existing = await db.emailConfig.findFirst({ orderBy: { createdAt: 'desc' } })
    if (existing) {
      await db.emailConfig.update({
        where: { id: existing.id },
        data: { testedAt: new Date(), isActive: true }
      })
    }

    return NextResponse.json({ success: true, message: '✓ SMTP connection verified successfully' })
  } catch (e: any) {
    const msg = e?.message || 'Connection failed'
    return NextResponse.json({
      success: false,
      error: msg.includes('ECONNREFUSED') ? 'Connection refused — check host and port'
           : msg.includes('Invalid login') || msg.includes('535') ? 'Authentication failed — check username and password'
           : msg.includes('ETIMEDOUT') ? 'Connection timed out — check host and firewall'
           : msg
    }, { status: 400 })
  }
}
