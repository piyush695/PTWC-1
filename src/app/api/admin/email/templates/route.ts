// src/app/api/admin/email/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const templates = await db.emailTemplate.findMany({ orderBy: { name: 'asc' } })

    // Seed defaults if empty
    if (templates.length === 0) {
      await db.emailTemplate.createMany({
        data: [
          { slug: 'registration-confirm', name: 'Registration Confirmation', subject: 'Welcome to Hola Prime World Cup 🏆', body: '<p>Hi {{firstName}}, welcome to the tournament!</p>', variables: ['firstName', 'displayName', 'countryName'], isActive: true },
          { slug: 'kyc-approved',         name: 'KYC Approved',             subject: '✅ Your KYC is Approved — Account Ready', body: '<p>Hi {{firstName}}, your KYC is approved!</p>', variables: ['firstName', 'accountNumber', 'accountSize'], isActive: true },
          { slug: 'kyc-rejected',         name: 'KYC Rejected',             subject: '⚠ KYC Verification Issue', body: '<p>Hi {{firstName}}, there was an issue with your KYC.</p>', variables: ['firstName', 'reason'], isActive: true },
          { slug: 'match-announcement',   name: 'Match Announcement',       subject: '⚔️ Your Match Has Been Drawn!', body: '<p>Hi {{firstName}}, you are facing {{opponentName}}!</p>', variables: ['firstName', 'opponentName', 'opponentCountry', 'phase'], isActive: true },
          { slug: 'password-reset',       name: 'Password Reset',           subject: '🔐 Reset Your Password', body: '<p>Hi {{firstName}}, click here to reset: {{resetUrl}}</p>', variables: ['firstName', 'resetUrl'], isActive: true },
          { slug: 'admin-invite',         name: 'Admin Invitation',         subject: '🛡 Admin Panel Access Granted', body: '<p>Hi {{firstName}}, you have been invited as {{role}}.</p>', variables: ['firstName', 'email', 'password', 'role', 'loginUrl'], isActive: true },
        ]
      })
      return NextResponse.json({ templates: await db.emailTemplate.findMany({ orderBy: { name: 'asc' } }) })
    }

    return NextResponse.json({ templates })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id, slug, name, subject, body, variables, isActive } = await req.json()

    if (id) {
      // Update existing
      const template = await db.emailTemplate.update({
        where: { id },
        data: { name, subject, body, variables: variables || [], isActive: isActive ?? true }
      })
      return NextResponse.json({ template })
    } else {
      // Create new
      const template = await db.emailTemplate.create({
        data: {
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          name, subject, body,
          variables: variables || [],
          isActive: isActive ?? true
        }
      })
      return NextResponse.json({ template })
    }
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message || 'Failed to save template' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    await db.emailTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
