'use client'
export const dynamic = 'force-dynamic'
// src/app/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const d = await res.json()
      if (d.success) {
        setSent(true)
      } else {
        setError(d.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ background:'var(--black)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      <div className="grid-bg" style={{ position:'absolute', inset:0, opacity:0.4 }} />
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(0,212,255,0.06) 0%,transparent 70%)', filter:'blur(30px)' }} />

      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:420 }}>
        <div style={{ background:'rgba(7,11,22,0.95)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 0 80px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)' }}>
          <div style={{ height:2, background:'linear-gradient(90deg,transparent,var(--neon),var(--gold),var(--neon),transparent)' }} />
          <div style={{ padding:'40px' }}>

            {/* Logo */}
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px', boxShadow:'0 0 20px rgba(0,212,255,0.15)' }}>🏆</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, letterSpacing:'0.08em', color:'var(--white)' }}>HOLA PRIME</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.25em', color:'var(--neon)', marginTop:2 }}>WORLD CUP 2026</div>
            </div>

            {!sent ? (
              <>
                <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color:'var(--white)', textTransform:'uppercase', textAlign:'center', marginBottom:8 }}>Reset Password</h1>
                <p style={{ fontSize:14, color:'var(--gray3)', textAlign:'center', marginBottom:28, lineHeight:1.6 }}>Enter your registered email and we'll send you a reset link.</p>

                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:8 }}>Email Address</label>
                    <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError('') }} autoFocus />
                  </div>

                  {error && (
                    <div style={{ padding:'11px 14px', background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, color:'var(--red)', fontSize:13 }}>
                      ⚠ {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading || !email} style={{ padding:'14px', borderRadius:10, border:'none', cursor:loading||!email?'not-allowed':'pointer', background:loading||!email?'rgba(0,212,255,0.3)':'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:loading||!email?'none':'0 0 20px rgba(0,212,255,0.35)', transition:'all 0.2s' }}>
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,230,118,0.1)', border:'2px solid var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 20px', boxShadow:'0 0 20px rgba(0,230,118,0.2)' }}>✉</div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--white)', textTransform:'uppercase', marginBottom:12 }}>Check Your Email</h2>
                <p style={{ fontSize:14, color:'var(--gray2)', lineHeight:1.7, marginBottom:8 }}>A password reset link has been sent to</p>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:14, color:'var(--neon)', marginBottom:20 }}>{email}</div>
                <div style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
                  <p style={{ fontSize:13, color:'var(--gray3)', lineHeight:1.6, margin:0 }}>The link expires in <strong style={{ color:'var(--white)' }}>30 minutes</strong>. Check your spam folder if you don't see it.</p>
                </div>
                <button onClick={() => { setSent(false); setEmail('') }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--gray3)', textDecoration:'underline' }}>
                  Try a different email
                </button>
              </div>
            )}

            <div style={{ textAlign:'center', marginTop:24 }}>
              <Link href="/login" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--neon)', textDecoration:'none' }}>← Back to Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
