// src/app/api/kyc/token/route.ts
// POST /api/kyc/token
//
// Generates a Sumsub SDK access token for the currently authenticated trader.
// The WebSDK uses this token to initialise the embedded KYC flow in the browser.
//
// Sumsub docs: https://developers.sumsub.com/api-reference/#creating-an-access-token
//
// Required env vars:
//   SUMSUB_APP_TOKEN   — your Sumsub app token (API key)
//   SUMSUB_SECRET_KEY  — your Sumsub secret key
//   SUMSUB_LEVEL_NAME  — verification level name (default: "basic-kyc-level")
//   NEXT_PUBLIC_SUMSUB_LEVEL_NAME — same, but exposed to client for display

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SUMSUB_BASE = 'https://api.sumsub.com'
const APP_TOKEN   = process.env.SUMSUB_APP_TOKEN   || ''
const SECRET_KEY  = process.env.SUMSUB_SECRET_KEY  || ''
const LEVEL_NAME  = process.env.SUMSUB_LEVEL_NAME  || 'basic-kyc-level'

// ── Sumsub HMAC request signing ──────────────────────────────────────────────
function signRequest(
  method: string,
  url: string,
  ts: number,
  body?: string,
): string {
  const str = ts + method.toUpperCase() + url + (body || '')
  return crypto.createHmac('sha256', SECRET_KEY).update(str).digest('hex')
}

async function sumsubFetch(method: string, path: string, body?: object) {
  const ts      = Math.floor(Date.now() / 1000)
  const bodyStr = body ? JSON.stringify(body) : ''
  const sig     = signRequest(method, path, ts, bodyStr)

  const res = await fetch(SUMSUB_BASE + path, {
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

  return res
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const user = await getAuthUser(req)
  if (!user || !user.traderId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!APP_TOKEN || !SECRET_KEY) {
    // Dev / demo mode — return a mock token so the UI still renders
    return NextResponse.json({
      token: 'demo_token_configure_sumsub_env_vars',
      userId: user.traderId,
      levelName: LEVEL_NAME,
      demo: true,
    })
  }

  try {
    const trader = await db.trader.findUnique({
      where: { id: user.traderId },
      include: { kycRecord: true },
    })
    if (!trader) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

    // 2. Ensure applicant exists in Sumsub
    let applicantId = trader.kycRecord?.sumsubApplicantId

    if (!applicantId) {
      // Create applicant
      const createRes = await sumsubFetch('POST', '/resources/applicants?levelName=' + LEVEL_NAME, {
        externalUserId: user.traderId,
        info: {
          firstName: trader.firstName,
          lastName:  trader.lastName,
          country:   trader.nationality || undefined,
        },
      })
      if (!createRes.ok) {
        const err = await createRes.text()
        console.error('Sumsub create applicant failed:', err)
        return NextResponse.json({ error: 'Failed to create KYC applicant' }, { status: 502 })
      }
      const applicantData = await createRes.json()
      applicantId = applicantData.id

      // Upsert KYC record
      await db.kycRecord.upsert({
        where:  { traderId: user.traderId },
        create: {
          traderId:           user.traderId,
          sumsubApplicantId:  applicantId!,
          sumsubExternalId:   user.traderId,
          status:             'PENDING',
          sdkStartedAt:       new Date(),
        },
        update: {
          sumsubApplicantId:  applicantId!,
          sumsubExternalId:   user.traderId,
          status:             'PENDING',
          sdkStartedAt:       new Date(),
        },
      })
    }

    // 3. Generate SDK token (TTL = 10 minutes)
    const tokenRes = await sumsubFetch(
      'POST',
      `/resources/accessTokens?userId=${encodeURIComponent(user.traderId)}&levelName=${encodeURIComponent(LEVEL_NAME)}&ttlInSecs=600`,
    )
    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Sumsub token failed:', err)
      return NextResponse.json({ error: 'Failed to generate KYC token' }, { status: 502 })
    }
    const tokenData = await tokenRes.json()

    return NextResponse.json({
      token:      tokenData.token,
      userId:     user.traderId,
      levelName:  LEVEL_NAME,
      applicantId,
    })
  } catch (e: any) {
    console.error('KYC token error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
