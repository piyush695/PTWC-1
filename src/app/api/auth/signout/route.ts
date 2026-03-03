// src/app/api/auth/signout/route.ts
// Clears trader session cookie and redirects to home
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  )
  res.cookies.set('hp_wc_token', '', { maxAge: 0, path: '/' })
  return res
}

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('hp_wc_token', '', { maxAge: 0, path: '/' })
  return res
}
