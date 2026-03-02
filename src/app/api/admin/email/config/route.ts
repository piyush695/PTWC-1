// src/app/api/admin/email/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const config = await db.emailConfig.findFirst({ orderBy: { createdAt: 'desc' } })

    // Also return env-based config as fallback/reference
    const envSmtp = {
      host:     process.env.SMTP_HOST     || '',
      port:     process.env.SMTP_PORT     || '587',
      secure:   false,
      username: process.env.SMTP_USER     || '',
      password: process.env.SMTP_PASSWORD ? '••••••••' : '',
      fromEmail:process.env.EMAIL_FROM    || '',
    }

    return NextResponse.json({
      config: config ? {
        provider:   config.provider,
        host:       config.host       || '',
        port:       String(config.port || 587),
        secure:     config.secure,
        username:   config.username   || '',
        password:   config.password   ? '••••••••' : '',
        fromEmail:  config.fromEmail  || '',
        fromName:   config.fromName   || '',
        credentials:config.credentials || {},
        isActive:   config.isActive,
        testedAt:   config.testedAt,
      } : null,
      envSmtp,
      source: config ? 'database' : 'env',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const existing = await db.emailConfig.findFirst({ orderBy: { createdAt: 'desc' } })

    // Build update data — don't overwrite password if placeholder sent
    const isSmtp = !body.provider || body.provider === 'smtp'

    const data: any = {
      provider:  body.provider  || 'smtp',
      fromEmail: body.fromEmail || body.smtp?.fromEmail || '',
      fromName:  body.fromName  || 'Hola Prime World Cup',
      isActive:  true,
    }

    if (isSmtp || body.smtp) {
      const smtp = body.smtp || body
      data.host   = smtp.host   || ''
      data.port   = parseInt(smtp.port || '587')
      data.secure = smtp.secure || false
      data.username = smtp.username || smtp.user || ''
      // Only update password if not placeholder
      if (smtp.password && smtp.password !== '••••••••') {
        data.password = smtp.password
      }
    } else {
      // API-key based provider (sendgrid, mailgun etc)
      data.credentials = body.credentials || {}
    }

    let config
    if (existing) {
      config = await db.emailConfig.update({ where: { id: existing.id }, data })
    } else {
      config = await db.emailConfig.create({ data })
    }

    await db.adminLog.create({
      data: {
        userId: admin.userId!,
        action: 'UPDATE_EMAIL_CONFIG',
        entityType: 'EmailConfig',
        entityId: config.id,
        details: `Updated email provider: ${data.provider}`,
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, provider: data.provider })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
