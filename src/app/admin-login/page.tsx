'use client'
export const dynamic = 'force-dynamic'
// src/app/admin-login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mounted, setMounted]   = useState(false)
  const [dotPos, setDotPos]     = useState({ x: 50, y: 50 })

  useEffect(() => {
    setMounted(true)
    const move = (e: MouseEvent) => {
      setDotPos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return setError('Email and password are required.')
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/admin-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      // Redirect to admin panel — URL becomes /admin
      router.replace('/admin')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      background:  '#070a12',
      minHeight:   '100vh',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      position:    'relative',
      overflow:    'hidden',
      fontFamily:  'var(--font-body, Inter, sans-serif)',
    }}>

      {/* ── BACKGROUND LAYERS ─────────────────────────────────────────── */}

      {/* Fine grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Mouse-tracked glow */}
      {mounted && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(600px circle at ${dotPos.x}% ${dotPos.y}%, rgba(0,212,255,0.04) 0%, transparent 60%)`,
          transition: 'background 0.1s ease',
        }} />
      )}

      {/* Diagonal accent lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="30%" x2="100%" y2="70%" stroke="#00d4ff" strokeWidth="1" />
        <line x1="0" y1="70%" x2="100%" y2="30%" stroke="#00d4ff" strokeWidth="0.5" />
        <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#f0c040" strokeWidth="0.5" />
      </svg>

      {/* Corner marks */}
      {[
        { top: 24, left: 24 }, { top: 24, right: 24 },
        { bottom: 24, left: 24 }, { bottom: 24, right: 24 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 20, height: 20,
          borderTop:    i < 2 ? '1px solid rgba(0,212,255,0.2)' : 'none',
          borderBottom: i >= 2 ? '1px solid rgba(0,212,255,0.2)' : 'none',
          borderLeft:   i % 2 === 0 ? '1px solid rgba(0,212,255,0.2)' : 'none',
          borderRight:  i % 2 === 1 ? '1px solid rgba(0,212,255,0.2)' : 'none',
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── MAIN LAYOUT: Side panel + Card ───────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', gap: 0, alignItems: 'stretch',
        width: '100%', maxWidth: 960,
        margin: '0 auto', padding: '0 20px',
        minHeight: 540,
      }}>

        {/* ── LEFT: Brand panel ──────────────────────────────────────── */}
        <div style={{
          flex: '0 0 340px',
          background: 'linear-gradient(160deg, rgba(0,212,255,0.06) 0%, rgba(0,0,0,0) 60%)',
          border: '1px solid rgba(0,212,255,0.1)',
          borderRight: 'none',
          borderRadius: '20px 0 0 20px',
          padding: '52px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
        }}>
          <div>
            {/* Logo mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0,212,255,0.1)',
              }}>
                {/* Shield icon */}
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1L2 4.5V10C2 14.5 5.5 18.7 10 21C14.5 18.7 18 14.5 18 10V4.5L10 1Z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M7 11L9 13L13 9" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 900, fontSize: 15, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>HOLA PRIME</div>
                <div style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 10, letterSpacing: '0.22em', color: '#00d4ff', marginTop: 3 }}>ADMIN PORTAL</div>
              </div>
            </div>

            {/* Main heading */}
            <h1 style={{
              fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
              fontWeight: 900, fontSize: 44, lineHeight: 0.95,
              textTransform: 'uppercase', color: '#fff',
              margin: '0 0 20px',
              letterSpacing: '0.02em',
            }}>
              World Cup<br />
              <span style={{ color: '#00d4ff' }}>Control</span><br />
              Centre
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
              Restricted access. Authorised personnel only.
            </p>
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Registered Traders', value: '2,418' },
              { label: 'Tournament Phase',   value: 'Qualifier'  },
              { label: 'Days to Grand Final', value: '143'       },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', fontWeight: 700, fontSize: 13, color: '#fff' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Login form ──────────────────────────────────────── */}
        <div style={{
          flex: 1,
          background: 'rgba(7,11,22,0.97)',
          border: '1px solid rgba(0,212,255,0.1)',
          borderRadius: '0 20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 80px rgba(0,0,0,0.7), 20px 0 60px rgba(0,212,255,0.03)',
        }}>

          {/* Top security bar */}
          <div style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent 0%, #00d4ff 40%, #f0c040 60%, transparent 100%)',
          }} />

          {/* Access level badge */}
          <div style={{ padding: '20px 44px 0', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: 6, padding: '5px 12px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
              <span style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#00d4ff' }}>Secure Connection</span>
            </div>
          </div>

          <div style={{ flex: 1, padding: '36px 44px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Heading */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#00d4ff', marginBottom: 10 }}>
                Administrator Access
              </div>
              <h2 style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 900, fontSize: 34, color: '#fff', lineHeight: 1, textTransform: 'uppercase', margin: 0 }}>
                Sign In
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)', marginBottom: 8,
                }}>Admin Email</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.5)" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="admin@holaprime.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    autoComplete="username"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '14px 16px 14px 46px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${error ? 'rgba(255,56,96,0.4)' : 'rgba(0,212,255,0.15)'}`,
                      borderRadius: 10, outline: 'none',
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      fontSize: 14, color: '#fff',
                      transition: 'all 0.15s',
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.5)'; (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.04)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = error ? 'rgba(255,56,96,0.4)' : 'rgba(0,212,255,0.15)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)', marginBottom: 8,
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    autoComplete="current-password"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '14px 48px 14px 46px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${error ? 'rgba(255,56,96,0.4)' : 'rgba(0,212,255,0.15)'}`,
                      borderRadius: 10, outline: 'none',
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      fontSize: 14, color: '#fff',
                      transition: 'all 0.15s',
                      letterSpacing: showPw ? 'normal' : '0.2em',
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.5)'; (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.04)' }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = error ? 'rgba(255,56,96,0.4)' : 'rgba(0,212,255,0.15)'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
                  >
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,56,96,0.07)',
                  border: '1px solid rgba(255,56,96,0.3)',
                  borderRadius: 8, padding: '11px 14px',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff3860" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: 13, color: '#ff3860', flex: 1 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: '100%', padding: '15px',
                  borderRadius: 10, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading
                    ? 'rgba(0,212,255,0.25)'
                    : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  color: loading ? 'rgba(255,255,255,0.5)' : '#03040a',
                  fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                  fontWeight: 900, fontSize: 15,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  boxShadow: loading ? 'none' : '0 0 28px rgba(0,212,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: loading ? 0.7 : 1,
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 32px rgba(0,212,255,0.45), inset 0 1px 0 rgba(255,255,255,0.15)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 0 28px rgba(0,212,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                {loading ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid rgba(255,255,255,0.8)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Access Admin Portal
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                Unauthorised access is prohibited
              </span>
              <Link href="/login" style={{ fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#00d4ff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.5)'}
              >
                Trader Login →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
