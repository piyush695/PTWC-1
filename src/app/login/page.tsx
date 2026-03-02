'use client'
export const dynamic = 'force-dynamic'
// src/app/login/page.tsx — TRADER login only
// Admin accounts are redirected to /admin-login
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const flagUrl = (code: string) => `https://flagcdn.com/w40/${(code||'').toLowerCase()}.png`
const STRIP_FLAGS = ['AE','NG','IN','GB','ZA','MY','PK','KE','SG','BR','DE','FR','AU','EG','TH','TR','ID','GH','SA','VN','JP','AR','IT','ES','NL','CA','QA','PH','MX','KW','TZ','RU']

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [adminRedirect, setAdminRedirect] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => setMounted(true), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return setError('Please enter your email and password.')
    setLoading(true)
    setError('')
    setAdminRedirect(false)

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      // Admin accounts get a 403 — show helpful redirect
      if (res.status === 403) {
        setAdminRedirect(true)
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Invalid credentials')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: 'var(--black)', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="grid-bg" style={{ position:'absolute', inset:0, opacity:0.4 }} />
      <div style={{ position:'absolute', top:'-15%', left:'50%', transform:'translateX(-50%)', width:800, height:500, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 65%)', filter:'blur(30px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(240,192,64,0.05) 0%, transparent 70%)', filter:'blur(30px)', pointerEvents:'none' }} />

      {mounted && (
        <>
          <div style={{ position:'absolute', top:20, left:0, right:0, overflow:'hidden', pointerEvents:'none' }}>
            <div style={{ display:'flex', gap:10, animation:'scrollLeft 40s linear infinite', width:'max-content' }}>
              {[...STRIP_FLAGS, ...STRIP_FLAGS].map((cc, i) => (
                <div key={i} style={{ width:44, height:30, borderRadius:4, overflow:'hidden', opacity:0.12, border:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
                  <img src={flagUrl(cc)} alt={cc} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ position:'absolute', bottom:20, left:0, right:0, overflow:'hidden', pointerEvents:'none' }}>
            <div style={{ display:'flex', gap:10, animation:'scrollRight 50s linear infinite', width:'max-content' }}>
              {[...STRIP_FLAGS.slice(16), ...STRIP_FLAGS, ...STRIP_FLAGS.slice(0,16)].map((cc, i) => (
                <div key={i} style={{ width:44, height:30, borderRadius:4, overflow:'hidden', opacity:0.1, border:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
                  <img src={flagUrl(cc)} alt={cc} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:460, margin:'0 auto', padding:'0 20px' }}>
        <div style={{
          background: 'rgba(7,11,22,0.95)',
          border: '1px solid var(--border)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.04)',
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ height:2, background:'linear-gradient(90deg, transparent, var(--neon), var(--gold), var(--neon), transparent)' }} />

          <div style={{ padding:'40px 40px 36px' }}>

            {/* Logo */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginBottom:36 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(240,192,64,0.1))', border:'1px solid rgba(0,212,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, boxShadow:'0 0 24px rgba(0,212,255,0.2)', animation:'trophyBob 4s ease-in-out infinite' }}>🏆</div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, letterSpacing:'0.08em', color:'var(--white)', lineHeight:1 }}>HOLA PRIME</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', color:'var(--neon)', marginTop:3 }}>WORLD CUP 2026</div>
              </div>
            </div>

            <div style={{ textAlign:'center', marginBottom:32 }}>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color:'var(--white)', lineHeight:1, marginBottom:0, textTransform:'uppercase' }}>Trader Sign In</h1>
            </div>

            {/* Admin redirect banner */}
            {adminRedirect && (
              <div style={{ background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.25)', borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--neon)', marginBottom:6 }}>Admin Account Detected</div>
                <div style={{ fontSize:13, color:'var(--gray2)', lineHeight:1.65, marginBottom:12 }}>This account requires admin portal access. Sign in at the admin portal instead.</div>
                <Link href="/admin-login" style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', padding:'9px 16px', borderRadius:7, background:'var(--neon)', color:'var(--black)', textDecoration:'none', boxShadow:'0 0 16px rgba(0,212,255,0.35)' }}>
                  Go to Admin Login →
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

              <div>
                <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:8 }}>Email Address</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--gray3)', pointerEvents:'none' }}>✉</span>
                  <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); setAdminRedirect(false) }} autoComplete="email" style={{ paddingLeft:42 }} />
                </div>
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)' }}>Password</label>
                  <Link href="/forgot-password" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', color:'var(--neon)', textDecoration:'none', opacity:0.8 }}>Forgot?</Link>
                </div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--gray3)', pointerEvents:'none' }}>🔒</span>
                  <input type={showPw ? 'text' : 'password'} className="input-field" placeholder="Your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); setAdminRedirect(false) }} autoComplete="current-password" style={{ paddingLeft:42, paddingRight:46 }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:16, padding:'2px 4px' }}>{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, padding:'11px 14px' }}>
                  <span style={{ color:'var(--red)', flexShrink:0 }}>⚠</span>
                  <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop:4, width:'100%', padding:'15px', borderRadius:10, border:'none', cursor:loading?'not-allowed':'pointer', background:loading?'rgba(0,212,255,0.3)':'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:loading?'none':'0 0 24px rgba(0,212,255,0.4)', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:loading?0.7:1 }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform='translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}
              >
                {loading ? (
                  <><span style={{ display:'inline-block', width:16, height:16, border:'2px solid var(--black)', borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Signing in...</>
                ) : '→ Sign In'}
              </button>
            </form>

            <div style={{ display:'flex', alignItems:'center', gap:14, margin:'28px 0 24px' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', whiteSpace:'nowrap' }}>New to the World Cup?</span>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            <Link href="/register" style={{ display:'block', width:'100%', padding:'14px', borderRadius:10, textAlign:'center', border:'1px solid rgba(240,192,64,0.35)', background:'rgba(240,192,64,0.06)', color:'var(--gold)', fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, letterSpacing:'0.08em', textTransform:'uppercase', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(240,192,64,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(240,192,64,0.06)' }}
            >🏆 Register &amp; Claim Your Flag</Link>
          </div>

          <div style={{ padding:'16px 40px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'center', gap:24 }}>
            {[['Home','/'],['Rules','/rules'],['Support','/contact']].map(([label,href]) => (
              <Link key={href} href={href} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)', textDecoration:'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scrollLeft { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes scrollRight { from{transform:translateX(-50%)} to{transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes trophyBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </div>
  )
}
