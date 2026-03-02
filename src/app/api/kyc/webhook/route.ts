// src/app/api/kyc/webhook/route.ts
// POST /api/kyc/webhook
//
// Receives Sumsub webhook events and updates KYC + Trader status in DB.
//
// Configure in Sumsub Dashboard → Webhooks:
//   URL: https://yourdomain.com/api/kyc/webhook
//   Secret: set as SUMSUB_WEBHOOK_SECRET env var
//
// Sumsub docs: https://developers.sumsub.com/api-reference/#webhooks

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET || ''

// ── Signature verification ────────────────────────────────────────────────────
function verifySignature(body: string, headerSig: string | null): boolean {
  if (!WEBHOOK_SECRET || !headerSig) return !WEBHOOK_SECRET // allow if no secret set (dev)
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return headerSig === expected
}

// ── Map Sumsub review result to our KycStatus ────────────────────────────────
function mapStatus(event: any): { kycStatus: string; traderStatus: string } {
  const type   = event.type || ''
  const answer = event.reviewResult?.reviewAnswer

  if (type === 'applicantCreated')          return { kycStatus: 'PENDING',     traderStatus: 'KYC_PENDING'  }
  if (type === 'applicantPending')          return { kycStatus: 'PENDING',     traderStatus: 'KYC_PENDING'  }
  if (type === 'applicantReviewPending')    return { kycStatus: 'IN_REVIEW',   traderStatus: 'KYC_PENDING'  }
  if (type === 'applicantPersonalInfoAdded') return { kycStatus: 'PENDING',    traderStatus: 'KYC_PENDING'  }

  if (type === 'applicantReviewed') {
    if (answer === 'GREEN') return { kycStatus: 'APPROVED',  traderStatus: 'KYC_APPROVED' }
    const rejectType = event.reviewResult?.reviewRejectType
    if (rejectType === 'RETRY') return { kycStatus: 'RESUBMISSION_REQUESTED', traderStatus: 'KYC_PENDING' }
    return { kycStatus: 'REJECTED', traderStatus: 'KYC_REJECTED' }
  }

  if (type === 'applicantReset') return { kycStatus: 'NOT_STARTED', traderStatus: 'REGISTERED' }

  return { kycStatus: 'PENDING', traderStatus: 'KYC_PENDING' }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig     = req.headers.get('x-payload-digest') || req.headers.get('x-hmac-digest')

  // Verify signature
  if (!verifySignature(rawBody, sig)) {
    console.warn('Sumsub webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const externalUserId  = event.externalUserId   // = our traderId
  const applicantId     = event.applicantId
  const reviewResult    = event.reviewResult || {}
  const applicantType   = event.applicantType    // 'individual' | 'company'

  console.log(`Sumsub webhook: type=${event.type} traderId=${externalUserId} answer=${reviewResult.reviewAnswer}`)

  if (!externalUserId) {
    // Some events (like test pings) have no externalUserId — ignore
    return NextResponse.json({ ok: true })
  }

  try {
    const trader = await db.trader.findUnique({
      where: { id: externalUserId },
      include: { kycRecord: true },
    })

    if (!trader) {
      console.warn('Sumsub webhook: trader not found', externalUserId)
      return NextResponse.json({ ok: true }) // don't 404 — Sumsub will retry
    }

    const { kycStatus, traderStatus } = mapStatus(event)

    // Extract document info if present
    const idDocs    = event.info?.idDocs?.[0]
    const docType   = idDocs?.idDocType   // PASSPORT / ID_CARD etc.
    const docCountry = idDocs?.country

    // Normalise doc type
    const docTypeMap: Record<string, string> = {
      PASSPORT:         'PASSPORT',
      ID_CARD:          'NATIONAL_ID',
      DRIVERS:          'DRIVING_LICENSE',
      RESIDENCE_PERMIT: 'RESIDENCE_PERMIT',
    }

    // Upsert KYC record
    await db.kycRecord.upsert({
      where:  { traderId: externalUserId },
      create: {
        traderId:          externalUserId,
        sumsubApplicantId: applicantId,
        sumsubExternalId:  externalUserId,
        status:            kycStatus as any,
        reviewAnswer:      reviewResult.reviewAnswer,
        reviewRejectType:  reviewResult.reviewRejectType,
        rejectLabels:      reviewResult.rejectLabels || [],
        reviewComment:     reviewResult.moderationComment,
        clientComment:     reviewResult.clientComment,
        docType:           docTypeMap[docType] as any || undefined,
        docCountry:        docCountry,
        docFirstName:      idDocs?.firstName,
        docLastName:       idDocs?.lastName,
        docDob:            idDocs?.dob,
        docNumber:         idDocs?.number,
        submittedAt:       event.type === 'applicantReviewPending' ? new Date() : undefined,
        completedAt:       ['APPROVED','REJECTED'].includes(kycStatus) ? new Date() : undefined,
      },
      update: {
        sumsubApplicantId: applicantId,
        status:            kycStatus as any,
        reviewAnswer:      reviewResult.reviewAnswer,
        reviewRejectType:  reviewResult.reviewRejectType,
        rejectLabels:      reviewResult.rejectLabels || [],
        reviewComment:     reviewResult.moderationComment,
        clientComment:     reviewResult.clientComment,
        docType:           docTypeMap[docType] as any || undefined,
        docCountry:        docCountry,
        docFirstName:      idDocs?.firstName,
        docLastName:       idDocs?.lastName,
        docDob:            idDocs?.dob,
        docNumber:         idDocs?.number,
        ...(event.type === 'applicantReviewPending' ? { submittedAt: new Date() } : {}),
        ...((['APPROVED','REJECTED'].includes(kycStatus)) ? { completedAt: new Date() } : {}),
        updatedAt:         new Date(),
      },
    })

    // Update trader status
    await db.trader.update({
      where: { id: externalUserId },
      data:  {
        status: traderStatus as any,
        ...(kycStatus === 'APPROVED' ? {
          kycVerifiedAt: new Date(),
        } : {}),
      },
    })

    // Log to webhook log
    await db.webhookLog.create({
      data: {
        source:    'sumsub_kyc',
        event:     event.type,
        payload:   rawBody,
        processed: true,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('KYC webhook error:', e)

    // Still log the failed webhook
    try {
      await db.webhookLog.create({
        data: {
          source:    'sumsub_kyc',
          event:     event.type || 'unknown',
          payload:   rawBody,
          processed: false,
          error:     e.message,
        },
      })
    } catch {}

    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
