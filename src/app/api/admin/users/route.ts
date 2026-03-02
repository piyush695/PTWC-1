// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'
import { sendEmail, templateAdminInvite } from '@/lib/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ── GET — list all admin users ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      phone: true, department: true, notes: true,
      isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ users })
}

// ── POST — create a new admin user + send invite email ────────────────────
const createSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8),
  role:       z.enum(['ADMIN', 'SUPER_ADMIN']),
  firstName:  z.string().min(1),
  lastName:   z.string().min(1),
  phone:      z.string().optional(),
  department: z.string().optional(),
  notes:      z.string().optional(),
  sendInvite: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const caller = await getAuthUser(req)
  if (!caller || caller.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can create admin users' }, { status: 403 })
  }

  const body = await req.json()
  const data = createSchema.parse(body)

  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await hashPassword(data.password)
  const newUser = await db.user.create({
    data: {
      email:      data.email,
      passwordHash,
      role:       data.role,
      firstName:  data.firstName,
      lastName:   data.lastName,
      phone:      data.phone,
      department: data.department,
      notes:      data.notes,
      isActive:   true,
    },
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      phone: true, department: true, notes: true,
      isActive: true, createdAt: true,
    },
  })

  await db.adminLog.create({
    data: {
      userId:  caller.userId,
      action:  'ADMIN_USER_CREATED',
      details: JSON.stringify({ newUserId: newUser.id, email: newUser.email, role: newUser.role }),
    },
  })

  // Send invite email if requested
  let emailSent = false
  let emailError = ''
  if (data.sendInvite) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin-login`
    const result = await sendEmail({
      to:       data.email,
      subject:  `You've been invited to the Hola Prime Admin Panel`,
      html:     templateAdminInvite({
        firstName:  data.firstName,
        email:      data.email,
        password:   data.password,
        role:       data.role,
        invitedBy:  caller.email,
        loginUrl,
      }),
      template: 'admin_invite',
    })
    emailSent  = result.sent
    emailError = result.error || ''
  }

  return NextResponse.json({ user: newUser, emailSent, emailError })
}
