// src/app/api/admin/countries/route.ts
// GET  — list all countries with eligibility status
// POST — bulk upsert countries (seed)
// PATCH — toggle eligibility for one or all countries
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALL_COUNTRIES = [
  { code:'AE', name:'UAE',            region:'Middle East' },
  { code:'AU', name:'Australia',      region:'Asia Pacific' },
  { code:'AR', name:'Argentina',      region:'Latin America' },
  { code:'BR', name:'Brazil',         region:'Latin America' },
  { code:'CA', name:'Canada',         region:'North America' },
  { code:'DE', name:'Germany',        region:'Europe' },
  { code:'EG', name:'Egypt',          region:'Africa' },
  { code:'ES', name:'Spain',          region:'Europe' },
  { code:'FR', name:'France',         region:'Europe' },
  { code:'GB', name:'United Kingdom', region:'Europe' },
  { code:'GH', name:'Ghana',          region:'Africa' },
  { code:'ID', name:'Indonesia',      region:'Asia Pacific' },
  { code:'IN', name:'India',          region:'Asia Pacific' },
  { code:'IT', name:'Italy',          region:'Europe' },
  { code:'JP', name:'Japan',          region:'Asia Pacific' },
  { code:'KE', name:'Kenya',          region:'Africa' },
  { code:'KW', name:'Kuwait',         region:'Middle East' },
  { code:'MX', name:'Mexico',         region:'Latin America' },
  { code:'MY', name:'Malaysia',       region:'Asia Pacific' },
  { code:'NG', name:'Nigeria',        region:'Africa' },
  { code:'NL', name:'Netherlands',    region:'Europe' },
  { code:'PH', name:'Philippines',    region:'Asia Pacific' },
  { code:'PK', name:'Pakistan',       region:'Asia Pacific' },
  { code:'QA', name:'Qatar',          region:'Middle East' },
  { code:'RU', name:'Russia',         region:'Europe' },
  { code:'SA', name:'Saudi Arabia',   region:'Middle East' },
  { code:'SG', name:'Singapore',      region:'Asia Pacific' },
  { code:'TH', name:'Thailand',       region:'Asia Pacific' },
  { code:'TR', name:'Turkey',         region:'Europe' },
  { code:'TZ', name:'Tanzania',       region:'Africa' },
  { code:'VN', name:'Vietnam',        region:'Asia Pacific' },
  { code:'ZA', name:'South Africa',   region:'Africa' },
]

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Auto-seed if empty
    const existing = await db.country.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] })

    if (existing.length === 0) {
      await db.country.createMany({
        data: ALL_COUNTRIES.map(c => ({ ...c, flag: '', isEligible: true })),
        skipDuplicates: true,
      })
      const seeded = await db.country.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] })
      return NextResponse.json({ countries: seeded })
    }

    return NextResponse.json({ countries: existing })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to load countries' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Only Super Admins can change country eligibility' }, { status: 403 })

  try {
    const body = await req.json()

    // Toggle single country: { code, isEligible }
    if (body.code) {
      const updated = await db.country.update({
        where: { code: body.code },
        data:  { isEligible: body.isEligible },
      })

      await db.adminLog.create({
        data: {
          userId:     user.userId,
          action:     body.isEligible ? 'COUNTRY_ENABLED' : 'COUNTRY_DISABLED',
          entityType: 'Country',
          entityId:   body.code,
          details:    `${body.isEligible ? 'Enabled' : 'Disabled'} ${body.code} for tournament registration`,
        }
      }).catch(() => {})

      return NextResponse.json({ country: updated })
    }

    // Bulk: { enableAll: true } or { disableAll: true }
    if (body.enableAll) {
      await db.country.updateMany({ data: { isEligible: true } })
      return NextResponse.json({ updated: 'all enabled' })
    }
    if (body.disableAll) {
      await db.country.updateMany({ data: { isEligible: false } })
      return NextResponse.json({ updated: 'all disabled' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
}
