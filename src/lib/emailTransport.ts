// src/lib/emailTransport.ts
// Shared helper — builds nodemailer transporter from DB config or env vars
import nodemailer from 'nodemailer'
import { db } from './db'

export async function getTransporter() {
  // Try DB config first
  const config = await db.emailConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => null)

  if (config?.provider === 'sendgrid') {
    const apiKey = (config.credentials as any)?.apiKey
    if (apiKey) {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: { user: 'apikey', pass: apiKey },
      })
    }
  }

  if (config?.provider === 'mailgun') {
    const creds = config.credentials as any
    if (creds?.apiKey && creds?.domain) {
      return nodemailer.createTransport({
        host: `smtp.mailgun.org`,
        port: 587,
        secure: false,
        auth: { user: `postmaster@${creds.domain}`, pass: creds.apiKey },
      })
    }
  }

  if (config?.provider === 'postmark') {
    const token = (config.credentials as any)?.serverToken
    if (token) {
      return nodemailer.createTransport({
        host: 'smtp.postmarkapp.com',
        port: 587,
        secure: false,
        auth: { user: token, pass: token },
      })
    }
  }

  if (config?.provider === 'smtp2go') {
    const creds = config.credentials as any
    if (creds?.username && creds?.password) {
      return nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 587,
        secure: false,
        auth: { user: creds.username, pass: creds.password },
      })
    }
  }

  // SMTP (custom or saved in DB)
  if (config?.host && config?.username && config?.password) {
    return nodemailer.createTransport({
      host:   config.host,
      port:   config.port || 587,
      secure: config.secure,
      auth: { user: config.username, pass: config.password },
    })
  }

  // Fall back to env vars
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  return null
}

export async function getFromAddress() {
  const config = await db.emailConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => null)

  const email = config?.fromEmail || process.env.EMAIL_FROM || 'noreply@holaprime.com'
  const name  = config?.fromName  || 'Hola Prime World Cup'
  return `"${name}" <${email}>`
}
