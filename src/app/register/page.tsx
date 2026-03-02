'use client'
export const dynamic = 'force-dynamic'
// src/app/register/page.tsx
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'

const KycOnboardingModal = nextDynamic(
  () => import('@/components/kyc/KycOnboardingModal'),
  { ssr: false }
)

const COUNTRIES = [
  {code:'AE',name:'UAE'           },{code:'AU',name:'Australia'    },{code:'BR',name:'Brazil'        },
  {code:'CA',name:'Canada'        },{code:'DE',name:'Germany'      },{code:'EG',name:'Egypt'         },
  {code:'FR',name:'France'        },{code:'GB',name:'United Kingdom'},{code:'GH',name:'Ghana'        },
  {code:'IN',name:'India'         },{code:'ID',name:'Indonesia'    },{code:'JP',name:'Japan'         },
  {code:'KE',name:'Kenya'         },{code:'KW',name:'Kuwait'       },{code:'MY',name:'Malaysia'      },
  {code:'MX',name:'Mexico'        },{code:'NG',name:'Nigeria'      },{code:'PK',name:'Pakistan'      },
  {code:'PH',name:'Philippines'   },{code:'QA',name:'Qatar'        },{code:'SA',name:'Saudi Arabia'  },
  {code:'SG',name:'Singapore'     },{code:'ZA',name:'South Africa' },{code:'TH',name:'Thailand'      },
  {code:'TR',name:'Turkey'        },{code:'TZ',name:'Tanzania'     },{code:'VN',name:'Vietnam'       },
  {code:'NL',name:'Netherlands'   },{code:'IT',name:'Italy'        },{code:'ES',name:'Spain'         },
  {code:'AR',name:'Argentina'     },{code:'RU',name:'Russia'       },
]

const flagUrl = (code: string) => `https://flagcdn.com/w80/${(code||'').toLowerCase()}.png`

// Steps — payment step only shown when feeEnabled is true in admin panel
const BASE_STEPS = ['Country', 'Profile', 'Confirm']
const ALL_STEPS  = ['Country', 'Profile', 'Confirm', 'Payment']

// All payment providers — user picks one on the payment step
// Real brand logos fetched from official CDNs
const PROVIDERS = [
  {
    id: 'PAYPAL',
    name: 'PayPal',
    subtext: 'PayPal · Debit · Credit',
    icon: (
      <div style={{ width:56, height:40, background:'#ffffff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 8px', boxSizing:'border-box' as const }}>
        <img
          src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
          alt="PayPal"
          style={{ height:28, width:'auto', objectFit:'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.paypalobjects.com/webstatic/icon/pp258.png' }}
        />
      </div>
    ),
    color: '#009cde',
    border: 'rgba(0,156,222,0.35)',
    bg: 'rgba(0,156,222,0.07)',
  },
  {
    id: 'STRIPE',
    name: 'Card',
    subtext: 'Visa · Mastercard · Amex',
    icon: (
      <div style={{ width:56, height:40, background:'#635bff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 8px', boxSizing:'border-box' as const }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
          alt="Stripe"
          style={{ height:22, width:'auto', objectFit:'contain', filter:'brightness(0) invert(1)' }}
        />
      </div>
    ),
    color: '#635bff',
    border: 'rgba(99,91,255,0.35)',
    bg: 'rgba(99,91,255,0.07)',
  },
  {
    id: 'COINBASE',
    name: 'Crypto',
    subtext: 'BTC · ETH · USDC',
    icon: (
      <div style={{ width:56, height:40, background:'#0052ff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'6px', boxSizing:'border-box' as const }}>
        <img
          src="https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqyceHyd/2019c9167a1a3a16b8622e224b423b6f/Consumer_Wordmark_White.svg"
          alt="Coinbase"
          style={{ height:18, width:'auto', objectFit:'contain', filter:'brightness(0) invert(1)' }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://asset-logos.hackerrank.com/d3b9e264-6b1a-4258-8e1a-4a5b36e9da4b.png' }}
        />
      </div>
    ),
    color: '#0052ff',
    border: 'rgba(0,82,255,0.35)',
    bg: 'rgba(0,82,255,0.07)',
  },
  {
    id: 'NOWPAYMENTS',
    name: 'Crypto (100+)',
    subtext: 'USDT · SOL · BNB',
    icon: (
      <div style={{ width:56, height:40, background:'#1a1a2e', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'4px 6px', boxSizing:'border-box' as const, border:'1px solid rgba(106,176,76,0.3)' }}>
        <img
          src="https://nowpayments.io/images/logo/nowpayments_logo.svg"
          alt="NOWPayments"
          style={{ height:22, width:'auto', objectFit:'contain' }}
          onError={(e) => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            const parent = el.parentElement!
            parent.innerHTML = '<span style="font-size:11px;font-weight:900;color:#6ab04c;letter-spacing:-0.02em;font-family:monospace;">NOW<br/>PAY</span>'
          }}
        />
      </div>
    ),
    color: '#6ab04c',
    border: 'rgba(106,176,76,0.35)',
    bg: 'rgba(106,176,76,0.07)',
  },
  {
    id: 'MANUAL',
    name: 'Bank Transfer',
    subtext: 'Wire · SWIFT · SEPA',
    icon: (
      <div style={{ width:56, height:40, background:'rgba(240,192,64,0.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(240,192,64,0.25)', boxSizing:'border-box' as const }}>
        <svg viewBox="0 0 36 28" width="36" height="28" fill="none">
          <rect x="2" y="12" width="32" height="14" rx="2.5" fill="#f0c040" fillOpacity=".18"/>
          <rect x="2" y="12" width="32" height="5" fill="#f0c040" fillOpacity=".35"/>
          <path d="M18 2L34 12H2L18 2z" fill="#f0c040" fillOpacity=".65"/>
          <rect x="8" y="19" width="4" height="5" rx="1" fill="#f0c040" fillOpacity=".5"/>
          <rect x="16" y="19" width="4" height="5" rx="1" fill="#f0c040" fillOpacity=".5"/>
          <rect x="24" y="19" width="4" height="5" rx="1" fill="#f0c040" fillOpacity=".5"/>
        </svg>
      </div>
    ),
    color: '#f0c040',
    border: 'rgba(240,192,64,0.35)',
    bg: 'rgba(240,192,64,0.07)',
  },
]

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).paypal) { resolve(); return }
    const ex = document.getElementById('paypal-sdk')
    if (ex) { ex.addEventListener('load', () => resolve()); return }
    const s = document.createElement('script')
    s.id = 'paypal-sdk'
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('PayPal SDK failed'))
    document.body.appendChild(s)
  })
}

export default function RegisterPage() {
  // Payment config (from admin settings)
  const [payCfg, setPayCfg] = useState<any>(null)
  // Registration steps
  const [step, setStep]               = useState(0)
  const [countryCode, setCountryCode] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [form, setForm]               = useState({ firstName:'', lastName:'', displayName:'', email:'', password:'', confirmPassword:'', referralCode:'' })
  const [agree1, setAgree1]           = useState(false)
  const [agree2, setAgree2]           = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [showKyc, setShowKyc]         = useState(false)
  const [newTraderId, setNewTraderId] = useState('')
  const [hoveredCode, setHoveredCode] = useState('')
  // Payment state
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [paymentId, setPaymentId]     = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError]   = useState('')
  const [ppRendered, setPpRendered]   = useState(false)
  const [manualRef, setManualRef]     = useState('')
  const [manualInstr, setManualInstr] = useState('')
  const ppRef = useRef<string>('')

  const selected          = COUNTRIES.find(c => c.code === countryCode)
  const filteredCountries = COUNTRIES.filter(c => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
  const feeEnabled        = payCfg?.feeEnabled === true
  const fee               = payCfg?.registrationFee ?? 10
  const currency          = payCfg?.feeCurrency ?? 'USD'
  const STEPS             = feeEnabled ? ALL_STEPS : BASE_STEPS
  const isPayStep         = feeEnabled && step === 3

  // Load payment config + handle redirect-back from Stripe/Coinbase/NOW
  useEffect(() => {
    fetch('/api/payment/config').then(r => r.json()).then(d => { if (d.config) setPayCfg(d.config) }).catch(() => {})
    const p = new URLSearchParams(window.location.search)
    const pid = p.get('pid'), sid = p.get('session_id'), status = p.get('payment')
    if (status === 'success' && pid) {
      setPaymentId(pid)
      fetch('/api/payment/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ paymentId:pid, sessionId:sid }) })
        .then(r => r.json()).then(d => {
          if (d.verified) {
            setPaymentDone(true)
            try {
              const saved = sessionStorage.getItem('reg_form')
              if (saved) { const o = JSON.parse(saved); setForm(o.form); setCountryCode(o.countryCode); setAgree1(o.agree1); setAgree2(o.agree2); setSelectedProvider(o.provider||'') }
            } catch {}
            setStep(3)
          } else {
            setPaymentError('Payment could not be verified. Please try again.')
            setStep(3)
          }
        }).catch(() => {})
    }
  }, [])

  // Render PayPal buttons when provider is selected on payment step
  useEffect(() => {
    if (!isPayStep || selectedProvider !== 'PAYPAL' || paymentDone || ppRendered) return
    const clientId = payCfg?.paypalClientId
    if (!clientId) { setPaymentError('PayPal is not configured. Please choose another payment method.'); return }
    loadPayPalSdk(clientId, currency).then(() => {
      const w = window as any
      if (!w.paypal) return
      const el = document.getElementById('paypal-buttons')
      if (!el || el.childNodes.length > 0) return
      setPpRendered(true)
      w.paypal.Buttons({
        style: { layout:'vertical', color:'gold', shape:'rect', label:'pay', height:50 },
        createOrder: async () => {
          setPaymentError('')
          const r = await fetch('/api/payment/create-order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email: form.email, provider:'PAYPAL' }) })
          const d = await r.json()
          if (!d.orderId) throw new Error(d.error || 'Failed to create order')
          ppRef.current = d.paymentId
          setPaymentId(d.paymentId)
          return d.orderId
        },
        onApprove: async (data: any) => {
          setPaymentLoading(true)
          const r = await fetch('/api/payment/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ paymentId: ppRef.current, orderId: data.orderID }) })
          const d = await r.json()
          if (d.verified) { setPaymentDone(true) } else { setPaymentError('Payment verification failed. Contact support.') }
          setPaymentLoading(false)
        },
        onError: () => setPaymentError('PayPal error. Please try again or use a different payment method.'),
      }).render('#paypal-buttons')
    }).catch(() => setPaymentError('Could not load PayPal. Check your internet connection or choose another method.'))
  }, [isPayStep, selectedProvider, paymentDone, ppRendered, payCfg, currency])

  // Reset PayPal rendered state when provider changes
  useEffect(() => {
    if (selectedProvider !== 'PAYPAL') {
      setPpRendered(false)
      const el = document.getElementById('paypal-buttons')
      if (el) el.innerHTML = ''
    }
    setPaymentError('')
    setManualRef('')
  }, [selectedProvider])

  const f = (k: string, v: string) => { setForm(p => ({...p, [k]: v})); setError('') }

  const next = () => {
    setError('')
    if (step === 0 && !countryCode) return setError('Please select your country')
    if (step === 1) {
      if (!form.firstName || !form.lastName)       return setError('Enter your full name')
      if (!form.email.includes('@'))               return setError('Enter a valid email')
      if (form.password.length < 8)               return setError('Password must be 8+ characters')
      if (!/[A-Z]/.test(form.password))           return setError('Password must contain an uppercase letter')
      if (!/[0-9]/.test(form.password))           return setError('Password must contain a number')
      if (form.password !== form.confirmPassword)  return setError('Passwords do not match')
      if (form.displayName.length < 3)            return setError('Display name must be 3+ characters')
    }
    if (step === 2) {
      if (!agree1) return setError('Please agree to the Terms & Conditions')
      if (!agree2) return setError('Please confirm you are 18+')
      sessionStorage.setItem('reg_form', JSON.stringify({ form, countryCode, agree1, agree2, provider: selectedProvider }))
      // If fee disabled, submit directly without going to payment step
      if (!feeEnabled) { submit(); return }
    }
    setStep(s => s + 1)
  }

  const handleRedirectPay = async () => {
    if (!selectedProvider) { setPaymentError('Please select a payment method'); return }
    setPaymentLoading(true); setPaymentError('')
    try {
      const r = await fetch('/api/payment/create-order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email: form.email, provider: selectedProvider }) })
      const d = await r.json()
      if (d.redirectUrl) { sessionStorage.setItem('reg_form', JSON.stringify({ form, countryCode, agree1, agree2, provider: selectedProvider })); window.location.href = d.redirectUrl }
      else if (d.reference) { setManualRef(d.reference); setManualInstr(d.instructions || ''); setPaymentId(d.paymentId) }
      else { setPaymentError(d.error || 'Failed to initiate payment. Check your admin payment configuration.') }
    } catch { setPaymentError('Network error. Please try again.') }
    setPaymentLoading(false)
  }

  const submit = async () => {
    // Only block if payment is enabled and not done
    if (feeEnabled && !paymentDone && selectedProvider !== 'MANUAL') {
      setError('Payment must be completed before you can register.')
      return
    }
    setLoading(true)
    try {
      const body: any = { ...form, countryCode }
      if (paymentId) body.paymentId = paymentId
      const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Registration failed')
      setNewTraderId(d.traderId || d.trader?.id || '')
      sessionStorage.removeItem('reg_form')
      setDone(true); setShowKyc(true)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (done) return (
    <>
      <div style={{ background:'var(--black)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(0,230,118,0.1)', border:'2px solid rgba(0,230,118,0.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 32px', fontSize:36 }}>✓</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:48, color:'var(--white)', marginBottom:12 }}>You're In!</h1>
          <p style={{ color:'var(--gray2)', marginBottom:24, fontSize:16, lineHeight:1.6 }}>Welcome to Hola Prime World Cup. Registration & payment confirmed.</p>
          {selected && (
            <div className="card" style={{ display:'inline-block', padding:'28px 48px', marginBottom:32 }}>
              <img src={flagUrl(selected.code)} alt={selected.name} style={{ width:80, borderRadius:6, display:'block', margin:'0 auto 16px' }} />
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', color:'var(--gray3)', textTransform:'uppercase', marginBottom:4 }}>Representing</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--gold)' }}>{selected.name}</div>
            </div>
          )}
          {!showKyc && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
              <button onClick={() => setShowKyc(true)} style={{ padding:'14px 32px', borderRadius:10, border:'none', cursor:'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.08em', textTransform:'uppercase', boxShadow:'0 0 24px rgba(0,212,255,0.4)' }}>
                🪪 Complete KYC Verification →
              </button>
              <Link href="/dashboard" style={{ fontSize:13, color:'var(--gray3)', textDecoration:'none' }}>Skip for now</Link>
            </div>
          )}
        </div>
      </div>
      {showKyc && <KycOnboardingModal traderId={newTraderId||'demo-trader'} displayName={form.displayName||form.firstName} onClose={() => { setShowKyc(false); window.location.href = '/dashboard' }} />}
    </>
  )

  return (
    <div style={{ background:'var(--black)', minHeight:'100vh', display:'flex' }}>

      {/* ── Left branding panel ─────────────────────────────────── */}
      <div className="reg-left-panel" style={{ width:'38%', background:'var(--deep)', borderRight:'1px solid var(--border)', padding:'64px 48px', flexDirection:'column', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-10%', right:'-10%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 70%)', filter:'blur(30px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-5%', left:'-5%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(240,192,64,0.07) 0%,transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }} />
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none', marginBottom:56 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'var(--neon)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 16px rgba(0,212,255,0.4)' }}>🏆</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, letterSpacing:'0.06em', color:'var(--white)' }}>HOLA PRIME</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.2em', color:'var(--neon)' }}>WORLD CUP</div>
          </div>
        </Link>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(40px,3.5vw,54px)', color:'var(--white)', lineHeight:0.95, marginBottom:24, textTransform:'uppercase' }}>
          CLAIM<br />YOUR<br /><span className="text-shimmer">FLAG.</span>
        </h2>
        <p style={{ color:'var(--gray2)', fontSize:15, lineHeight:1.7, marginBottom:32, maxWidth:300 }}>
          One trader per country. Compete for $60,000 on a fully funded $10K account.
        </p>
        {['✅ $10,000 funded account provided', '✅ Trade qualifier your way', '✅ H2H bracket from June 15', '✅ Grand Final July 18, 2026'].map(t => (
          <div key={t} style={{ color:'var(--gray1)', fontSize:14, marginBottom:9 }}>{t}</div>
        ))}
        {/* Fee badge — only show when fee is enabled */}
        {feeEnabled && (
        <div style={{ marginTop:32, display:'inline-flex', alignItems:'center', gap:12, background:'rgba(240,192,64,0.08)', border:'1px solid rgba(240,192,64,0.25)', borderRadius:10, padding:'14px 20px' }}>
          <span style={{ fontSize:22 }}>💳</span>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--gold)', lineHeight:1 }}>{currency} {fee}</div>
            <div style={{ fontSize:11, color:'var(--gray3)', marginTop:3 }}>One-time registration fee</div>
          </div>
        </div>
        )}
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 48px', maxWidth:620, width:'100%', margin:'0 auto', overflowY:'auto' }}>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:36 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, transition:'all 0.3s',
                  background: (i < step || (i === 3 && paymentDone)) ? 'var(--green)' : i === step ? 'var(--neon)' : 'var(--surface2)',
                  color: (i <= step) ? 'var(--black)' : 'var(--gray3)',
                  boxShadow: i === step ? '0 0 14px rgba(0,212,255,0.5)' : 'none',
                }}>
                  {(i < step || (i === 3 && paymentDone)) ? '✓' : i + 1}
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: i === step ? (i === 3 ? 'var(--gold)' : 'var(--neon)') : 'var(--gray3)', whiteSpace:'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex:1, height:1, background: i < step ? 'var(--green)' : 'var(--border2)', margin:'0 8px', marginBottom:18, transition:'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            STEP 0 — Country
        ══════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="animate-fade-up">
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:38, color:'var(--white)', marginBottom:6, textTransform:'uppercase' }}>Choose Your Country</h1>
            <p style={{ color:'var(--gray2)', marginBottom:20, fontSize:14 }}>You will represent this nation in the tournament.</p>
            <input className="input-field" placeholder="🔍  Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} style={{ marginBottom:16 }} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, maxHeight:400, overflowY:'auto', paddingRight:4 }}>
              {filteredCountries.map(c => {
                const isSel = countryCode === c.code, isHov = hoveredCode === c.code
                return (
                  <button key={c.code} onClick={() => { setCountryCode(c.code); setError('') }} onMouseEnter={() => setHoveredCode(c.code)} onMouseLeave={() => setHoveredCode('')}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'12px 6px', background:isSel?'rgba(0,212,255,0.1)':isHov?'var(--surface2)':'var(--surface)', border:`1px solid ${isSel?'rgba(0,212,255,0.5)':isHov?'var(--border2)':'var(--border)'}`, borderRadius:9, cursor:'pointer', transition:'all 0.15s', transform:isSel?'scale(1.04)':isHov?'scale(1.02)':'scale(1)', position:'relative' }}>
                    {isSel && <div style={{ position:'absolute', top:5, right:5, width:15, height:15, borderRadius:'50%', background:'var(--neon)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:8, color:'var(--black)', fontWeight:900 }}>✓</span></div>}
                    <div style={{ width:48, height:33, borderRadius:4, overflow:'hidden', border:`1px solid ${isSel?'rgba(0,212,255,0.4)':'rgba(255,255,255,0.08)'}`, flexShrink:0 }}>
                      <img src={flagUrl(c.code)} alt={c.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} loading="lazy" />
                    </div>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:isSel?800:600, fontSize:9, letterSpacing:'0.03em', textTransform:'uppercase', color:isSel?'var(--neon)':'var(--gray2)', textAlign:'center', lineHeight:1.2 }}>{c.name}</span>
                  </button>
                )
              })}
            </div>
            {selected && (
              <div style={{ marginTop:14, background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:52, height:36, borderRadius:4, overflow:'hidden', flexShrink:0 }}><img src={flagUrl(selected.code)} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /></div>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, color:'var(--white)' }}>Representing {selected.name}</div>
                  <div style={{ fontSize:11, color:'var(--gray3)' }}>One spot per country · First come, first served</div>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:16, color:'var(--neon)', fontWeight:700, marginLeft:'auto' }}>{selected.code}</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 1 — Profile
        ══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="animate-fade-up">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
              {selected && <div style={{ width:48, height:33, borderRadius:4, overflow:'hidden', border:'1px solid rgba(0,212,255,0.3)', flexShrink:0 }}><img src={flagUrl(selected.code)} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /></div>}
              <div>
                <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, textTransform:'uppercase' }}>Your Profile</h1>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.1em', color:'var(--neon)', marginTop:2 }}>{selected?.name} · {selected?.code}</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label className="field-label">First Name</label><input className="input-field" placeholder="Alex" value={form.firstName} onChange={e => f('firstName', e.target.value)} /></div>
                <div><label className="field-label">Last Name</label><input className="input-field" placeholder="Smith" value={form.lastName} onChange={e => f('lastName', e.target.value)} /></div>
              </div>
              <div><label className="field-label">Display Name <span style={{ color:'var(--gray3)', fontWeight:400, fontSize:10, textTransform:'none', letterSpacing:0 }}>— shown on leaderboard</span></label><input className="input-field" placeholder="TraderAlex" value={form.displayName} onChange={e => f('displayName', e.target.value)} /></div>
              <div><label className="field-label">Email</label><input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => f('email', e.target.value)} /></div>
              <div><label className="field-label">Password</label><input className="input-field" type="password" placeholder="Min 8 chars · 1 uppercase · 1 number" value={form.password} onChange={e => f('password', e.target.value)} /></div>
              <div><label className="field-label">Confirm Password</label><input className="input-field" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} /></div>
              <div><label className="field-label">Referral Code <span style={{ color:'var(--gray3)', fontWeight:400, fontSize:10, textTransform:'none', letterSpacing:0 }}>— optional</span></label><input className="input-field" placeholder="HP-XXXX" value={form.referralCode} onChange={e => f('referralCode', e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 2 — Confirm
        ══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:38, color:'var(--white)', marginBottom:6, textTransform:'uppercase' }}>Review & Agree</h1>
            <p style={{ color:'var(--gray2)', marginBottom:20, fontSize:14 }}>{feeEnabled ? 'Almost there — review your details then proceed to payment.' : 'Almost there — review your details and complete registration.'}</p>
            <div className="card" style={{ marginBottom:18, padding:'18px 20px' }}>
              {selected && (
                <div style={{ display:'flex', alignItems:'center', gap:14, paddingBottom:14, marginBottom:14, borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:56, height:38, borderRadius:5, overflow:'hidden', border:'1px solid rgba(0,212,255,0.3)', flexShrink:0 }}><img src={flagUrl(selected.code)} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} /></div>
                  <div><div style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)' }}>Country</div><div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--white)' }}>{selected.name}</div></div>
                </div>
              )}
              {[['Display Name', form.displayName], ['Email', form.email], ['Name', `${form.firstName} ${form.lastName}`]].map(([lbl, val]) => (
                <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)' }}>{lbl}</span>
                  <span style={{ fontSize:13, color:'var(--gray1)' }}>{val}</span>
                </div>
              ))}
              {/* Fee line — only show when payment is enabled */}
              {feeEnabled && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', marginTop:4 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)' }}>💳 Registration Fee</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--gold)' }}>{currency} {fee}</span>
              </div>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:6 }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={agree1} onChange={e => setAgree1(e.target.checked)} style={{ marginTop:3, accentColor:'var(--neon)', width:15, height:15 }} />
                <span style={{ fontSize:13, color:'var(--gray2)', lineHeight:1.6 }}>I have read and agree to the <Link href="/terms" style={{ color:'var(--neon)', textDecoration:'none' }}>Terms & Conditions</Link> and <Link href="/rules" style={{ color:'var(--neon)', textDecoration:'none' }}>Tournament Rulebook</Link></span>
              </label>
              <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={agree2} onChange={e => setAgree2(e.target.checked)} style={{ marginTop:3, accentColor:'var(--neon)', width:15, height:15 }} />
                <span style={{ fontSize:13, color:'var(--gray2)', lineHeight:1.6 }}>I confirm I am 18+ and a resident of an eligible country</span>
              </label>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 3 — PAYMENT (only shown when feeEnabled in admin)
        ══════════════════════════════════════════════════════════ */}
        {step === 3 && feeEnabled && (
          <div className="animate-fade-up">

            {/* ── Payment complete screen ──────────────────────── */}
            {paymentDone ? (
              <div style={{ textAlign:'center' }}>
                <div style={{ width:76, height:76, borderRadius:'50%', background:'rgba(0,230,118,0.1)', border:'2px solid rgba(0,230,118,0.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:32 }}>✅</div>
                <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', marginBottom:10, textTransform:'uppercase' }}>Payment Confirmed!</h1>
                <div style={{ background:'rgba(0,230,118,0.07)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:10, padding:'18px 24px', marginBottom:24 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--green)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>✓ {currency} {fee} payment received</div>
                  <div style={{ fontSize:13, color:'var(--gray2)' }}>Your registration fee has been verified. Click below to complete your account setup.</div>
                </div>
              </div>
            ) : (
              <>
                {/* Fee banner */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                  <div>
                    <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, textTransform:'uppercase', margin:0 }}>Registration Fee</h1>
                    <div style={{ fontSize:13, color:'var(--gray3)', marginTop:6 }}>Complete payment to activate your account</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color:'var(--gold)', lineHeight:1 }}>{currency} {fee}</div>
                    <div style={{ fontSize:11, color:'var(--gray3)', marginTop:3 }}>One-time · Non-refundable</div>
                  </div>
                </div>

                {/* ── Choose payment method ─────────────────────── */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:12 }}>
                    Choose Payment Method
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                    {PROVIDERS.map(p => {
                      const isSel = selectedProvider === p.id
                      return (
                        <button key={p.id} onClick={() => { setSelectedProvider(p.id); setPaymentError('') }}
                          style={{ padding:'14px 8px 12px', borderRadius:10, border:`2px solid ${isSel ? p.color : 'var(--border2)'}`, background: isSel ? p.bg : 'rgba(0,0,0,0.2)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all 0.15s', position:'relative', transform: isSel ? 'translateY(-2px)' : 'none', boxShadow: isSel ? `0 4px 20px ${p.border}` : 'none' }}>
                          {isSel && <div style={{ position:'absolute', top:5, right:5, width:14, height:14, borderRadius:'50%', background:p.color, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:8, color:'#fff', fontWeight:900 }}>✓</span></div>}
                          {p.icon}
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:10, color: isSel ? p.color : 'var(--gray2)', lineHeight:1.2, letterSpacing:'0.02em' }}>{p.name}</div>
                            <div style={{ fontSize:9, color:'var(--gray3)', marginTop:2, lineHeight:1.3 }}>{p.subtext}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Payment UI for selected provider ─────────── */}
                {selectedProvider && (
                  <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px', marginBottom:4 }}>

                    {/* PayPal */}
                    {selectedProvider === 'PAYPAL' && (
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#009cde', marginBottom:14 }}>🅿 Pay with PayPal</div>
                        <div id="paypal-buttons" style={{ minHeight:55 }} />
                        {paymentLoading && <div style={{ textAlign:'center', padding:12, color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:12 }}>Verifying payment…</div>}
                      </div>
                    )}

                    {/* Stripe */}
                    {selectedProvider === 'STRIPE' && (
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#635bff', marginBottom:14 }}>⚡ Pay with Card (Stripe)</div>
                        <button onClick={handleRedirectPay} disabled={paymentLoading} style={{ width:'100%', padding:'15px', borderRadius:9, border:'none', cursor:paymentLoading?'not-allowed':'pointer', background:'linear-gradient(135deg,#635bff,#4b45cc)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.06em', opacity:paymentLoading?0.7:1, boxShadow:'0 4px 20px rgba(99,91,255,0.3)' }}>
                          {paymentLoading ? 'Redirecting to Stripe…' : `Pay ${currency} ${fee} with Card →`}
                        </button>
                        <div style={{ fontSize:11, color:'var(--gray3)', textAlign:'center', marginTop:8 }}>Secure checkout · Visa · Mastercard · Amex · Apple Pay</div>
                      </div>
                    )}

                    {/* Coinbase */}
                    {selectedProvider === 'COINBASE' && (
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#0052ff', marginBottom:14 }}>₿ Pay with Crypto (Coinbase Commerce)</div>
                        <button onClick={handleRedirectPay} disabled={paymentLoading} style={{ width:'100%', padding:'15px', borderRadius:9, border:'none', cursor:paymentLoading?'not-allowed':'pointer', background:'linear-gradient(135deg,#0052ff,#003ec4)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.06em', opacity:paymentLoading?0.7:1, boxShadow:'0 4px 20px rgba(0,82,255,0.3)' }}>
                          {paymentLoading ? 'Creating charge…' : `Pay ${currency} ${fee} — BTC · ETH · USDC →`}
                        </button>
                        <div style={{ fontSize:11, color:'var(--gray3)', textAlign:'center', marginTop:8 }}>Powered by Coinbase Commerce · 10+ cryptocurrencies</div>
                      </div>
                    )}

                    {/* NOWPayments */}
                    {selectedProvider === 'NOWPAYMENTS' && (
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#6ab04c', marginBottom:14 }}>🔷 Pay with Crypto (NOWPayments)</div>
                        <button onClick={handleRedirectPay} disabled={paymentLoading} style={{ width:'100%', padding:'15px', borderRadius:9, border:'none', cursor:paymentLoading?'not-allowed':'pointer', background:'linear-gradient(135deg,#6ab04c,#4d8a34)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.06em', opacity:paymentLoading?0.7:1, boxShadow:'0 4px 20px rgba(106,176,76,0.3)' }}>
                          {paymentLoading ? 'Creating invoice…' : `Pay ${currency} ${fee} — 100+ Cryptos →`}
                        </button>
                        <div style={{ fontSize:11, color:'var(--gray3)', textAlign:'center', marginTop:8 }}>USDT · SOL · BNB · XRP · DOGE and more</div>
                      </div>
                    )}

                    {/* Manual bank transfer */}
                    {selectedProvider === 'MANUAL' && (
                      !manualRef ? (
                        <div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#f0c040', marginBottom:14 }}>🏦 Bank Transfer</div>
                          <button onClick={handleRedirectPay} disabled={paymentLoading} style={{ width:'100%', padding:'15px', borderRadius:9, border:'1px solid rgba(240,192,64,0.3)', cursor:paymentLoading?'not-allowed':'pointer', background:'rgba(240,192,64,0.08)', color:'var(--gold)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, opacity:paymentLoading?0.7:1 }}>
                            {paymentLoading ? 'Generating reference…' : 'Get Bank Transfer Details →'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#f0c040', marginBottom:12 }}>🏦 Bank Transfer Instructions</div>
                          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray2)', lineHeight:1.9, whiteSpace:'pre-wrap', background:'rgba(0,0,0,0.3)', borderRadius:8, padding:'14px', marginBottom:14 }}>{manualInstr}</div>
                          <div style={{ background:'rgba(240,192,64,0.08)', border:'1px solid rgba(240,192,64,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:12 }}>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:4 }}>Your Payment Reference</div>
                            <div style={{ fontFamily:'var(--font-mono)', fontWeight:900, fontSize:22, color:'var(--gold)', letterSpacing:'0.12em' }}>{manualRef}</div>
                          </div>
                          <div style={{ fontSize:12, color:'rgba(255,200,60,0.7)', lineHeight:1.6 }}>⚠ Include this reference in your transfer. Your account will be activated within 24 hours after admin verification.</div>
                        </div>
                      )
                    )}

                    {paymentError && (
                      <div style={{ marginTop:14, padding:'11px 14px', background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, color:'var(--red)', fontSize:13 }}>⚠ {paymentError}</div>
                    )}
                  </div>
                )}

                {!selectedProvider && (
                  <div style={{ background:'rgba(240,192,64,0.04)', border:'1px dashed rgba(240,192,64,0.2)', borderRadius:10, padding:'16px', textAlign:'center', color:'var(--gray3)', fontSize:13 }}>
                    ↑ Select a payment method above to continue
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, padding:'12px 16px', marginTop:16 }}>
            <span style={{ color:'var(--red)', fontSize:14 }}>⚠ {error}</span>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:'flex', gap:12, marginTop:20 }}>
          {step > 0 && !paymentDone && (
            <button onClick={() => { setStep(s => s - 1); setError('') }} className="btn-outline" style={{ flex:1 }}>← Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-neon" style={{ flex:2 }}>Continue →</button>
          ) : !feeEnabled ? (
            <button onClick={submit} disabled={loading} className="btn-gold" style={{ flex:1, opacity:loading?0.6:1 }}>
              {loading ? 'Creating Account…' : '🏆 Complete Registration →'}
            </button>
          ) : isPayStep && paymentDone ? (
            <button onClick={submit} disabled={loading} className="btn-gold" style={{ flex:1, opacity:loading?0.6:1 }}>
              {loading ? 'Creating Account…' : '🏆 Complete Registration →'}
            </button>
          ) : isPayStep && selectedProvider === 'MANUAL' && manualRef ? (
            <button onClick={submit} disabled={loading} style={{ flex:1, padding:'13px', borderRadius:9, border:'1px solid rgba(240,192,64,0.3)', background:'rgba(240,192,64,0.08)', color:'var(--gold)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.07em', textTransform:'uppercase', cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
              {loading ? 'Submitting…' : 'Submit — Pending Verification →'}
            </button>
          ) : null}
        </div>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--gray3)', marginTop:18 }}>
          Already registered?{' '}<Link href="/login" style={{ color:'var(--neon)', textDecoration:'none' }}>Sign in →</Link>
        </p>
      </div>

      <style>{`
        .reg-left-panel { display: none; }
        @media (min-width: 900px) { .reg-left-panel { display: flex !important; } }
        .field-label { display:block; font-family:var(--font-display); font-weight:700; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; color:var(--gray2); margin-bottom:7px; }
      `}</style>
    </div>
  )
}
