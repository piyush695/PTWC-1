// src/app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const action = searchParams.get('action')
  const entity = searchParams.get('entity')
  const userId = searchParams.get('userId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (action) where.action = { contains: action, mode: 'insensitive' }
  if (entity) where.entityType = entity
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [logs, total] = await Promise.all([
    db.adminLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, firstName: true, lastName: true, role: true } } },
    }),
    db.adminLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}
