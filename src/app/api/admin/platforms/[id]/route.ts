// src/app/api/admin/platforms/[id]/route.ts
// GET    /api/admin/platforms/:id  — get single (with secrets masked)
// PATCH  /api/admin/platforms/:id  — partial update
// DELETE /api/admin/platforms/:id  — remove platform
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function sanitise(p: any) {
  return {
    ...p,
    managerPassword: p.managerPassword ? '••••••••' : null,
    apiSecret:       p.apiSecret       ? '••••••••' : null,
    apiPassphrase:   p.apiPassphrase   ? '••••••••' : null,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const platform = await db.tradingPlatform.findUnique({
    where: { id: params.id },
    include: { _count: { select: { accounts: true, selections: true } } },
  })
  if (!platform)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ platform: sanitise(platform) })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()

    // Strip masked placeholder values so we don't overwrite real secrets with '••••••••'
    const MASK = '••••••••'
    if (body.managerPassword === MASK) delete body.managerPassword
    if (body.apiSecret       === MASK) delete body.apiSecret
    if (body.apiPassphrase   === MASK) delete body.apiPassphrase

    // Remove non-field keys that shouldn't go to Prisma
    delete body._count
    delete body.id
    delete body.createdAt

    const platform = await db.tradingPlatform.update({
      where: { id: params.id },
      data: { ...body, updatedAt: new Date() },
      include: { _count: { select: { accounts: true, selections: true } } },
    })

    return NextResponse.json({ platform: sanitise(platform) })
  } catch (e: any) {
    if (e.code === 'P2025')
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 })
    console.error('Platform update error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Remove selections first (FK constraint)
    await db.traderPlatformSelection.deleteMany({ where: { platformId: params.id } })
    await db.tradingPlatform.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025')
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 })
    console.error('Platform delete error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
