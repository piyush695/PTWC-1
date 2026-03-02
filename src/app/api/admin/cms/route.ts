// src/app/api/admin/cms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  coverImage: z.string().url().optional(),
  category: z.enum(['news', 'announcement', 'trader-spotlight', 'results', 'technical']).default('news'),
  tags: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  featured: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user = await getAuthUser(req)
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')

  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const featured = searchParams.get('featured') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (!isAdmin) where.status = 'PUBLISHED'
  else if (status) where.status = status
  if (category) where.category = category
  if (featured) where.featured = true

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        tags: true,
        status: true,
        featured: true,
        authorId: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.post.count({ where }),
  ])

  return NextResponse.json({ posts, pagination: { page, limit, total } })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = postSchema.parse(body)

    const existing = await db.post.findUnique({ where: { slug: data.slug } })
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })

    const post = await db.post.create({
      data: {
        ...data,
        authorId: user.userId,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('id')
  if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  const body = await req.json()
  const data = postSchema.partial().parse(body)

  const post = await db.post.update({
    where: { id: postId },
    data: {
      ...data,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
    },
  })

  return NextResponse.json({ post })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('id')
  if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  await db.post.delete({ where: { id: postId } })
  return NextResponse.json({ success: true })
}
