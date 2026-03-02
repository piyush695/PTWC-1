// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  subject:  z.string().min(1).max(200),
  message:  z.string().min(10).max(5000),
  category: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const to = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'support@holaprime.com'

    await sendEmail({
      to,
      subject: `[Contact: ${body.category || 'general'}] ${body.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${body.name} &lt;${body.email}&gt;</p>
        <p><strong>Category:</strong> ${body.category}</p>
        <p><strong>Subject:</strong> ${body.subject}</p>
        <hr/>
        <p>${body.message.replace(/\n/g, '<br/>')}</p>
      `,
    })

    // Also send confirmation to the user
    await sendEmail({
      to: body.email,
      subject: 'We received your message — Hola Prime World Cup',
      html: `
        <p>Hi ${body.name},</p>
        <p>Thanks for reaching out. We've received your message and will get back to you shortly.</p>
        <p><strong>Your message:</strong><br/>${body.message.replace(/\n/g, '<br/>')}</p>
        <br/><p>— Hola Prime Support Team</p>
      `,
    }).catch(() => {}) // Non-fatal if confirmation fails

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.errors) return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 })
    console.error('Contact form error:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
