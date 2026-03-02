'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/payment/page.tsx
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

type Provider = 'PAYPAL' | 'STRIPE' | 'COINBASE' | 'NOWPAYMENTS' | 'MANUAL'

interface PayConfig {
  feeEnabled: boolean
  registrationFee: number
  feeCurrency: string
  provider: Provider
  paypalClientId: string
  paypalClientSecret: string
  paypalMode: 'sandbox' | 'live'
  stripePublishableKey: string
  stripeSecretKey: string
  stripeWebhookSecret: string
  coinbaseApiKey: string
  coinbaseWebhookSecret: string
  nowpaymentsApiKey: string
  nowpaymentsIpnSecret: string
  manualInstructions: string
}

const DEFAULTS: PayConfig = {
  feeEnabled: false, registrationFee: 10, feeCurrency: 'USD', provider: 'PAYPAL',
  paypalClientId:'', paypalClientSecret:'', paypalMode:'sandbox',
  stripePublishableKey:'', stripeSecretKey:'', stripeWebhookSecret:'',
  coinbaseApiKey:'', coinbaseWebhookSecret:'',
  nowpaymentsApiKey:'', nowpaymentsIpnSecret:'',
  manualInstructions:'',
}

const PROVIDERS: { id: Provider; name: string; icon: string; color: string; border: string; bg: string; desc: string; docs: string }[] = [
  { id:'PAYPAL',       name:'PayPal',            icon:'🅿',  color:'#009cde', border:'rgba(0,156,222,0.3)',  bg:'rgba(0,156,222,0.06)',  desc:'Most widely used. Supports cards + PayPal wallet. Easy sandbox testing.',          docs:'https://developer.paypal.com/docs/checkout/' },
  { id:'STRIPE',       name:'Stripe',            icon:'⚡',  color:'#635bff', border:'rgba(99,91,255,0.3)',   bg:'rgba(99,91,255,0.06)',   desc:'Best card processing. Hosted checkout page. Excellent developer experience.',      docs:'https://stripe.com/docs/payments/checkout' },
  { id:'COINBASE',     name:'Coinbase Commerce', icon:'₿',   color:'#0052ff', border:'rgba(0,82,255,0.3)',    bg:'rgba(0,82,255,0.06)',    desc:'Accept Bitcoin, ETH, USDC and other crypto. No chargebacks.',                     docs:'https://docs.cloud.coinbase.com/commerce' },
  { id:'NOWPAYMENTS',  name:'NOWPayments',       icon:'🔷',  color:'#6ab04c', border:'rgba(106,176,76,0.3)',  bg:'rgba(106,176,76,0.06)',  desc:'100+ cryptocurrencies. Auto-converts to stablecoins. Great for global traders.',   docs:'https://nowpayments.io/docs' },
  { id:'MANUAL',       name:'Manual / Bank Wire', icon:'🏦', color:'#f0c040', border:'rgba(240,192,64,0.3)',  bg:'rgba(240,192,64,0.06)', desc:'Display custom bank transfer instructions. Requires manual admin verification.',   docs:'' },
]

const inp: React.CSSProperties = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'rgba(0,0,0,0.3)', color:'var(--white)', fontFamily:'var(--font-mono)', fontSize:13, outline:'none', boxSizing:'border-box' as const }
const lbl: React.CSSProperties = { fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase' as const, color:'var(--gray3)', display:'block', marginBottom:6 }

function SecretInput({ label, note, value, onChange, placeholder }: any) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label style={lbl}>{label}</label>
      {note && <div style={{ fontSize:11, color:'var(--gray3)', marginBottom:5 }}>{note}</div>}
      <div style={{ position:'relative' }}>
        <input style={inp} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '••••••••••••••••'} />
        <button onClick={() => setShow(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:14 }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}

export default function AdminPaymentPage() {
  const [cfg, setCfg]       = useState<PayConfig>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(true)

  const f = (k: keyof PayConfig, v: any) => setCfg(p => ({...p, [k]: v}))

  useEffect(() => {
    fetch('/api/admin/payment', { credentials:'include' })
      .then(r => r.json())
      .then(d => { if (d.config) setCfg({ ...DEFAULTS, ...d.config }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cfg),
      })
      const d = await res.json()
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else { setError(d.error || 'Save failed') }
    } catch { setError('Network error') }
    setSaving(false)
  }

  const selectedProvider = PROVIDERS.find(p => p.id === cfg.provider)!

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'

  return (
    <AdminLayout>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>System</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, margin:0 }}>Payment Configuration</h1>
            <p style={{ fontSize:13, color:'var(--gray3)', marginTop:6 }}>Configure the registration fee and payment provider for the tournament.</p>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            {saved && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--green)', letterSpacing:'0.08em' }}>✓ SAVED — LIVE</span>}
            {error && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--red)' }}>{error}</span>}
            <button onClick={handleSave} disabled={saving} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px 28px', borderRadius:8, border:'none', cursor:saving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', boxShadow:'0 0 16px rgba(0,212,255,0.3)', opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--gray3)' }}>Loading…</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── Fee Toggle ─────────────────────────────────────────────── */}
          <div style={{ background:'var(--surface)', border:`1px solid ${cfg.feeEnabled ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--deep)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>💳</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--white)' }}>Registration Fee</span>
            </div>
            <div style={{ padding:'24px' }}>
              {/* Enable toggle */}
              <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'16px 20px', borderRadius:10, background: cfg.feeEnabled ? 'rgba(0,212,255,0.06)' : 'rgba(0,0,0,0.2)', border:`1px solid ${cfg.feeEnabled ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`, marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color: cfg.feeEnabled ? 'var(--neon)' : 'var(--white)' }}>
                    {cfg.feeEnabled ? '● Registration fee ENABLED' : '○ Registration is FREE'}
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray3)', marginTop:3 }}>
                    {cfg.feeEnabled ? 'Users must pay before completing registration.' : 'Toggle on to require a payment fee.'}
                  </div>
                </div>
                <div onClick={() => f('feeEnabled', !cfg.feeEnabled)} style={{ width:48, height:26, borderRadius:13, background: cfg.feeEnabled ? 'var(--neon)' : 'var(--border2)', position:'relative', transition:'background 0.2s', cursor:'pointer', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: cfg.feeEnabled ? 25 : 3, width:20, height:20, borderRadius:'50%', background:'var(--white)', transition:'left 0.2s' }} />
                </div>
              </label>

              {/* Fee amount + currency */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={lbl}>Fee Amount</label>
                  <input style={inp} type="number" min="0" step="0.01" value={cfg.registrationFee} onChange={e => f('registrationFee', parseFloat(e.target.value)||0)} />
                </div>
                <div>
                  <label style={lbl}>Currency</label>
                  <select style={{...inp, cursor:'pointer'}} value={cfg.feeCurrency} onChange={e => f('feeCurrency', e.target.value)}>
                    {['USD','EUR','GBP','AED','SAR','SGD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {cfg.feeEnabled && (
                <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(240,192,64,0.06)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:8, fontSize:12, color:'rgba(240,192,64,0.9)', lineHeight:1.6 }}>
                  ⚠ Fee is live. New registrations will require a {cfg.feeCurrency} {cfg.registrationFee} payment before the account is created.
                </div>
              )}
            </div>
          </div>

          {/* ── Provider Selection ─────────────────────────────────────── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--deep)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🔌</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--white)' }}>Payment Provider</span>
            </div>
            <div style={{ padding:'24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:28 }}>
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => f('provider', p.id)} style={{ padding:'16px 14px', borderRadius:10, border:`2px solid ${cfg.provider===p.id ? p.color : 'var(--border2)'}`, background: cfg.provider===p.id ? p.bg : 'rgba(0,0,0,0.2)', cursor:'pointer', textAlign:'left' as const, transition:'all 0.15s' }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>{p.icon}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color: cfg.provider===p.id ? p.color : 'var(--gray2)', marginBottom:4 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:'var(--gray3)', lineHeight:1.4 }}>{p.desc}</div>
                    {p.docs && <a href={p.docs} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:10, color: p.color, marginTop:6, display:'block', opacity:0.8 }}>Docs →</a>}
                  </button>
                ))}
              </div>

              {/* ── PayPal credentials ─────────────────────────── */}
              {cfg.provider === 'PAYPAL' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(0,156,222,0.06)', border:'1px solid rgba(0,156,222,0.2)', borderRadius:8, fontSize:12, color:'rgba(0,156,222,0.9)', lineHeight:1.7 }}>
                    Create a PayPal App at <strong>developer.paypal.com → My Apps & Credentials</strong>. Use Sandbox for testing, switch to Live when ready.
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div>
                      <label style={lbl}>Environment</label>
                      <div style={{ display:'flex', gap:8 }}>
                        {(['sandbox','live'] as const).map(m => (
                          <button key={m} onClick={() => f('paypalMode', m)} style={{ flex:1, padding:'9px', borderRadius:7, border:`1px solid ${cfg.paypalMode===m?'#009cde':'var(--border2)'}`, background:cfg.paypalMode===m?'rgba(0,156,222,0.1)':'transparent', color:cfg.paypalMode===m?'#009cde':'var(--gray3)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, cursor:'pointer', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Client ID</label>
                    <input style={inp} value={cfg.paypalClientId} onChange={e => f('paypalClientId', e.target.value)} placeholder="AaBbCc..." />
                  </div>
                  <SecretInput label="Client Secret" value={cfg.paypalClientSecret} onChange={(v:string) => f('paypalClientSecret', v)} placeholder="EaBbCc..." />
                  <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>Webhook URL (add in PayPal developer dashboard)</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--neon)' }}>{appUrl}/api/payment/webhook?provider=paypal</div>
                  </div>
                </div>
              )}

              {/* ── Stripe credentials ─────────────────────────── */}
              {cfg.provider === 'STRIPE' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(99,91,255,0.06)', border:'1px solid rgba(99,91,255,0.2)', borderRadius:8, fontSize:12, color:'rgba(180,170,255,0.9)', lineHeight:1.7 }}>
                    Get API keys from <strong>dashboard.stripe.com → Developers → API keys</strong>. Use test keys for development.
                  </div>
                  <div>
                    <label style={lbl}>Publishable Key</label>
                    <input style={inp} value={cfg.stripePublishableKey} onChange={e => f('stripePublishableKey', e.target.value)} placeholder="pk_test_..." />
                  </div>
                  <SecretInput label="Secret Key" value={cfg.stripeSecretKey} onChange={(v:string) => f('stripeSecretKey', v)} placeholder="sk_test_..." />
                  <SecretInput label="Webhook Secret" note="From Stripe dashboard → Developers → Webhooks" value={cfg.stripeWebhookSecret} onChange={(v:string) => f('stripeWebhookSecret', v)} placeholder="whsec_..." />
                  <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>Webhook endpoint (add in Stripe dashboard)</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#635bff' }}>{appUrl}/api/payment/webhook?provider=stripe</div>
                    <div style={{ fontSize:11, color:'var(--gray3)', marginTop:4 }}>Events to enable: checkout.session.completed, checkout.session.expired</div>
                  </div>
                </div>
              )}

              {/* ── Coinbase credentials ────────────────────────── */}
              {cfg.provider === 'COINBASE' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(0,82,255,0.06)', border:'1px solid rgba(0,82,255,0.2)', borderRadius:8, fontSize:12, color:'rgba(100,160,255,0.9)', lineHeight:1.7 }}>
                    Create an API key at <strong>commerce.coinbase.com → Settings → API keys</strong>. Supports BTC, ETH, USDC, and 10+ more.
                  </div>
                  <SecretInput label="API Key" value={cfg.coinbaseApiKey} onChange={(v:string) => f('coinbaseApiKey', v)} placeholder="Your Coinbase Commerce API key" />
                  <SecretInput label="Webhook Secret" value={cfg.coinbaseWebhookSecret} onChange={(v:string) => f('coinbaseWebhookSecret', v)} placeholder="Webhook shared secret" />
                  <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>Webhook URL</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#0052ff' }}>{appUrl}/api/payment/webhook?provider=coinbase</div>
                  </div>
                </div>
              )}

              {/* ── NOWPayments credentials ─────────────────────── */}
              {cfg.provider === 'NOWPAYMENTS' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(106,176,76,0.06)', border:'1px solid rgba(106,176,76,0.2)', borderRadius:8, fontSize:12, color:'rgba(150,210,130,0.9)', lineHeight:1.7 }}>
                    Get your API key from <strong>nowpayments.io → Store Settings → API keys</strong>. 100+ cryptocurrencies supported.
                  </div>
                  <SecretInput label="API Key" value={cfg.nowpaymentsApiKey} onChange={(v:string) => f('nowpaymentsApiKey', v)} placeholder="Your NOWPayments API key" />
                  <SecretInput label="IPN Secret" note="Used to verify webhook callbacks" value={cfg.nowpaymentsIpnSecret} onChange={(v:string) => f('nowpaymentsIpnSecret', v)} placeholder="IPN secret key" />
                  <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>IPN Callback URL</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#6ab04c' }}>{appUrl}/api/payment/webhook?provider=nowpayments</div>
                  </div>
                </div>
              )}

              {/* ── Manual instructions ─────────────────────────── */}
              {cfg.provider === 'MANUAL' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ padding:'12px 16px', background:'rgba(240,192,64,0.06)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:8, fontSize:12, color:'rgba(240,192,64,0.9)', lineHeight:1.7 }}>
                    ⚠ Manual payments require you to verify and approve each payment in the admin panel before the registration is processed.
                  </div>
                  <div>
                    <label style={lbl}>Payment Instructions (shown to users)</label>
                    <div style={{ fontSize:11, color:'var(--gray3)', marginBottom:6 }}>Include bank name, account number, IBAN, SWIFT/BIC, reference format, etc.</div>
                    <textarea style={{...inp, minHeight:120, resize:'vertical' as const, lineHeight:1.7, fontFamily:'var(--font-body)'}} value={cfg.manualInstructions} onChange={e => f('manualInstructions', e.target.value)} placeholder={'Bank: HSBC UAE\nAccount Name: Hola Prime FZ LLC\nIBAN: AE07 0330 0000 0201 4970 15\nSWIFT: BBMEAEAD\n\nReference: Your full name + registration email\n\nSend transfer receipt to: registration@holaprime.com'} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent payments table ──────────────────────────────────── */}
          <RecentPayments />

        </div>
      )}
    </AdminLayout>
  )
}

function RecentPayments() {
  const [payments, setPayments] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/admin/payment/recent', { credentials:'include' }).then(r=>r.json()).then(d=>{ if(d.payments) setPayments(d.payments) }).catch(()=>{})
  }, [])

  const STATUS_COLOR: Record<string,string> = { COMPLETED:'var(--green)', PENDING:'var(--gold)', FAILED:'var(--red)', REFUNDED:'var(--gray2)', EXPIRED:'var(--gray3)' }

  if (payments.length === 0) return null

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>📋</span>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>Recent Payments</span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Email','Amount','Provider','Status','Date'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray2)' }}>{p.email}</td>
                <td style={{ padding:'11px 16px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--gold)' }}>{p.currency} {Number(p.amount).toFixed(2)}</td>
                <td style={{ padding:'11px 16px', fontSize:12, color:'var(--gray2)' }}>{p.provider}</td>
                <td style={{ padding:'11px 16px' }}>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:4, background:`${STATUS_COLOR[p.status]}22`, color:STATUS_COLOR[p.status], border:`1px solid ${STATUS_COLOR[p.status]}44` }}>{p.status}</span>
                </td>
                <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)' }}>
                  {new Date(p.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
