// src/app/api/admin/cms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const isAdmin = (u: any) => u && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const post = await db.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  return NextResponse.json({ post })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const post = await db.post.update({
      where: { id: params.id },
      data: {
        ...(body.title      !== undefined && { title:      body.title }),
        ...(body.slug       !== undefined && { slug:       body.slug }),
        ...(body.content    !== undefined && { content:    body.content }),
        ...(body.excerpt    !== undefined && { excerpt:    body.excerpt }),
        ...(body.status     !== undefined && { status:     body.status }),
        ...(body.category   !== undefined && { category:   body.category }),
        ...(body.featured   !== undefined && { featured:   body.featured }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.tags       !== undefined && { tags:       body.tags }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ post })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await db.post.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
