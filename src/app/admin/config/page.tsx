'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/config/page.tsx
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const INITIAL = {
  phase: 'REGISTRATION',
  regDeadline: '2026-05-30',
  qualifierStart: '2026-06-01',
  qualifierEnd: '2026-06-12',
  grandFinal: '2026-07-18',
  prizePool: '100000',
  firstPrize: '60000',
  secondPrize: '25000',
  accountSize: '10000',
  leverage: '30',
  dailyDD: '8',
  totalDD: '12',
  minTrades: '10',
  maxPositionPct: '5',
  instruments: 'EURUSD,GBPUSD,USDJPY,XAUUSD,USOIL,US30,NAS100,GER40',
  registrationOpen: true,
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState(INITIAL)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Country eligibility
  const [countries, setCountries]         = useState<any[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryFilter, setCountryFilter] = useState<'all'|'enabled'|'disabled'>('all')
  const [togglingCode, setTogglingCode]   = useState<string|null>(null)
  const [countryMsg, setCountryMsg]       = useState('')

  useEffect(() => {
    fetch('/api/admin/countries', { credentials:'include' })
      .then(r=>r.json()).then(d=>{ if(d.countries) setCountries(d.countries) }).catch(()=>{})
  }, [])

  const toggleCountry = async (code: string, current: boolean) => {
    setTogglingCode(code)
    const r = await fetch('/api/admin/countries', {
      method:'PATCH', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, isEligible: !current }),
    }).then(r=>r.json()).catch(()=>({}))
    if (r.country) setCountries(prev => prev.map(c => c.code === code ? {...c, isEligible: !current} : c))
    setTogglingCode(null)
  }

  const bulkToggle = async (enableAll: boolean) => {
    await fetch('/api/admin/countries', {
      method:'PATCH', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(enableAll ? { enableAll: true } : { disableAll: true }),
    })
    setCountries(prev => prev.map(c => ({...c, isEligible: enableAll})))
    setCountryMsg(enableAll ? '✓ All countries enabled' : '✓ All countries disabled')
    setTimeout(() => setCountryMsg(''), 2500)
  }

  const filteredCountries = countries.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())
    const matchFilter = countryFilter === 'all' || (countryFilter === 'enabled' ? c.isEligible : !c.isEligible)
    return matchSearch && matchFilter
  })
  const f = (k: string, v: string | boolean) => setConfig(p => ({...p,[k]:v}))

  // ── Prize tiers state ─────────────────────────────────────────────────
  const DEFAULT_PRIZES = [
    { key:'place_1',      label:'1st Place',         prize:'$60,000',    position:1  },
    { key:'place_2',      label:'2nd Place',          prize:'$25,000',    position:2  },
    { key:'place_3',      label:'3rd Place',          prize:'$10,000',    position:3  },
    { key:'place_4',      label:'4th Place',          prize:'$5,000',     position:4  },
    { key:'place_5',      label:'5th Place',          prize:'$3,500',     position:5  },
    { key:'place_6',      label:'6th Place',          prize:'$3,000',     position:6  },
    { key:'place_7',      label:'7th Place',          prize:'$2,500',     position:7  },
    { key:'place_8',      label:'8th Place',          prize:'$2,000',     position:8  },
    { key:'place_9',      label:'9th Place',          prize:'$1,500',     position:9  },
    { key:'place_10',     label:'10th Place',         prize:'$1,000',     position:10 },
    { key:'place_11_25',  label:'11th - 25th Place',  prize:'$500 each',  position:11 },
    { key:'place_26_50',  label:'26th - 50th Place',  prize:'$250 each',  position:12 },
    { key:'place_51_100', label:'51st - 100th Place', prize:'$100 each',  position:13 },
    { key:'most_lots',    label:'Most Lots Traded',   prize:'$2,000',     position:14 },
    { key:'lowest_dd',    label:'Lowest Drawdown',    prize:'$2,000',     position:15 },
  ]
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES)
  const [prizesSaving, setPrizesSaving] = useState(false)
  const [prizesSaved, setPrizesSaved] = useState(false)
  const [prizesError, setPrizesError] = useState('')

  useEffect(() => {
    fetch('/api/admin/prizes', { credentials:'include' })
      .then(r => r.json())
      .then(d => { if (d.prizes && d.prizes.length > 0) setPrizes(d.prizes) })
      .catch(() => {})
  }, [])

  const updatePrize = (key: string, field: 'label' | 'prize', value: string) => {
    setPrizes(prev => prev.map(p => p.key === key ? {...p, [field]: value} : p))
  }

  const handlePrizesSave = async () => {
    setPrizesSaving(true); setPrizesError(''); setPrizesSaved(false)
    try {
      const res = await fetch('/api/admin/prizes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prizes }),
      })
      const d = await res.json()
      if (res.ok) { setPrizesSaved(true); setTimeout(() => setPrizesSaved(false), 3000) }
      else { setPrizesError(d.error || 'Save failed') }
    } catch { setPrizesError('Network error') }
    setPrizesSaving(false)
  }

  // Load current config from DB on mount
  useEffect(() => {
    fetch('/api/config', { credentials:'include' }).then(r=>r.json()).then(d => {
      if (d.config) {
        const raw = d.config
        setConfig({
          phase:             raw.currentPhase      || INITIAL.phase,
          regDeadline:       raw.registrationDeadline || INITIAL.regDeadline,
          qualifierStart:    raw.qualifierStart    || INITIAL.qualifierStart,
          qualifierEnd:      raw.qualifierEnd      || INITIAL.qualifierEnd,
          grandFinal:        raw.grandFinalDate    || INITIAL.grandFinal,
          prizePool:         String(raw.totalPrizePool      || INITIAL.prizePool),
          firstPrize:        String(raw.firstPrize          || INITIAL.firstPrize),
          secondPrize:       String(raw.secondPrize         || INITIAL.secondPrize),
          accountSize:       String(raw.qualifierAccountSize|| INITIAL.accountSize),
          leverage:          String(raw.maxLeverage         || INITIAL.leverage),
          dailyDD:           String(raw.dailyDrawdownPct    || INITIAL.dailyDD),
          totalDD:           String(raw.totalDrawdownPct    || INITIAL.totalDD),
          minTrades:         String(raw.minTradesPerRound   || INITIAL.minTrades),
          maxPositionPct:    String(raw.maxPositionSizePct  || INITIAL.maxPositionPct),
          instruments:       (raw.allowedInstruments||[]).join(',') || INITIAL.instruments,
          registrationOpen:  raw.registrationOpen  ?? INITIAL.registrationOpen,
        })
      }
    }).catch(()=>{})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/config', { credentials:'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPhase:         config.phase,
          registrationOpen:     config.registrationOpen,
          registrationDeadline: config.regDeadline,
          qualifierStart:       config.qualifierStart,
          qualifierEnd:         config.qualifierEnd,
          grandFinalDate:       config.grandFinal,
          totalPrizePool:       Number(config.prizePool),
          firstPrize:           Number(config.firstPrize),
          secondPrize:          Number(config.secondPrize),
          qualifierAccountSize: Number(config.accountSize),
          knockoutAccountSize:  Number(config.accountSize),
          maxLeverage:          Number(config.leverage),
          dailyDrawdownPct:     Number(config.dailyDD),
          totalDrawdownPct:     Number(config.totalDD),
          minTradesPerRound:    Number(config.minTrades),
          maxPositionSizePct:   Number(config.maxPositionPct),
          allowedInstruments:   config.instruments.split(',').map((s: string)=>s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Save failed')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch(e) {
      setError('Network error — check console')
    } finally {
      setSaving(false)
    }
  }

  const Section = ({ title, icon, children }: any) => (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--deep)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--white)' }}>{title}</span>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  )

  const Field = ({ label, note, children }: any) => (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, alignItems:'center', paddingBottom:16, borderBottom:'1px solid var(--border)', marginBottom:16 }}>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--white)' }}>{label}</div>
        {note && <div style={{ fontSize:12, color:'var(--gray3)', marginTop:3, lineHeight:1.4 }}>{note}</div>}
      </div>
      <div>{children}</div>
    </div>
  )

  return (
    <AdminLayout>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>System</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', lineHeight:1 }}>Tournament Config</h1>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            {saved && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.25)', borderRadius:8, padding:'10px 16px' }}>
                <span style={{ color:'var(--green)', fontSize:14 }}>✓</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.08em', color:'var(--green)' }}>SAVED — Changes live across site</span>
              </div>
            )}
            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,56,96,0.1)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, padding:'10px 16px' }}>
                <span style={{ color:'var(--red)', fontSize:12, fontFamily:'var(--font-display)', fontWeight:700 }}>{error}</span>
              </div>
            )}
            <button onClick={handleSave} disabled={saving} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px 28px', borderRadius:8, border:'none', cursor:saving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', boxShadow:'0 0 20px rgba(0,212,255,0.35)', opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:800 }}>

        {/* Phase */}
        <Section title="Current Phase" icon="⚡">
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
            {['REGISTRATION','QUALIFIER','ROUND_32','ROUND_16','QUARTERS','SEMIS','GRAND_FINAL'].map(p => (
              <button key={p} onClick={() => f('phase',p)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', padding:'9px 16px', borderRadius:6, border:'none', cursor:'pointer', background: config.phase===p ? 'var(--neon)' : 'var(--deep)', color: config.phase===p ? 'var(--black)' : 'var(--gray2)', boxShadow: config.phase===p ? '0 0 14px rgba(0,212,255,0.35)' : 'none', transition:'all 0.15s' }}>
                {p.replace(/_/g,' ')}
              </button>
            ))}
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="checkbox" checked={config.registrationOpen} onChange={e => f('registrationOpen',e.target.checked)} style={{ width:16, height:16, accentColor:'var(--neon)' }} />
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--gray1)' }}>Registration Open</span>
          </label>
        </Section>

        {/* Dates */}
        <Section title="Key Dates" icon="📅">
          {[
            ['Registration Deadline', 'regDeadline', 'Last day traders can register'],
            ['Qualifier Start',        'qualifierStart', ''],
            ['Qualifier End',          'qualifierEnd', ''],
            ['Grand Final Date',       'grandFinal', 'Live event date'],
          ].map(([label, key, note]) => (
            <Field key={key} label={label} note={note}>
              <input type="date" className="input-field" value={config[key as keyof typeof config] as string} onChange={e => f(key, e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:14 }} />
            </Field>
          ))}
        </Section>

        {/* Prize pool — total */}
        <Section title="Prize Pool" icon="🏆">
          <Field label="Total Prize Pool ($)" note="USD · full prize pool amount — shown on homepage">
            <input type="number" className="input-field" value={config.prizePool} onChange={e => f('prizePool', e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:14 }} />
          </Field>
        </Section>

        {/* Prize tiers — all 15 positions */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--deep)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🏅</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--white)' }}>Prize Tiers</span>
              <span style={{ fontSize:11, color:'var(--gray3)', fontFamily:'var(--font-display)' }}>All 15 positions — values can be money or text</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {prizesSaved && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--green)', letterSpacing:'0.08em' }}>✓ SAVED — LIVE ON SITE</span>}
              {prizesError && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--red)' }}>{prizesError}</span>}
              <button onClick={handlePrizesSave} disabled={prizesSaving} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', borderRadius:7, border:'none', cursor:prizesSaving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', opacity:prizesSaving?0.7:1 }}>
                {prizesSaving ? 'Saving…' : 'Save Prize Tiers'}
              </button>
            </div>
          </div>

          <div style={{ padding:'8px 0' }}>
            {/* Column headers */}
            <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr', gap:12, padding:'8px 20px 4px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>#</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>Position Label</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>Prize Value (text or $amount)</div>
            </div>

            {prizes.map((p, i) => {
              const isSpecial = ['most_lots','lowest_dd'].includes(p.key)
              const isSeparator = ['place_11_25','most_lots'].includes(p.key)
              return (
                <div key={p.key}>
                  {isSeparator && <div style={{ height:1, background:'var(--border)', margin:'4px 20px' }} />}
                  <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr', gap:12, padding:'10px 20px', alignItems:'center', background: isSpecial ? 'rgba(0,212,255,0.02)' : 'transparent' }}>
                    {/* Position number */}
                    <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: isSpecial ? 'var(--neon)' : 'var(--gray3)' }}>
                      {isSpecial ? (p.key==='most_lots'?'📊':'📉') : p.position}
                    </div>
                    {/* Label field */}
                    <input
                      className="input-field"
                      value={p.label}
                      onChange={e => updatePrize(p.key, 'label', e.target.value)}
                      style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, padding:'8px 12px', color: isSpecial ? 'var(--neon)' : 'var(--white)' }}
                    />
                    {/* Prize value field — accepts text AND numbers */}
                    <input
                      className="input-field"
                      value={p.prize}
                      onChange={e => updatePrize(p.key, 'prize', e.target.value)}
                      placeholder="e.g. $10,000 or Funded Account or Trophy"
                      style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, padding:'8px 12px', color:'var(--gold)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trading rules */}
        <Section title="Trading Rules" icon="⚙">
          {[
            ['Account Size ($)',       'accountSize',    '$10,000 default'],
            ['Max Leverage',           'leverage',       '1:X — set to 30 for 1:30'],
            ['Daily Drawdown %',       'dailyDD',        'Auto-DQ threshold per day'],
            ['Total Drawdown %',       'totalDD',        'Auto-DQ lifetime threshold'],
            ['Min Trades / Round',     'minTrades',      'Minimum trades to qualify'],
            ['Max Position Size %',    'maxPositionPct', '% of account per trade'],
          ].map(([label, key, note]) => (
            <Field key={key} label={label} note={note}>
              <input type="number" className="input-field" value={config[key as keyof typeof config] as string} onChange={e => f(key, e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:14, maxWidth:200 }} />
            </Field>
          ))}

          <Field label="Allowed Instruments" note="Comma-separated symbols">
            <input className="input-field" value={config.instruments} onChange={e => f('instruments', e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:13 }} />
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
              {config.instruments.split(',').map(sym => (
                <span key={sym} className="badge badge-neon">{sym.trim()}</span>
              ))}
            </div>
          </Field>
        </Section>


        {/* ── Country Eligibility ─────────────────────────────────────── */}
        <Section title="Country Eligibility" icon="🌍">
          <div style={{ marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            {/* Search */}
            <input
              value={countrySearch} onChange={e=>setCountrySearch(e.target.value)}
              placeholder="Search country…"
              style={{ flex:1, minWidth:160, padding:'9px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--white)', fontFamily:'var(--font-display)', fontSize:13 }}
            />
            {/* Filter tabs */}
            {(['all','enabled','disabled'] as const).map(f => (
              <button key={f} onClick={()=>setCountryFilter(f)}
                style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${countryFilter===f?'var(--neon)':'var(--border2)'}`, background:countryFilter===f?'rgba(0,212,255,0.1)':'transparent', color:countryFilter===f?'var(--neon)':'var(--gray3)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                {f}
              </button>
            ))}
            {/* Bulk actions */}
            <button onClick={()=>bulkToggle(true)}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(0,230,118,0.3)', background:'rgba(0,230,118,0.06)', color:'var(--green)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
              ✓ Enable All
            </button>
            <button onClick={()=>bulkToggle(false)}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,56,96,0.3)', background:'rgba(255,56,96,0.06)', color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
              ✕ Disable All
            </button>
          </div>

          {/* Stats bar */}
          <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { label:'Total', value: countries.length, color:'var(--gray2)' },
              { label:'Eligible', value: countries.filter(c=>c.isEligible).length, color:'var(--green)' },
              { label:'Blocked', value: countries.filter(c=>!c.isEligible).length, color:'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 18px', display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18, color:s.color }}>{s.value}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)' }}>{s.label}</span>
              </div>
            ))}
            {countryMsg && <div style={{ padding:'10px 16px', borderRadius:8, background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.2)', color:'var(--green)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{countryMsg}</div>}
          </div>

          {/* Country grid */}
          {countries.length === 0 ? (
            <div style={{ color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13, padding:'20px 0' }}>Loading countries…</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:8 }}>
              {filteredCountries.map(c => {
                const loading = togglingCode === c.code
                return (
                  <div key={c.code}
                    onClick={() => !loading && toggleCountry(c.code, c.isEligible)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 14px', borderRadius:9, cursor:loading?'wait':'pointer',
                      border:`1px solid ${c.isEligible ? 'rgba(0,230,118,0.25)' : 'rgba(255,56,96,0.2)'}`,
                      background: c.isEligible ? 'rgba(0,230,118,0.05)' : 'rgba(255,56,96,0.04)',
                      transition:'all 0.15s', opacity: loading ? 0.6 : 1,
                    }}>
                    {/* Flag */}
                    <img
                      src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                      alt={c.code}
                      style={{ width:28, height:20, objectFit:'cover', borderRadius:2, flexShrink:0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display='none' }}
                    />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--white)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--gray3)' }}>{c.code} · {c.region || '—'}</div>
                    </div>
                    {/* Toggle pill */}
                    <div style={{
                      width:36, height:20, borderRadius:10, flexShrink:0,
                      background: c.isEligible ? 'var(--green)' : 'var(--border2)',
                      position:'relative', transition:'background 0.2s',
                    }}>
                      <div style={{
                        position:'absolute', top:3, width:14, height:14, borderRadius:'50%',
                        background:'var(--white)', transition:'left 0.2s',
                        left: c.isEligible ? 19 : 3,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredCountries.length === 0 && countries.length > 0 && (
            <div style={{ color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13, padding:'16px 0' }}>No countries match your search.</div>
          )}
        </Section>

        {/* Danger zone */}
        <div style={{ background:'rgba(255,56,96,0.04)', border:'1px solid rgba(255,56,96,0.2)', borderRadius:12, padding:'20px 24px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--red)', marginBottom:12 }}>⚠ Danger Zone</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 20px', borderRadius:8, border:'1px solid rgba(255,56,96,0.3)', background:'rgba(255,56,96,0.08)', color:'var(--red)', cursor:'pointer' }}>
              Force Sync All Accounts
            </button>
            <button style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 20px', borderRadius:8, border:'1px solid rgba(255,56,96,0.3)', background:'rgba(255,56,96,0.08)', color:'var(--red)', cursor:'pointer' }}>
              Reset Qualifier Rankings
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
