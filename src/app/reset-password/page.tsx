'use client'
export const dynamic = 'force-dynamic'
// src/app/reset-password/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Status = 'validating' | 'valid' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const [status, setStatus]         = useState<Status>('validating')
  const [token, setToken]           = useState('')
  const [tokenError, setTokenError] = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showPw, setShowPw]         = useState(false)

  // Validate token on mount
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || ''
    setToken(t)
    if (!t) { setStatus('invalid'); setTokenError('No reset token found. Please request a new link.'); return }
    fetch(`/api/auth/reset-password?token=${t}`)
      .then(r => r.json())
      .then(d => { if (d.valid) { setStatus('valid') } else { setStatus('invalid'); setTokenError(d.error || 'Invalid or expired link.') } })
      .catch(() => { setStatus('invalid'); setTokenError('Could not validate link. Please try again.') })
  }, [])

  const getStrength = (pw: string) => {
    let s = 0
    if (pw.length >= 8)        s++
    if (/[A-Z]/.test(pw))      s++
    if (/[0-9]/.test(pw))      s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }
  const strength = getStrength(password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ff3860', '#f0c040', '#00d4ff', '#00e676'][strength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8)              return setError('Password must be at least 8 characters')
    if (!/[A-Z]/.test(password))          return setError('Password must contain at least one uppercase letter')
    if (!/[0-9]/.test(password))          return setError('Password must contain at least one number')
    if (password !== confirm)             return setError('Passwords do not match')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const d = await res.json()
      if (res.ok && d.success) { setStatus('success') }
      else { setError(d.error || 'Failed to reset password. Please try again.') }
    } catch { setError('Network error. Please try again.') }
    setLoading(false)
  }

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background:'var(--black)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      <div className="grid-bg" style={{ position:'absolute', inset:0, opacity:0.4 }} />
      <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(0,212,255,0.06) 0%,transparent 70%)', filter:'blur(30px)' }} />
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:420 }}>
        <div style={{ background:'rgba(7,11,22,0.95)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 0 80px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)' }}>
          <div style={{ height:2, background:'linear-gradient(90deg,transparent,var(--neon),var(--gold),var(--neon),transparent)' }} />
          <div style={{ padding:'40px' }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ width:52, height:52, borderRadius:12, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 12px' }}>🏆</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.08em', color:'var(--white)' }}>HOLA PRIME</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.25em', color:'var(--neon)', marginTop:2 }}>WORLD CUP 2026</div>
            </div>
            {children}
            <div style={{ textAlign:'center', marginTop:24 }}>
              <Link href="/login" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--neon)', textDecoration:'none' }}>← Back to Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (status === 'validating') return (
    <Card>
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:32, marginBottom:16, opacity:0.6 }}>⏳</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--gray3)', letterSpacing:'0.1em' }}>VALIDATING LINK…</div>
      </div>
    </Card>
  )

  if (status === 'invalid') return (
    <Card>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,56,96,0.1)', border:'2px solid rgba(255,56,96,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 20px' }}>✕</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--white)', textTransform:'uppercase', marginBottom:12 }}>Link Invalid</h2>
        <p style={{ fontSize:14, color:'var(--gray3)', lineHeight:1.7, marginBottom:20 }}>{tokenError}</p>
        <Link href="/forgot-password" style={{ display:'inline-block', padding:'12px 28px', borderRadius:9, background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', textDecoration:'none', boxShadow:'0 0 16px rgba(0,212,255,0.3)' }}>
          Request New Link →
        </Link>
      </div>
    </Card>
  )

  if (status === 'success') return (
    <Card>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,230,118,0.1)', border:'2px solid var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 20px', boxShadow:'0 0 20px rgba(0,230,118,0.2)' }}>✓</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--white)', textTransform:'uppercase', marginBottom:12 }}>Password Reset!</h2>
        <p style={{ fontSize:14, color:'var(--gray2)', lineHeight:1.7, marginBottom:24 }}>Your password has been updated. All previous sessions have been signed out for security.</p>
        <Link href="/login" style={{ display:'inline-block', padding:'13px 32px', borderRadius:9, background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.08em', textTransform:'uppercase', textDecoration:'none', boxShadow:'0 0 20px rgba(0,212,255,0.35)' }}>
          Sign In Now →
        </Link>
      </div>
    </Card>
  )

  return (
    <Card>
      <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:26, color:'var(--white)', textTransform:'uppercase', textAlign:'center', marginBottom:8 }}>New Password</h1>
      <p style={{ fontSize:14, color:'var(--gray3)', textAlign:'center', marginBottom:24, lineHeight:1.6 }}>Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:7 }}>New Password</label>
          <div style={{ position:'relative' }}>
            <input className="input-field" type={showPw ? 'text' : 'password'} placeholder="Min 8 chars · 1 uppercase · 1 number" value={password} onChange={e => { setPassword(e.target.value); setError('') }} style={{ paddingRight:44 }} />
            <button type="button" onClick={() => setShowPw(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:15 }}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
          {/* Strength meter */}
          {password.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength ? strengthColor : 'var(--border2)', transition:'background 0.2s' }} />
                ))}
              </div>
              <div style={{ fontSize:11, color:strengthColor, fontFamily:'var(--font-display)', fontWeight:700 }}>{strengthLabel}</div>
            </div>
          )}
        </div>

        <div>
          <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:7 }}>Confirm Password</label>
          <input className="input-field" type="password" placeholder="Repeat your new password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} />
          {confirm && confirm !== password && (
            <div style={{ fontSize:12, color:'var(--red)', marginTop:5 }}>Passwords don't match</div>
          )}
        </div>

        {error && (
          <div style={{ padding:'11px 14px', background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, color:'var(--red)', fontSize:13 }}>
            ⚠ {error}
          </div>
        )}

        <button type="submit" disabled={loading || !password || !confirm} style={{ padding:'14px', borderRadius:10, border:'none', cursor:loading||!password||!confirm?'not-allowed':'pointer', background:loading||!password||!confirm?'rgba(0,212,255,0.3)':'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.1em', textTransform:'uppercase', transition:'all 0.2s', boxShadow:!loading&&password&&confirm?'0 0 20px rgba(0,212,255,0.35)':'none' }}>
          {loading ? 'Updating Password…' : 'Set New Password →'}
        </button>
      </form>
    </Card>
  )
}
