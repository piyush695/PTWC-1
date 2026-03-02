// src/app/api/admin/kyc/[traderId]/route.ts
// GET   — full KYC record + Sumsub applicant detail
// PATCH — manual approve / reject / request resubmission
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SUMSUB_BASE   = 'https://api.sumsub.com'
const APP_TOKEN     = process.env.SUMSUB_APP_TOKEN  || ''
const SECRET_KEY    = process.env.SUMSUB_SECRET_KEY || ''

function signRequest(method: string, url: string, ts: number, body?: string) {
  const str = ts + method.toUpperCase() + url + (body || '')
  return crypto.createHmac('sha256', SECRET_KEY).update(str).digest('hex')
}

async function sumsubFetch(method: string, path: string, body?: object) {
  const ts      = Math.floor(Date.now() / 1000)
  const bodyStr = body ? JSON.stringify(body) : ''
  const sig     = signRequest(method, path, ts, bodyStr)
  return fetch(SUMSUB_BASE + path, {
    method,
    headers: {
      'Accept':           'application/json',
      'Content-Type':     'application/json',
      'X-App-Token':      APP_TOKEN,
      'X-App-Access-Sig': sig,
      'X-App-Access-Ts':  String(ts),
    },
    ...(bodyStr ? { body: bodyStr } : {}),
  })
}

export async function GET(req: NextRequest, { params }: { params: { traderId: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const trader = await db.trader.findUnique({
    where:   { id: params.traderId },
    include: { kycRecord: true },
  })
  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  // Fetch live Sumsub data if applicant exists
  let sumsubData: any = null
  if (trader.kycRecord?.sumsubApplicantId && APP_TOKEN) {
    try {
      const r = await sumsubFetch('GET', `/resources/applicants/${trader.kycRecord.sumsubApplicantId}/one`)
      if (r.ok) sumsubData = await r.json()
    } catch {}
  }

  // Fetch Sumsub inspection (document checks)
  let inspectionData: any = null
  if (trader.kycRecord?.sumsubApplicantId && APP_TOKEN) {
    try {
      const r = await sumsubFetch('GET', `/resources/applicants/${trader.kycRecord.sumsubApplicantId}/requiredIdDocsStatus`)
      if (r.ok) inspectionData = await r.json()
    } catch {}
  }

  return NextResponse.json({
    trader: {
      id:          trader.id,
      firstName:   trader.firstName,
      lastName:    trader.lastName,
      email:       trader.email,
      status:      trader.status,
      registeredAt: trader.registeredAt,
    },
    kyc:        trader.kycRecord,
    sumsub:     sumsubData,
    inspection: inspectionData,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { traderId: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, note } = await req.json()
  // action: 'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION' | 'RESET'

  const trader = await db.trader.findUnique({
    where:   { id: params.traderId },
    include: { kycRecord: true },
  })
  if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const kycRecord = trader.kycRecord
  const applicantId = kycRecord?.sumsubApplicantId

  // If Sumsub is configured, also call Sumsub API for formal decision
  if (applicantId && APP_TOKEN) {
    try {
      if (action === 'APPROVE') {
        await sumsubFetch('POST', `/resources/applicants/${applicantId}/status/approve`)
      } else if (action === 'REJECT') {
        await sumsubFetch('POST', `/resources/applicants/${applicantId}/status/reject`, {
          reviewAnswer:     'RED',
          reviewRejectType: 'FINAL',
          moderationComment: note || 'Rejected by admin',
        })
      } else if (action === 'REQUEST_RESUBMISSION') {
        await sumsubFetch('POST', `/resources/applicants/${applicantId}/status/reject`, {
          reviewAnswer:     'RED',
          reviewRejectType: 'RETRY',
          clientComment:    note || 'Please resubmit your documents.',
        })
      } else if (action === 'RESET') {
        await sumsubFetch('POST', `/resources/applicants/${applicantId}/reset`)
      }
    } catch (e) {
      console.error('Sumsub manual action error:', e)
      // Don't fail — still apply manual override locally
    }
  }

  // Map action to statuses
  const statusMap: Record<string, { kycStatus: string; traderStatus: string }> = {
    APPROVE:              { kycStatus: 'APPROVED',                traderStatus: 'KYC_APPROVED' },
    REJECT:               { kycStatus: 'REJECTED',                traderStatus: 'KYC_REJECTED' },
    REQUEST_RESUBMISSION: { kycStatus: 'RESUBMISSION_REQUESTED',  traderStatus: 'KYC_PENDING'  },
    RESET:                { kycStatus: 'NOT_STARTED',             traderStatus: 'REGISTERED'   },
  }

  const statuses = statusMap[action]
  if (!statuses) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Update KYC record
  const updatedKyc = await db.kycRecord.upsert({
    where:  { traderId: params.traderId },
    create: {
      traderId:           params.traderId,
      status:             statuses.kycStatus as any,
      manuallyReviewedBy: user.userId,
      manuallyReviewedAt: new Date(),
      manualDecision:     action,
      manualNote:         note,
      ...(action === 'APPROVE' ? { completedAt: new Date() } : {}),
    },
    update: {
      status:             statuses.kycStatus as any,
      manuallyReviewedBy: user.userId,
      manuallyReviewedAt: new Date(),
      manualDecision:     action,
      manualNote:         note,
      ...(action === 'APPROVE' ? { completedAt: new Date() } : {}),
      updatedAt:          new Date(),
    },
  })

  // Update trader status
  await db.trader.update({
    where: { id: params.traderId },
    data: {
      status: statuses.traderStatus as any,
      ...(action === 'APPROVE' ? {
        kycVerifiedAt: new Date(),
        kycVerifiedBy: user.userId,
      } : {}),
    },
  })

  // Log admin action
  await db.adminLog.create({
    data: {
      userId:     user.userId,
      action:     `KYC_${action}`,
      entityType: 'Trader',
      entityId:   params.traderId,
      details:    note || `Manual KYC ${action.toLowerCase()}`,
    },
  })

  return NextResponse.json({ ok: true, kycRecord: updatedKyc })
}
