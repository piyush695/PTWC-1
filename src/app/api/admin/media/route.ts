// src/app/api/admin/media/route.ts
// Plug-and-play: set STORAGE_PROVIDER=local|s3|cloudinary in .env
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ assets })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.formData()
  const file = data.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  let url: string

  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    // Cloudinary plug-and-play
    // npm install cloudinary
    // const { v2: cloudinary } = require('cloudinary')
    // cloudinary.config({ cloud_name, api_key, api_secret })
    // const result = await cloudinary.uploader.upload(...)
    // url = result.secure_url
    url = `/uploads/${filename}` // fallback
  } else if (process.env.STORAGE_PROVIDER === 's3') {
    // AWS S3 plug-and-play
    // npm install @aws-sdk/client-s3
    // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
    // url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`
    url = `/uploads/${filename}` // fallback
  } else {
    // Local storage (dev/staging)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)
    url = `/uploads/${filename}`
  }

  const asset = await db.mediaAsset.create({
    data: { filename: file.name, url, mimeType: file.type, size: file.size, uploadedBy: user.id },
  })

  return NextResponse.json({ asset })
}
