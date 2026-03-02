// src/app/api/admin/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTransporter } from '@/lib/emailTransport'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { to, subject, body: bodyText } = await req.json()

    if (!to) return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })

    const transporter = await getTransporter()
    if (!transporter) {
      return NextResponse.json({ error: 'No email provider configured. Set up SMTP or an MTA provider first.' }, { status: 400 })
    }

    const config = await db.emailConfig.findFirst({ orderBy: { createdAt: 'desc' } })
    const fromEmail = config?.fromEmail || process.env.EMAIL_FROM || 'noreply@holaprime.com'
    const fromName  = config?.fromName  || 'Hola Prime World Cup'

    await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to,
      subject: subject || '✅ Test Email — Hola Prime World Cup Admin',
      html: bodyText || `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;max-width:600px;margin:0 auto;border-radius:12px;">
          <h2 style="color:#00d4ff;">✅ Email Configuration Working</h2>
          <p>This is a test email from your <strong>Hola Prime World Cup</strong> admin panel.</p>
          <p style="color:#888;">Sent at: ${new Date().toISOString()}</p>
          <p style="color:#888;">Provider: ${config?.provider || 'SMTP (env)'}</p>
        </div>
      `,
    })

    // Log it
    await db.emailLog.create({
      data: {
        to,
        from: fromEmail,
        subject: subject || 'Test Email',
        body: 'Admin test email',
        template: 'admin-test',
        status: 'SENT',
        sentAt: new Date(),
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
  } catch (e: any) {
    console.error('Test email error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Failed to send test email' }, { status: 500 })
  }
}
