// src/app/api/auth/admin-logout/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  // Must use path:'/' to match the cookie path set at login
  res.cookies.set('hp_wc_admin', '', { maxAge: 0, path: '/' })
  return res
}
