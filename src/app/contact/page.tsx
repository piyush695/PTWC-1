'use client'
export const dynamic = 'force-dynamic'
// src/app/contact/page.tsx — real form submission to /api/contact
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'

const CATEGORIES = [
  { id: 'general',   label: 'General Enquiry' },
  { id: 'kyc',       label: 'KYC / Verification' },
  { id: 'technical', label: 'Technical Support' },
  { id: 'account',   label: 'Trading Account' },
  { id: 'prize',     label: 'Prize / Payment' },
  { id: 'rules',     label: 'Rules Question' },
]

const CONTACTS = [
  { icon: '✉', label: 'General Support',   value: 'support@holaprime.com',  href: 'mailto:support@holaprime.com'  },
  { icon: '🔒', label: 'KYC & Compliance', value: 'kyc@holaprime.com',       href: 'mailto:kyc@holaprime.com'      },
  { icon: '⚖', label: 'Legal',             value: 'legal@holaprime.com',     href: 'mailto:legal@holaprime.com'    },
  { icon: '🏆', label: 'Tournament Rules',  value: 'rules@holaprime.com',     href: 'mailto:rules@holaprime.com'    },
]

export default function ContactPage() {
  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' })
  const [category, setCategory] = useState('general')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category }),
      })
      if (r.ok) {
        setSent(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Failed to send. Please email us directly.')
      }
    } catch {
      setError('Network error — please email us directly.')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', background: 'var(--surface)',
    border: '1px solid var(--border2)', borderRadius: 9, color: 'var(--white)',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '120px 32px 80px' }}>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 12 }}>Support</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(40px,6vw,72px)', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 0.95, margin: 0 }}>
            Get in <span className="text-shimmer">Touch</span>
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'start' }}>

          {/* Form */}
          <div className="card" style={{ padding: '36px 40px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: 'var(--white)', marginBottom: 10 }}>Message Sent</div>
                <div style={{ color: 'var(--gray2)', fontSize: 14 }}>We'll get back to you within 24 hours.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', display: 'block', marginBottom: 7 }}>Name</label>
                    <input style={inputStyle} value={form.name} onChange={e => f('name', e.target.value)} placeholder="Your name" required />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', display: 'block', marginBottom: 7 }}>Email</label>
                    <input style={inputStyle} type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="you@email.com" required />
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', display: 'block', marginBottom: 7 }}>Category</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.map(c => (
                      <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', padding: '7px 13px', borderRadius: 7, border: `1px solid ${category === c.id ? 'rgba(0,212,255,0.4)' : 'var(--border2)'}`, background: category === c.id ? 'rgba(0,212,255,0.08)' : 'transparent', color: category === c.id ? 'var(--neon)' : 'var(--gray2)', cursor: 'pointer' }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', display: 'block', marginBottom: 7 }}>Subject</label>
                  <input style={inputStyle} value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="Brief subject" required />
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', display: 'block', marginBottom: 7 }}>Message</label>
                  <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} value={form.message} onChange={e => f('message', e.target.value)} placeholder="Describe your question or issue..." required />
                </div>

                {error && <div style={{ color: 'var(--red)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ padding: '14px 28px', borderRadius: 10, background: loading ? 'var(--surface)' : 'var(--neon)', color: loading ? 'var(--gray2)' : 'var(--black)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, letterSpacing: '0.08em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {loading ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CONTACTS.map(c => (
              <a key={c.label} href={c.href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 3 }}>{c.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--neon)' }}>{c.value}</div>
                  </div>
                </div>
              </a>
            ))}

            <div className="card" style={{ padding: '20px 22px', marginTop: 8 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 10 }}>Response Times</div>
              {[['General', '24 hours'],['KYC Issues', '4–8 hours'],['Technical', '2–4 hours'],['Urgent', 'Live chat']].map(([type, time]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray2)' }}>{type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--neon)' }}>{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
