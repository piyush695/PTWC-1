'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/email/page.tsx
// ── Email Campaigns Admin Panel ──────────────────────────────────────────────
// Tabs:
//   1. Dashboard   — stats + recent send log
//   2. Campaigns   — compose & send to segments
//   3. Templates   — manage reusable templates
//   4. SMTP Config — nodemailer / self-hosted MTA settings
//   5. MTA Providers — Mailgun, SendGrid, SES, Postmark one-click connect

import { useState, useCallback, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'campaigns' | 'templates' | 'smtp' | 'mta'

interface EmailLog {
  id: string; to: string; subject: string; status: string
  template?: string; sentAt?: string; error?: string; createdAt: string
}
interface Template {
  id: string; slug: string; name: string; subject: string
  body: string; variables: string[]; isActive: boolean; updatedAt: string
}
interface SmtpConfig {
  host: string; port: string; secure: boolean
  user: string; password: string; fromName: string; fromEmail: string
}
interface MtaProvider {
  id: string; name: string; logo: string; color: string
  desc: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[]
  docsUrl: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  SENT:    { color: 'var(--green)', bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.25)',  label: 'Sent'    },
  QUEUED:  { color: 'var(--gold)',  bg: 'rgba(240,192,64,0.1)', border: 'rgba(240,192,64,0.25)', label: 'Queued'  },
  FAILED:  { color: 'var(--red)',   bg: 'rgba(255,56,96,0.1)',  border: 'rgba(255,56,96,0.25)',  label: 'Failed'  },
  BOUNCED: { color: '#ff9800',      bg: 'rgba(255,152,0,0.1)',  border: 'rgba(255,152,0,0.25)',  label: 'Bounced' },
}

const MTA_PROVIDERS: MtaProvider[] = [
  {
    id: 'mailgun', name: 'Mailgun', logo: '📨', color: '#ff6c2f',
    desc: 'Powerful email API for developers. Generous free tier, excellent deliverability.',
    docsUrl: 'https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/',
    fields: [
      { key: 'apiKey',     label: 'API Key',     placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
      { key: 'domain',     label: 'Domain',      placeholder: 'mg.yourdomain.com' },
      { key: 'region',     label: 'Region',      placeholder: 'US or EU' },
    ],
  },
  {
    id: 'sendgrid', name: 'SendGrid', logo: '📬', color: '#1a82e2',
    desc: 'Twilio SendGrid — industry-leading deliverability, detailed analytics.',
    docsUrl: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send',
    fields: [
      { key: 'apiKey',     label: 'API Key',     placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
    ],
  },
  {
    id: 'ses', name: 'Amazon SES', logo: '☁', color: '#ff9900',
    desc: 'AWS Simple Email Service — lowest cost at scale, 62,000 free emails/month from EC2.',
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html',
    fields: [
      { key: 'accessKeyId',     label: 'Access Key ID',     placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', secret: true },
      { key: 'region',          label: 'AWS Region',        placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'postmark', name: 'Postmark', logo: '📮', color: '#ffde00',
    desc: 'Best-in-class transactional email. Near-instant delivery, excellent inbox rates.',
    docsUrl: 'https://postmarkapp.com/developer/api/email-api',
    fields: [
      { key: 'serverToken', label: 'Server API Token', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', secret: true },
    ],
  },
  {
    id: 'smtp2go', name: 'SMTP2GO', logo: '🔁', color: '#00bcd4',
    desc: 'Reliable SMTP relay with real-time reporting and bounce management.',
    docsUrl: 'https://apidoc.smtp2go.com/documentation/',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
    ],
  },
  {
    id: 'resend', name: 'Resend', logo: '⚡', color: '#a855f7',
    desc: 'Modern email API built for developers. Clean interface, React email support.',
    docsUrl: 'https://resend.com/docs/api-reference/emails/send-email',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
    ],
  },
]

const SEGMENTS = [
  { id: 'all',           label: 'All Traders',           count: 147 },
  { id: 'kyc_pending',   label: 'KYC Pending',           count: 23  },
  { id: 'kyc_approved',  label: 'KYC Approved',          count: 112 },
  { id: 'kyc_rejected',  label: 'KYC Rejected',          count: 8   },
  { id: 'active',        label: 'Active Accounts',       count: 98  },
  { id: 'no_trades',     label: 'No Trades Yet',         count: 34  },
  { id: 'at_risk',       label: 'High Drawdown (>8%)',   count: 6   },
  { id: 'qualifier_top', label: 'Qualifier Top 32',      count: 32  },
]

// Email logs loaded from API — see useEffect below

// Templates loaded from API — see useEffect below

// ── Helper components ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.QUEUED
  return (
    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 9px', borderRadius:4, color:c.color, background:c.bg, border:`1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
}

function TabBtn({ id, label, icon, active, onClick }: { id: string; label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px', borderRadius:8, border:'none', cursor:'pointer', background:active?'var(--neon)':'var(--surface)', color:active?'var(--black)':'var(--gray2)', fontFamily:'var(--font-display)', fontWeight:active?800:600, fontSize:12, letterSpacing:'0.06em', textTransform:'uppercase', boxShadow:active?'0 0 16px rgba(0,212,255,0.3)':'none', transition:'all 0.15s', whiteSpace:'nowrap' }}>
      <span style={{ fontSize:15 }}>{icon}</span>{label}
    </button>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      <label style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)' }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:'var(--gray3)', lineHeight:1.5 }}>{hint}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmailCampaignsPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  // Dashboard
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Campaign composer state
  const [segment, setSegment]       = useState('all')
  const [subject, setSubject]       = useState('')
  const [body, setBody]             = useState('')
  const [fromName, setFromName]     = useState('Hola Prime World Cup')
  const [fromEmail, setFromEmail]   = useState('noreply@holaprime.com')
  const [useTemplate, setUseTemplate] = useState('')
  const [sending, setSending]       = useState(false)
  const [sendMsg, setSendMsg]       = useState('')
  const [testEmail, setTestEmail]   = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testMsg, setTestMsg]       = useState('')
  const [previewHtml, setPreviewHtml] = useState(false)

  // Templates
  const [templates, setTemplates]   = useState<Template[]>([])
  const [editTpl, setEditTpl]       = useState<Template | null>(null)
  const [tplMsg, setTplMsg]         = useState('')

  // SMTP config
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: '', port: '587', secure: false,
    user: '', password: '', fromName: 'Hola Prime World Cup', fromEmail: 'noreply@holaprime.com',
  })
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpMsg, setSmtpMsg]       = useState('')
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)

  // MTA state
  const [activeMta, setActiveMta]   = useState<string | null>(null)
  const [mtaForms, setMtaForms]     = useState<Record<string, Record<string, string>>>({})
  const [mtaSaving, setMtaSaving]   = useState<string | null>(null)
  const [mtaMsg, setMtaMsg]         = useState<Record<string, string>>({})
  const [connectedMta, setConnectedMta] = useState<string | null>(null)

  const seg = SEGMENTS.find(s => s.id === segment) || SEGMENTS[0]

  // Load real data
  useEffect(() => {
    // Fetch email logs
    fetch('/api/admin/email/logs?limit=20').then(r=>r.json()).then(d=>{
      setLogs(d.logs||[])
      setLogsLoading(false)
    }).catch(()=>setLogsLoading(false))
    // Fetch templates
    fetch('/api/admin/email/templates').then(r=>r.json()).then(d=>{
      if(d.templates?.length>0) setTemplates(d.templates)
    }).catch(()=>{})
    // Fetch SMTP config
    fetch('/api/admin/email/config').then(r=>r.json()).then(d=>{
      if(d.smtp) setSmtp(d.smtp)
    }).catch(()=>{})
    // Fetch segment counts (real trader counts from DB)
    fetch('/api/admin/stats').then(r=>r.json()).then(d=>{
      if(d.stats) {
        // Update segment counts with real data
      }
    }).catch(()=>{})
  }, [])

  // Stats derived
  const stats = {
    total:   logs.length,
    sent:    logs.filter(l => l.status === 'SENT').length,
    failed:  logs.filter(l => l.status === 'FAILED').length,
    bounced: logs.filter(l => l.status === 'BOUNCED').length,
    rate:    logs.length ? Math.round(logs.filter(l=>l.status==='SENT').length / logs.length * 100) : 0,
  }

  const handleSendCampaign = async () => {
    if (!subject.trim() || !body.trim()) { setSendMsg('⚠ Subject and body are required'); return }
    setSending(true)
    const r = await fetch('/api/admin/email/bulk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ subject, body, fromName, fromEmail, segment, template: useTemplate||undefined })
    }).then(r=>r.json()).catch(()=>({}))
    setSendMsg(r.queued ? `✓ Campaign queued for ${r.queued} recipients` : '✕ Error: ' + (r.error||'Failed'))
    setSending(false)
    setTimeout(() => setSendMsg(''), 4000)
  }

  const handleTestSend = async () => {
    if (!testEmail.includes('@')) { setTestMsg('Enter a valid email'); return }
    setTestSending(true)
    const r = await fetch('/api/admin/email/test', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ to: testEmail, subject, body, fromName, fromEmail })
    }).then(r=>r.json()).catch(()=>({}))
    setTestMsg(r.success ? `✓ Test email sent to ${testEmail}` : '✕ Error: ' + (r.error||'Failed'))
    setTestSending(false)
    setTimeout(() => setTestMsg(''), 3000)
  }

  const handleSmtpTest = async () => {
    if (!smtp.host) { setSmtpMsg('✕ Host is required'); return }
    setSmtpTesting(true)
    const r = await fetch('/api/admin/email/test-smtp', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ smtp })
    }).then(r=>r.json()).catch(()=>({}))
    setSmtpMsg(r.success ? '✓ Connection successful — SMTP is working' : '✕ ' + (r.error||'Connection failed'))
    setSmtpTesting(false)
  }

  const handleSmtpSave = async () => {
    setSmtpSaving(true)
    const r = await fetch('/api/admin/email/config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ smtp })
    }).then(r=>r.json()).catch(()=>({}))
    setSmtpMsg(r.success ? '✓ SMTP settings saved' : '✕ Error: ' + (r.error||'Failed'))
    setSmtpSaving(false)
    setTimeout(() => setSmtpMsg(''), 3000)
  }

  const handleMtaSave = async (providerId: string) => {
    setMtaSaving(providerId)
    const r = await fetch('/api/admin/email/config', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ provider: providerId, credentials: mtaForms[providerId]||{} })
    }).then(r=>r.json()).catch(()=>({}))
    if (r.success) setConnectedMta(providerId)
    setMtaMsg(prev => ({ ...prev, [providerId]: r.success ? '✓ Connected successfully' : '✕ ' + (r.error||'Failed') }))
    setMtaSaving(null)
    setTimeout(() => setMtaMsg(prev => ({ ...prev, [providerId]: '' })), 3000)
  }

  const selectedSeg = SEGMENTS.find(s => s.id === segment)

  const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--white)', fontFamily:'var(--font-body)', fontSize:13, outline:'none', boxSizing:'border-box' as const }
  const textareaStyle = { ...inputStyle, resize:'vertical' as const, lineHeight:1.6 }

  return (
    <AdminLayout>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>Communications</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, margin:0 }}>Email Campaigns</h1>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        <TabBtn id="dashboard"  label="Dashboard"    icon="📊" active={tab==='dashboard'}  onClick={()=>setTab('dashboard')}  />
        <TabBtn id="campaigns"  label="Compose"      icon="✉️" active={tab==='campaigns'}  onClick={()=>setTab('campaigns')}  />
        <TabBtn id="templates"  label="Templates"    icon="📋" active={tab==='templates'}  onClick={()=>setTab('templates')}  />
        <TabBtn id="smtp"       label="SMTP Config"  icon="⚙" active={tab==='smtp'}       onClick={()=>setTab('smtp')}       />
        <TabBtn id="mta"        label="MTA Providers" icon="🔌" active={tab==='mta'}       onClick={()=>setTab('mta')}        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — DASHBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            {[
              { label:'Total Sent',      value:stats.total,   color:'var(--white)' },
              { label:'Delivered',       value:stats.sent,    color:'var(--green)' },
              { label:'Failed',          value:stats.failed,  color:'var(--red)'   },
              { label:'Bounced',         value:stats.bounced, color:'#ff9800'      },
              { label:'Delivery Rate',   value:`${stats.rate}%`, color:stats.rate>=95?'var(--green)':stats.rate>=80?'var(--gold)':'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:26, color:s.color, lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Connection status banner */}
          <div style={{ background: connectedMta ? 'rgba(0,230,118,0.06)' : 'rgba(255,152,0,0.06)', border:`1px solid ${connectedMta?'rgba(0,230,118,0.2)':'rgba(255,152,0,0.25)'}`, borderRadius:11, padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:20 }}>{connectedMta ? '✅' : '⚠️'}</span>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color: connectedMta ? 'var(--green)' : '#ff9800', marginBottom:2 }}>
                {connectedMta
                  ? `Email delivery active via ${MTA_PROVIDERS.find(p=>p.id===connectedMta)?.name}`
                  : 'No email provider connected'}
              </div>
              <div style={{ fontSize:12, color:'rgba(180,200,235,0.7)' }}>
                {connectedMta
                  ? 'Transactional & campaign emails are sending normally.'
                  : 'Configure SMTP or connect an MTA provider to enable email sending.'}
              </div>
            </div>
            {!connectedMta && (
              <button onClick={()=>setTab('mta')} style={{ marginLeft:'auto', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 16px', borderRadius:7, border:'1px solid rgba(255,152,0,0.3)', background:'transparent', color:'#ff9800', cursor:'pointer' }}>
                Connect Now →
              </button>
            )}
          </div>

          {/* Send log */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>Recent Send Log</div>
              <button onClick={()=>setTab('campaigns')} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', borderRadius:6, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', cursor:'pointer' }}>+ New Campaign</button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Recipient','Subject','Template','Status','Sent At'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray1)' }}>{log.to}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--white)', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.subject}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {log.template ? (
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', opacity:0.8 }}>{log.template}</span>
                      ) : <span style={{ color:'var(--gray3)', fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <StatusBadge status={log.status} />
                      {log.error && <div style={{ fontSize:10, color:'var(--red)', marginTop:3 }}>{log.error}</div>}
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', whiteSpace:'nowrap' }}>
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — COMPOSE CAMPAIGN
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'campaigns' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>

          {/* Left — composer */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* From */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'22px 24px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--neon)', marginBottom:18 }}>Sender</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="From Name">
                  <input style={inputStyle} value={fromName} onChange={e=>setFromName(e.target.value)} placeholder="Hola Prime World Cup" />
                </Field>
                <Field label="From Email">
                  <input style={inputStyle} value={fromEmail} onChange={e=>setFromEmail(e.target.value)} placeholder="noreply@holaprime.com" />
                </Field>
              </div>
            </div>

            {/* Content */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'22px 24px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--neon)', marginBottom:18 }}>Email Content</div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Template selector */}
                <Field label="Use Template (optional)" hint="Selecting a template pre-fills subject and body">
                  <select style={{ ...inputStyle, cursor:'pointer' }} value={useTemplate} onChange={e => {
                    setUseTemplate(e.target.value)
                    const tpl = templates.find(t => t.slug === e.target.value)
                    if (tpl) { setSubject(tpl.subject); setBody(`<!-- Template: ${tpl.name} -->\n<!-- Variables: ${tpl.variables.join(', ')} -->\n\nEdit your HTML content here…`) }
                    else { setSubject(''); setBody('') }
                  }}>
                    <option value="">— Write from scratch —</option>
                    {templates.filter(t=>t.isActive).map(t => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Subject Line">
                  <input style={inputStyle} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. 🏆 Qualifier Results Are In — Check Your Rank" />
                </Field>

                <Field label="Email Body (HTML)" hint="Full HTML supported. Use {{firstName}}, {{displayName}}, etc. for personalisation.">
                  <div style={{ position:'relative' }}>
                    <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                      {[
                        ['<b>', 'Bold'],['<i>', 'Italic'],['{{firstName}}', 'First Name'],
                        ['{{displayName}}', 'Display Name'],['<a href="">', 'Link'],
                      ].map(([val, lbl]) => (
                        <button key={val} onClick={() => setBody(b => b + val)} style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'4px 8px', borderRadius:4, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--gray2)', cursor:'pointer' }}>{lbl}</button>
                      ))}
                    </div>
                    <textarea style={{ ...textareaStyle, minHeight:260, fontFamily:'var(--font-mono)', fontSize:12 }} value={body} onChange={e=>setBody(e.target.value)} placeholder={`<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello {{firstName}},</h1>\n  <p>Your message here…</p>\n</body>\n</html>`} />
                  </div>
                </Field>

                {/* HTML preview toggle */}
                {body && (
                  <div>
                    <button onClick={()=>setPreviewHtml(p=>!p)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 16px', borderRadius:7, border:'1px solid var(--border2)', background:'transparent', color:'var(--neon)', cursor:'pointer' }}>
                      {previewHtml ? '← Edit' : '👁 Preview HTML'}
                    </button>
                    {previewHtml && (
                      <div style={{ marginTop:12, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                        <div style={{ padding:'8px 14px', background:'var(--surface)', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)' }}>Email Preview</div>
                        <iframe srcDoc={body} style={{ width:'100%', height:400, border:'none' }} title="Email Preview" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Audience */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--neon)', marginBottom:16 }}>Audience</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {SEGMENTS.map(s => (
                  <button key={s.id} onClick={()=>setSegment(s.id)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:8, border:`1px solid ${segment===s.id?'var(--neon)':'var(--border2)'}`, background:segment===s.id?'rgba(0,212,255,0.08)':'transparent', cursor:'pointer', transition:'all 0.12s' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:12, color:segment===s.id?'var(--neon)':'var(--gray2)' }}>{s.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:12, color:segment===s.id?'var(--neon)':'var(--gray3)' }}>{s.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:14, padding:'12px', borderRadius:8, background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.2)', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--neon)' }}>{selectedSeg?.count}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginTop:2 }}>Recipients</div>
              </div>
            </div>

            {/* Test send */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--neon)', marginBottom:14 }}>Test Send</div>
              <div style={{ display:'flex', gap:8 }}>
                <input style={{ ...inputStyle, flex:1 }} placeholder="test@example.com" value={testEmail} onChange={e=>setTestEmail(e.target.value)} />
                <button onClick={handleTestSend} disabled={testSending} style={{ padding:'10px 14px', borderRadius:8, border:'none', cursor:testSending?'not-allowed':'pointer', background:'rgba(0,212,255,0.12)', color:'var(--neon)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.07em', textTransform:'uppercase', flexShrink:0, opacity:testSending?0.7:1 }}>
                  {testSending ? '…' : 'Send'}
                </button>
              </div>
              {testMsg && <div style={{ marginTop:8, fontSize:12, color:testMsg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700 }}>{testMsg}</div>}
            </div>

            {/* Send campaign */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--neon)', marginBottom:14 }}>Launch</div>
              {sendMsg && (
                <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:12, background:sendMsg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,152,0,0.1)', border:`1px solid ${sendMsg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,152,0,0.3)'}`, color:sendMsg.startsWith('✓')?'var(--green)':'#ff9800', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{sendMsg}</div>
              )}
              <button onClick={handleSendCampaign} disabled={sending} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', cursor:sending?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.08em', textTransform:'uppercase', boxShadow:'0 0 20px rgba(0,212,255,0.4)', opacity:sending?0.7:1 }}>
                {sending ? 'Sending…' : `🚀 Send to ${selectedSeg?.count} Recipients`}
              </button>
              <div style={{ marginTop:10, fontSize:11, color:'var(--gray3)', lineHeight:1.5 }}>
                Emails are queued and sent in batches. You can track delivery in the Dashboard tab.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — TEMPLATES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div style={{ display:'grid', gridTemplateColumns: editTpl ? '1fr 480px' : '1fr', gap:20, alignItems:'start' }}>

          {/* Template list */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>Email Templates</div>
              <button onClick={()=>setEditTpl({ id:'new', slug:'', name:'', subject:'', body:'', variables:[], isActive:true, updatedAt:new Date().toISOString() })} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 16px', borderRadius:7, border:'none', background:'var(--neon)', color:'var(--black)', cursor:'pointer' }}>+ New Template</button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Name','Slug','Subject','Variables','Status','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl, i) => (
                  <tr key={tpl.id} style={{ borderBottom:'1px solid var(--border)', background:editTpl?.id===tpl.id?'rgba(0,212,255,0.04)':i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>{tpl.name}</div>
                      <div style={{ fontSize:10, color:'var(--gray3)', marginTop:2 }}>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', opacity:0.8 }}>{tpl.slug}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--gray2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tpl.subject}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {tpl.variables.map(v => (
                          <span key={v} style={{ fontFamily:'var(--font-mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(0,212,255,0.08)', color:'var(--neon)', border:'1px solid rgba(0,212,255,0.15)' }}>{`{{${v}}}`}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={()=>setTemplates(prev=>prev.map(t=>t.id===tpl.id?{...t,isActive:!t.isActive}:t))} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', padding:'4px 10px', borderRadius:4, border:'none', cursor:'pointer', background:tpl.isActive?'rgba(0,230,118,0.12)':'rgba(74,85,128,0.15)', color:tpl.isActive?'var(--green)':'var(--gray3)' }}>
                        {tpl.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={()=>setEditTpl(tpl)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', padding:'6px 12px', borderRadius:5, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', cursor:'pointer' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Template editor panel */}
          {editTpl && (
            <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:12, padding:'22px 24px', position:'sticky', top:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--neon)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  {editTpl.id === 'new' ? 'New Template' : 'Edit Template'}
                </div>
                <button onClick={()=>setEditTpl(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:20 }}>×</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="Template Name">
                  <input style={inputStyle} value={editTpl.name} onChange={e=>setEditTpl({...editTpl,name:e.target.value})} placeholder="e.g. KYC Approved" />
                </Field>
                <Field label="Slug" hint="Unique identifier used in code">
                  <input style={inputStyle} value={editTpl.slug} onChange={e=>setEditTpl({...editTpl,slug:e.target.value})} placeholder="e.g. kyc_approved" />
                </Field>
                <Field label="Subject Line">
                  <input style={inputStyle} value={editTpl.subject} onChange={e=>setEditTpl({...editTpl,subject:e.target.value})} placeholder="Email subject…" />
                </Field>
                <Field label="Variables (comma-separated)" hint="e.g. firstName, accountNumber">
                  <input style={inputStyle} value={editTpl.variables.join(', ')} onChange={e=>setEditTpl({...editTpl,variables:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})} placeholder="firstName, displayName, amount" />
                </Field>
                <Field label="HTML Body">
                  <textarea style={{ ...textareaStyle, minHeight:180, fontFamily:'var(--font-mono)', fontSize:11 }} value={editTpl.body} onChange={e=>setEditTpl({...editTpl,body:e.target.value})} placeholder="<!DOCTYPE html>…" />
                </Field>
                {tplMsg && <div style={{ padding:'9px 12px', borderRadius:7, background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.3)', color:'var(--green)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{tplMsg}</div>}
                <button onClick={()=>{
                  if (editTpl.id === 'new') {
                    setTemplates(prev => [...prev, { ...editTpl, id: Date.now().toString(), updatedAt: new Date().toISOString() }])
                  } else {
                    setTemplates(prev => prev.map(t => t.id===editTpl.id ? {...editTpl, updatedAt: new Date().toISOString()} : t))
                  }
                  setTplMsg('✓ Template saved')
                  setTimeout(()=>{ setTplMsg(''); setEditTpl(null) }, 1200)
                }} style={{ padding:'12px', borderRadius:8, border:'none', cursor:'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  ✓ Save Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4 — SMTP CONFIG
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'smtp' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>

          {/* SMTP form */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'28px 30px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,var(--neon),transparent)' }} />

            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)', marginBottom:6 }}>SMTP Configuration</div>
            <div style={{ fontSize:13, color:'var(--gray3)', marginBottom:24, lineHeight:1.6 }}>
              Connect any SMTP server — your own mail server, G Suite, Office 365, or a relay service. These settings are saved to your <code style={{ background:'rgba(0,212,255,0.1)', padding:'1px 5px', borderRadius:3, fontSize:11 }}>.env.local</code> file.
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 100px', gap:14 }}>
                <Field label="SMTP Host" hint="e.g. smtp.gmail.com, mail.yourdomain.com">
                  <input style={inputStyle} value={smtp.host} onChange={e=>setSmtp({...smtp,host:e.target.value})} placeholder="smtp.gmail.com" />
                </Field>
                <Field label="Port">
                  <input style={inputStyle} value={smtp.port} onChange={e=>setSmtp({...smtp,port:e.target.value})} placeholder="587" />
                </Field>
                <Field label="Encryption">
                  <button onClick={()=>setSmtp({...smtp,secure:!smtp.secure})} style={{ padding:'10px 14px', borderRadius:8, border:`1px solid ${smtp.secure?'var(--green)':'var(--border2)'}`, background:smtp.secure?'rgba(0,230,118,0.1)':'transparent', color:smtp.secure?'var(--green)':'var(--gray2)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, cursor:'pointer', height:42 }}>
                    {smtp.secure ? 'SSL/TLS' : 'STARTTLS'}
                  </button>
                </Field>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="SMTP Username">
                  <input style={inputStyle} value={smtp.user} onChange={e=>setSmtp({...smtp,user:e.target.value})} placeholder="your@email.com" />
                </Field>
                <Field label="SMTP Password">
                  <div style={{ position:'relative' }}>
                    <input style={inputStyle} type={showSmtpPass?'text':'password'} value={smtp.password} onChange={e=>setSmtp({...smtp,password:e.target.value})} placeholder="••••••••••••" />
                    <button onClick={()=>setShowSmtpPass(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:14 }}>
                      {showSmtpPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </Field>
              </div>

              <div style={{ height:1, background:'var(--border)' }} />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="From Name">
                  <input style={inputStyle} value={smtp.fromName} onChange={e=>setSmtp({...smtp,fromName:e.target.value})} placeholder="Hola Prime World Cup" />
                </Field>
                <Field label="From Email Address">
                  <input style={inputStyle} value={smtp.fromEmail} onChange={e=>setSmtp({...smtp,fromEmail:e.target.value})} placeholder="noreply@holaprime.com" />
                </Field>
              </div>

              {smtpMsg && (
                <div style={{ padding:'11px 14px', borderRadius:8, background:smtpMsg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', border:`1px solid ${smtpMsg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, color:smtpMsg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{smtpMsg}</div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleSmtpTest} disabled={smtpTesting} style={{ flex:1, padding:'12px', borderRadius:8, border:'1px solid rgba(0,212,255,0.3)', cursor:smtpTesting?'not-allowed':'pointer', background:'rgba(0,212,255,0.08)', color:'var(--neon)', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.07em', textTransform:'uppercase', opacity:smtpTesting?0.7:1 }}>
                  {smtpTesting ? 'Testing…' : '⚡ Test Connection'}
                </button>
                <button onClick={handleSmtpSave} disabled={smtpSaving} style={{ flex:2, padding:'12px', borderRadius:8, border:'none', cursor:smtpSaving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', opacity:smtpSaving?0.7:1 }}>
                  {smtpSaving ? 'Saving…' : '✓ Save SMTP Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick-reference panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--neon)', marginBottom:14 }}>Common SMTP Settings</div>
              {[
                { name:'Gmail',         host:'smtp.gmail.com',       port:'587', note:'Requires App Password (2FA must be on)' },
                { name:'Outlook/O365',  host:'smtp.office365.com',   port:'587', note:'Use your Microsoft account credentials' },
                { name:'Yahoo Mail',    host:'smtp.mail.yahoo.com',  port:'587', note:'Requires App Password' },
                { name:'Zoho Mail',     host:'smtp.zoho.com',        port:'587', note:'Works with all Zoho plans' },
                { name:'Custom Server', host:'mail.yourdomain.com',  port:'587', note:'Standard cPanel/WHM setup' },
              ].map(s => (
                <div key={s.name} style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--white)' }}>{s.name}</span>
                    <button onClick={()=>setSmtp({...smtp, host:s.host, port:s.port})} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:4, border:'1px solid var(--border2)', background:'transparent', color:'var(--neon)', cursor:'pointer' }}>USE</button>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--neon)', opacity:0.7 }}>{s.host}:{s.port}</div>
                  <div style={{ fontSize:10, color:'var(--gray3)', marginTop:2 }}>{s.note}</div>
                </div>
              ))}
            </div>

            <div style={{ background:'rgba(240,192,64,0.06)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:11, padding:'16px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gold)', marginBottom:8 }}>Add to .env.local</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(240,192,64,0.8)', lineHeight:2 }}>
                SMTP_HOST={smtp.host||'smtp.example.com'}<br/>
                SMTP_PORT={smtp.port||'587'}<br/>
                SMTP_USER={smtp.user||'your@email.com'}<br/>
                SMTP_PASSWORD=your_password<br/>
                EMAIL_FROM={smtp.fromEmail||'noreply@holaprime.com'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5 — MTA PROVIDERS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'mta' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Info banner */}
          <div style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:11, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:22 }}>🔌</span>
            <div style={{ fontSize:13, color:'rgba(180,200,235,0.8)', lineHeight:1.6 }}>
              <strong style={{ color:'var(--neon)' }}>MTA (Mail Transfer Agent) providers</strong> handle deliverability, bounce processing, and analytics so you don't have to manage a mail server. Connect one below — your API credentials are saved to <code style={{ background:'rgba(0,212,255,0.1)', padding:'1px 5px', borderRadius:3, fontSize:11 }}>.env.local</code> and used automatically when sending.
            </div>
          </div>

          {/* Provider cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(460px,1fr))', gap:16 }}>
            {MTA_PROVIDERS.map(provider => {
              const isConnected = connectedMta === provider.id
              const isExpanded  = activeMta   === provider.id
              const form = mtaForms[provider.id] || {}
              const saving = mtaSaving === provider.id
              const msg  = mtaMsg[provider.id] || ''

              return (
                <div key={provider.id} style={{ background:'var(--surface)', border:`1px solid ${isConnected?'rgba(0,230,118,0.3)':isExpanded?`${provider.color}30`:'var(--border)'}`, borderRadius:14, overflow:'hidden', transition:'border-color 0.2s' }}>

                  {/* Card header */}
                  <div style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                    onClick={()=>setActiveMta(isExpanded ? null : provider.id)}
                  >
                    <div style={{ width:44, height:44, borderRadius:10, background:`${provider.color}18`, border:`1px solid ${provider.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{provider.logo}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, color:'var(--white)' }}>{provider.name}</span>
                        {isConnected && (
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:4, background:'rgba(0,230,118,0.1)', color:'var(--green)', border:'1px solid rgba(0,230,118,0.3)' }}>● Connected</span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'var(--gray3)', lineHeight:1.5 }}>{provider.desc}</div>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                      <a href={provider.docsUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gray3)', textDecoration:'none', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border2)' }}>
                        Docs ↗
                      </a>
                      <div style={{ width:28, height:28, borderRadius:'50%', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gray3)', fontSize:14, transition:'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</div>
                    </div>
                  </div>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                      {provider.fields.map(field => (
                        <Field key={field.key} label={field.label}>
                          <div style={{ position:'relative' }}>
                            <input
                              style={inputStyle}
                              type={field.secret ? 'password' : 'text'}
                              placeholder={field.placeholder}
                              value={form[field.key] || ''}
                              onChange={e => setMtaForms(prev => ({ ...prev, [provider.id]: { ...(prev[provider.id]||{}), [field.key]: e.target.value } }))}
                            />
                          </div>
                        </Field>
                      ))}

                      {/* Env var hint */}
                      <div style={{ background:'rgba(240,192,64,0.06)', border:'1px solid rgba(240,192,64,0.15)', borderRadius:9, padding:'12px 14px' }}>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)', marginBottom:6 }}>Add to .env.local</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(240,192,64,0.7)', lineHeight:1.8 }}>
                          EMAIL_PROVIDER={provider.id.toUpperCase()}<br/>
                          {provider.fields.map(f => `${provider.id.toUpperCase()}_${f.key.replace(/([A-Z])/g,'_$1').toUpperCase()}=your_${f.key}`).join('\n').split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}
                        </div>
                      </div>

                      {msg && (
                        <div style={{ padding:'10px 14px', borderRadius:8, background:msg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', border:`1px solid ${msg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, color:msg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{msg}</div>
                      )}

                      <div style={{ display:'flex', gap:10 }}>
                        {isConnected && (
                          <button onClick={()=>setConnectedMta(null)} style={{ flex:1, padding:'11px', borderRadius:8, border:'1px solid rgba(255,56,96,0.3)', background:'transparent', color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.07em', textTransform:'uppercase', cursor:'pointer' }}>
                            Disconnect
                          </button>
                        )}
                        <button onClick={()=>handleMtaSave(provider.id)} disabled={saving} style={{ flex:2, padding:'12px', borderRadius:8, border:'none', cursor:saving?'not-allowed':'pointer', background:provider.color, color:'#000', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', opacity:saving?0.7:1 }}>
                          {saving ? 'Connecting…' : isConnected ? '✓ Update Credentials' : `Connect ${provider.name}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Comparison table */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginTop:8 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>Provider Comparison</div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Provider','Free Tier','Pricing','Best For','Inbox Rate'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name:'Mailgun',    free:'5,000/mo',   price:'$15/mo',  best:'Dev-focused APIs',   rate:'★★★★☆' },
                  { name:'SendGrid',   free:'100/day',    price:'$20/mo',  best:'Marketing + transact', rate:'★★★★☆' },
                  { name:'Amazon SES', free:'62K/mo*',    price:'$0.10/1K', best:'High volume, low cost', rate:'★★★☆☆' },
                  { name:'Postmark',   free:'100 msgs',   price:'$15/mo',  best:'Transactional speed', rate:'★★★★★' },
                  { name:'SMTP2GO',    free:'1,000/mo',   price:'$10/mo',  best:'Reliable relay',      rate:'★★★★☆' },
                  { name:'Resend',     free:'3,000/mo',   price:'$20/mo',  best:'Modern developer UX', rate:'★★★★☆' },
                ].map((row, i) => (
                  <tr key={row.name} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>{row.name}</td>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--green)' }}>{row.free}</td>
                    <td style={{ padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray2)' }}>{row.price}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--gray2)' }}>{row.best}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--gold)' }}>{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding:'11px 16px', borderTop:'1px solid var(--border)', fontSize:11, color:'var(--gray3)' }}>* When sending from AWS EC2 instance</div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
