// src/lib/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { UserRole } from '@prisma/client'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production')

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  traderId?: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Admin cookie takes priority — prevents trader cookies from being used on admin routes
  const adminCookie = req.cookies.get('hp_wc_admin')
  if (adminCookie) return adminCookie.value

  // Trader cookie
  const traderCookie = req.cookies.get('hp_wc_token')
  if (traderCookie) return traderCookie.value

  // Bearer token fallback (API clients)
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  return null
}

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(req)
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null

  // Always do a live DB lookup so role/isActive changes reflect immediately
  // without requiring the user to re-login
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true, email: true },
    })
    if (!user || !user.isActive) return null
    return { ...payload, role: user.role, email: user.email }
  } catch {
    return payload // DB unavailable — fall back to token payload
  }
}

// Middleware factory
export function requireAuth(roles?: UserRole[]) {
  return async (req: NextRequest): Promise<{ user: JWTPayload } | NextResponse> => {
    const user = await getAuthUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (roles && !roles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return { user }
  }
}

export async function logAdminAction(params: {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  details?: string
  ipAddress?: string
}) {
  await db.adminLog.create({ data: params })
}
