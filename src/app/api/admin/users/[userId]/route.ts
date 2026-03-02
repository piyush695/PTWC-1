// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hashPassword } from '@/lib/auth'
import { sendEmail, templateRoleChanged } from '@/lib/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  role:       z.enum(['ADMIN', 'SUPER_ADMIN', 'TRADER']).optional(),
  firstName:  z.string().min(1).optional(),
  lastName:   z.string().min(1).optional(),
  phone:      z.string().optional(),
  department: z.string().optional(),
  notes:      z.string().optional(),
  isActive:   z.boolean().optional(),
  password:   z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const caller = await getAuthUser(req)
  if (!caller || caller.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can update admin users' }, { status: 403 })
  }

  if (params.userId === caller.userId && req.method === 'PATCH') {
    // Allow self-edits for non-role fields only
  }

  const body = await req.json()
  const data = updateSchema.parse(body)

  // Prevent self-demotion
  if (params.userId === caller.userId && data.role && data.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'You cannot demote your own account' }, { status: 400 })
  }

  // Get old role before update (for email notification)
  const existing = await db.user.findUnique({
    where: { id: params.userId },
    select: { role: true, firstName: true, email: true },
  })

  const updateData: any = { ...data }
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password)
    delete updateData.password
  }

  const updated = await db.user.update({
    where: { id: params.userId },
    data: updateData,
    select: {
      id: true, email: true, role: true, firstName: true, lastName: true,
      phone: true, department: true, notes: true, isActive: true, updatedAt: true,
    },
  })

  await db.adminLog.create({
    data: {
      userId:  caller.userId,
      action:  'ADMIN_USER_UPDATED',
      details: JSON.stringify({ targetUserId: params.userId, changes: Object.keys(data) }),
    },
  })

  // Send role-change notification email
  if (data.role && existing && data.role !== existing.role) {
    await sendEmail({
      to:       updated.email,
      subject:  'Your Admin Panel Role Has Been Updated',
      html:     templateRoleChanged({
        firstName: updated.firstName || 'Admin',
        email:     updated.email,
        oldRole:   existing.role,
        newRole:   data.role,
        changedBy: caller.email,
      }),
      template: 'role_changed',
    })
  }

  return NextResponse.json({ user: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const caller = await getAuthUser(req)
  if (!caller || caller.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only Super Admins can remove admin users' }, { status: 403 })
  }

  if (params.userId === caller.userId) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: params.userId },
    data: { isActive: false, role: 'TRADER' },
    select: { id: true, email: true, firstName: true },
  })

  await db.adminLog.create({
    data: {
      userId:  caller.userId,
      action:  'ADMIN_USER_REVOKED',
      details: JSON.stringify({ targetUserId: params.userId, email: updated.email }),
    },
  })

  return NextResponse.json({ success: true })
}
