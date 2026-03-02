// src/app/api/admin/email/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTransporter, getFromAddress } from '@/lib/emailTransport'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { subject, body, segment, templateSlug } = await req.json()

    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    const transporter = await getTransporter()
    if (!transporter) {
      return NextResponse.json({
        error: 'No email provider configured. Go to Admin → Email → SMTP Config or MTA Providers to set one up first.'
      }, { status: 400 })
    }

    // Build recipient list based on segment
    const where: any = { user: { isActive: true } }
    if (segment === 'KYC_PENDING')   where.status = 'KYC_PENDING'
    if (segment === 'KYC_APPROVED')  where.status = 'KYC_APPROVED'
    if (segment === 'ACTIVE')        where.status = 'ACTIVE'
    if (segment === 'DISQUALIFIED')  where.status = 'DISQUALIFIED'
    // 'ALL' = no filter

    const traders = await db.trader.findMany({
      where,
      include: { user: { select: { email: true, firstName: true } } },
      take: 500, // safety cap
    })

    const from    = await getFromAddress()
    let sent = 0, failed = 0

    for (const trader of traders) {
      if (!trader.user?.email) continue
      try {
        // Replace template variables
        let html = body
          .replace(/{{firstName}}/g, trader.user.firstName || 'Trader')
          .replace(/{{displayName}}/g, trader.displayName || '')
          .replace(/{{appUrl}}/g, process.env.NEXT_PUBLIC_APP_URL || '')

        await transporter.sendMail({ from, to: trader.user.email, subject, html })

        await db.emailLog.create({
          data: {
            to: trader.user.email, from,
            subject, body: html,
            template: templateSlug || 'bulk-campaign',
            traderId: trader.id,
            status: 'SENT', sentAt: new Date(),
          }
        }).catch(() => {})

        sent++
      } catch {
        failed++
        await db.emailLog.create({
          data: {
            to: trader.user.email, from,
            subject, body,
            template: templateSlug || 'bulk-campaign',
            traderId: trader.id,
            status: 'FAILED',
          }
        }).catch(() => {})
      }
    }

    await db.adminLog.create({
      data: {
        userId: admin.userId!,
        action: 'SEND_BULK_EMAIL',
        entityType: 'EmailCampaign',
        details: `Sent "${subject}" to ${sent} traders (${failed} failed). Segment: ${segment || 'ALL'}`,
      }
    }).catch(() => {})

    return NextResponse.json({ sent, success: true, failed, total: traders.length })
  } catch (e: any) {
    console.error('Bulk email error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to send emails' }, { status: 500 })
  }
}
