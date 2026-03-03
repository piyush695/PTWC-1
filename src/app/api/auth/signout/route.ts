// src/app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Use the incoming request's host for redirect to avoid wrong-domain cert errors
  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const res = NextResponse.redirect(`${protocol}://${host}/`)
  res.cookies.set('hp_wc_token', '', { maxAge: 0, path: '/' })
  return res
}

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('hp_wc_token', '', { maxAge: 0, path: '/' })
  return res
}
