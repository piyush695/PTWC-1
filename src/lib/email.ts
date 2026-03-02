// src/lib/email.ts
import { db } from './db'
import { getTransporter, getFromAddress } from './emailTransport'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  traderId?: string
  template?: string
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const log = await db.emailLog.create({
    data: {
      to:       params.to,
      from:     process.env.EMAIL_FROM || 'noreply@worldcup.holaprime.com',
      subject:  params.subject,
      body:     params.html,
      traderId: params.traderId,
      template: params.template,
      status:   'QUEUED',
    },
  })

  try {
    const transporter = await getTransporter()
    if (!transporter) throw new Error('No email provider configured')

    const from = await getFromAddress()

    await transporter.sendMail({
      from,
      to:      params.to,
      subject: params.subject,
      html:    params.html,
    })

    await db.emailLog.update({
      where: { id: log.id },
      data:  { status: 'SENT', sentAt: new Date() },
    })
    return true
  } catch (error) {
    await db.emailLog.update({
      where: { id: log.id },
      data:  { status: 'FAILED', error: String(error) },
    })
    return false
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────

export function templateRegistrationConfirm(params: {
  firstName: string
  displayName: string
  countryName: string
}) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { background: linear-gradient(135deg, #0D2B4E, #00d4ff); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
  .card { background: #1a1a2e; border: 1px solid #2d2d4e; border-radius: 12px; padding: 30px; margin-bottom: 20px; }
  .highlight { color: #00d4ff; font-weight: bold; }
  .btn { display: inline-block; background: #00d4ff; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
  .footer { text-align: center; color: #555; font-size: 12px; margin-top: 30px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>🏆 HOLA PRIME WORLD CUP</h1><p>Prop Trading World Cup 2026</p></div>
    <div class="card">
      <h2>Welcome, ${params.firstName}! 🎉</h2>
      <p>Your registration has been confirmed. You're representing <span class="highlight">${params.countryName}</span>.</p>
      <p><strong>Display name:</strong> <span class="highlight">${params.displayName}</span></p>
      <h3>Next Steps:</h3>
      <ul>
        <li>Complete your <strong>KYC verification</strong> within 48 hours</li>
        <li>Your funded account will be provisioned upon approval</li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
    </div>
    <div class="footer"><p>Hola Prime World Cup 2026</p></div>
  </div>
</body></html>`
}

export function templateKYCApproved(params: { firstName: string; accountNumber: string; accountSize: string }) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { background: linear-gradient(135deg, #1E8449, #00d4ff); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
  .card { background: #1a1a2e; border: 1px solid #2d2d4e; border-radius: 12px; padding: 30px; }
  .highlight { color: #00d4ff; font-weight: bold; }
  .btn { display: inline-block; background: #00d4ff; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>✅ KYC Approved!</h1></div>
    <div class="card">
      <h2>You're cleared to trade, ${params.firstName}!</h2>
      <p><strong>Account:</strong> <span class="highlight">${params.accountNumber}</span></p>
      <p><strong>Balance:</strong> <span class="highlight">$${params.accountSize}</span></p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">View Dashboard →</a>
    </div>
  </div>
</body></html>`
}

export function templateMatchAnnouncement(params: {
  firstName: string; opponentName: string; opponentCountry: string
  phase: string; startDate: string; endDate: string
}) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { background: linear-gradient(135deg, #0D2B4E, #00d4ff); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
  .card { background: #1a1a2e; border: 1px solid #2d2d4e; border-radius: 12px; padding: 30px; }
  .btn { display: inline-block; background: #00d4ff; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>${params.phase}</h1><p>Your match has been drawn!</p></div>
    <div class="card">
      <h2>Get ready, ${params.firstName}!</h2>
      <p>You face <strong>${params.opponentName}</strong> from <strong>${params.opponentCountry}</strong></p>
      <p><strong>Period:</strong> ${params.startDate} — ${params.endDate}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/bracket" class="btn">View Bracket →</a>
    </div>
  </div>
</body></html>`
}

export function templateAdminInvite(params: {
  firstName: string; email: string; password: string; role: string; invitedBy: string; loginUrl: string
}) {
  const roleLabel = params.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #060A14; color: #fff; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #0F1829; border: 1px solid rgba(0,212,255,0.15); border-radius: 12px; padding: 28px; }
  .btn { display: inline-block; background: #00d4ff; color: #000; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 900; margin-top: 20px; }
  .cred { background: rgba(0,0,0,0.4); border: 1px solid rgba(0,212,255,0.15); border-radius: 8px; padding: 16px; font-family: monospace; margin: 16px 0; }
</style></head>
<body>
  <div class="container">
    <div class="card">
      <h2>Welcome, ${params.firstName}! 🛡</h2>
      <p>You have been granted <strong>${roleLabel}</strong> access by <strong>${params.invitedBy}</strong>.</p>
      <div class="cred">
        Email: ${params.email}<br>
        Password: ${params.password}<br>
        Role: ${roleLabel}
      </div>
      <p style="color:rgba(240,192,64,0.9);font-size:13px;">⚠ Change your password immediately after first login.</p>
      <a href="${params.loginUrl}" class="btn">Access Admin Panel →</a>
    </div>
  </div>
</body></html>`
}

export function templateRoleChanged(params: {
  firstName: string; email: string; oldRole: string; newRole: string; changedBy: string
}) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#060A14;color:#fff;padding:40px;">
  <div style="max-width:560px;margin:0 auto;background:#0F1829;border:1px solid rgba(0,212,255,0.15);border-radius:12px;padding:28px;">
    <h2>🔐 Your Role Has Changed</h2>
    <p>Hi <strong>${params.firstName}</strong>, your admin role was updated by <strong>${params.changedBy}</strong>.</p>
    <p>${params.oldRole} → <strong style="color:#00d4ff;">${params.newRole}</strong></p>
    <p style="color:rgba(180,200,235,0.7);font-size:13px;">Changes take effect immediately.</p>
  </div>
</body></html>`
}

export function templatePasswordReset(params: { firstName: string; resetUrl: string; expiresMinutes: number }) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #060a14; font-family: Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #0F1829; border: 1px solid rgba(0,212,255,0.15); border-radius: 16px; padding: 40px; }
  .btn { display: block; padding: 16px; background: #00d4ff; color: #060a14; text-decoration: none; border-radius: 10px; font-weight: 900; text-align: center; margin: 24px 0; }
  .warn { background: rgba(240,192,64,0.08); border: 1px solid rgba(240,192,64,0.2); border-radius: 8px; padding: 12px; font-size: 13px; color: rgba(240,192,64,0.9); }
</style></head>
<body>
  <div class="container">
    <div class="card">
      <div style="text-align:center;margin-bottom:24px;"><div style="font-size:40px;">🔐</div><h1 style="font-size:22px;margin:8px 0;">Reset Your Password</h1></div>
      <p>Hi <strong>${params.firstName}</strong>, click below to reset your password.</p>
      <a href="${params.resetUrl}" class="btn">Reset My Password →</a>
      <div class="warn">⏱ This link expires in <strong>${params.expiresMinutes} minutes</strong></div>
      <p style="font-size:12px;color:rgba(180,200,235,0.5);margin-top:16px;">If you didn't request this, ignore this email.</p>
    </div>
  </div>
</body></html>`
}
