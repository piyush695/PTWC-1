// src/app/api/admin/traders/[traderId]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { traderId: string } }) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { note } = await req.json()
  if (!note?.trim()) return NextResponse.json({ error: 'Note cannot be empty' }, { status: 400 })

  const newNote = await db.traderNote.create({ data: { traderId: params.traderId, note: note.trim(), author: user.email || 'Admin' } })
  return NextResponse.json({ note: newNote })
}
