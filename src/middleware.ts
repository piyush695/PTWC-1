// src/middleware.ts
// Route protection middleware.
// /admin/* and /api/admin/* require a valid hp_wc_admin cookie (ADMIN or SUPER_ADMIN).
// /dashboard/* requires a valid hp_wc_token cookie (TRADER role).
// Traders are hard-blocked from all admin routes — even with a valid JWT.
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production'
)

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { role?: string; userId?: string; email?: string }
  } catch {
    return null
  }
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Protect /admin/* pages (not /admin-login itself) ─────────────────────
  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')
  // ── Protect /api/admin/* API routes ──────────────────────────────────────
  const isAdminApi  = pathname.startsWith('/api/admin')

  if (isAdminPage || isAdminApi) {
    const adminToken = req.cookies.get('hp_wc_admin')?.value

    if (!adminToken) {
      if (isAdminApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    const payload = await verifyToken(adminToken)

    // Block if token invalid OR role is not admin (catches stale tokens after demotion)
    if (!payload || !ADMIN_ROLES.includes(payload.role || '')) {
      if (isAdminApi) {
        const res = NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
        res.cookies.set('hp_wc_admin', '', { maxAge: 0, path: '/' })
        return res
      }
      const res = NextResponse.redirect(new URL('/admin-login', req.url))
      res.cookies.set('hp_wc_admin', '', { maxAge: 0, path: '/' })
      return res
    }

    // Extra guard: if a trader cookie is also present, ignore it — admin wins
    return NextResponse.next()
  }

  // ── Protect /dashboard/* ─────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const traderToken = req.cookies.get('hp_wc_token')?.value

    if (!traderToken) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const payload = await verifyToken(traderToken)

    if (!payload) {
      const res = NextResponse.redirect(new URL('/login', req.url))
      res.cookies.set('hp_wc_token', '', { maxAge: 0, path: '/' })
      return res
    }

    // Admin accidentally hitting trader dashboard → redirect to admin panel
    if (ADMIN_ROLES.includes(payload.role || '')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Added /api/admin/:path* to the matcher so API routes are also protected
  matcher: ['/admin/:path*', '/admin-login', '/api/admin/:path*', '/dashboard/:path*'],
}
