'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/tournament/page.tsx — Tournament Progress, Disqualifications & Leaderboard
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const DQ_REASONS: Record<string,string> = {
  MAX_DRAWDOWN_BREACH:'Max Drawdown Breach',
  DAILY_DRAWDOWN_BREACH:'Daily DD Breach',
  MIN_TRADES_NOT_MET:'Min Trades Not Met',
  ARBITRAGE_DETECTED:'Arbitrage Detected',
  DUPLICATE_ACCOUNT:'Duplicate Account',
  COLLUSION:'Collusion',
  INACTIVITY:'Inactivity',
  CODE_OF_CONDUCT:'Code of Conduct',
  WITHDRAWAL:'Withdrawal',
}

const DQ_COLOR: Record<string,string> = {
  MAX_DRAWDOWN_BREACH:'var(--red)', DAILY_DRAWDOWN_BREACH:'var(--red)',
  ARBITRAGE_DETECTED:'var(--red)', DUPLICATE_ACCOUNT:'var(--red)',
  COLLUSION:'var(--red)', MIN_TRADES_NOT_MET:'var(--gold)',
  CODE_OF_CONDUCT:'var(--gold)', INACTIVITY:'var(--gray3)',
  WITHDRAWAL:'var(--gray3)',
}

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  ACTIVE:       {label:'Active',        color:'var(--green)', bg:'rgba(0,230,118,0.1)'},
  KYC_PENDING:  {label:'KYC Pending',   color:'var(--gold)',  bg:'rgba(240,192,64,0.1)'},
  KYC_APPROVED: {label:'KYC Approved',  color:'var(--neon)',  bg:'rgba(0,212,255,0.1)'},
  KYC_REJECTED: {label:'KYC Rejected',  color:'var(--red)',   bg:'rgba(255,56,96,0.1)'},
  DISQUALIFIED: {label:'Disqualified',  color:'var(--red)',   bg:'rgba(255,56,96,0.1)'},
  ELIMINATED:   {label:'Eliminated',    color:'var(--gray3)', bg:'rgba(100,100,140,0.1)'},
  FINALIST:     {label:'Finalist',      color:'var(--gold)',  bg:'rgba(240,192,64,0.1)'},
  CHAMPION:     {label:'Champion 🏆',   color:'var(--gold)',  bg:'rgba(240,192,64,0.15)'},
}

export default function TournamentProgressPage() {
  const [tab, setTab]         = useState<'overview'|'disqualified'|'progress'>('overview')
  const [dqs, setDqs]         = useState<any[]>([])
  const [traders, setTraders] = useState<any[]>([])
  const [stats, setStats]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  // DQ modal
  const [showDqModal, setShowDqModal] = useState(false)
  const [dqTarget, setDqTarget]       = useState('')
  const [dqReason, setDqReason]       = useState('MAX_DRAWDOWN_BREACH')
  const [dqDetails, setDqDetails]     = useState('')
  const [dqLoading, setDqLoading]     = useState(false)
  const [dqError, setDqError]         = useState('')
  const [dqSuccess, setDqSuccess]     = useState('')

  const load = async () => {
    setLoading(true)
    const [dqR, traderR, statsR] = await Promise.all([
      fetch('/api/admin/disqualifications').then(r=>r.json()).catch(()=>({disqualifications:[]})),
      fetch('/api/admin/traders?limit=200').then(r=>r.json()).catch(()=>({traders:[]})),
      fetch('/api/admin/stats').then(r=>r.json()).catch(()=>({})),
    ])
    setDqs(dqR.disqualifications || [])
    setTraders(traderR.traders || [])
    setStats(statsR)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDQ = async () => {
    if (!dqTarget || !dqReason || !dqDetails) { setDqError('All fields required'); return }
    setDqLoading(true); setDqError('')
    const r = await fetch('/api/admin/disqualifications', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ traderId:dqTarget, reason:dqReason, details:dqDetails, phase:'QUALIFIER' })
    })
    const d = await r.json()
    if (r.ok) {
      setDqSuccess('Trader disqualified'); setShowDqModal(false)
      setDqTarget(''); setDqDetails(''); setDqReason('MAX_DRAWDOWN_BREACH')
      setTimeout(() => setDqSuccess(''), 3000)
      load()
    } else { setDqError(d.error || 'Failed') }
    setDqLoading(false)
  }

  const handleReverseDQ = async (dqId: string) => {
    if (!confirm('Remove this disqualification? The trader status will be restored.')) return
    await fetch(`/api/admin/disqualifications?id=${dqId}`, { method:'DELETE' })
    load()
  }

  const filteredDqs = dqs.filter(d => {
    const matchSearch = !search || d.trader?.displayName?.toLowerCase().includes(search.toLowerCase()) || d.trader?.email?.toLowerCase().includes(search.toLowerCase())
    const matchReason = !reasonFilter || d.reason === reasonFilter
    return matchSearch && matchReason
  })

  const tradersWithProgress = traders.filter(t => ['ACTIVE','ELIMINATED','DISQUALIFIED','FINALIST','CHAMPION'].includes(t.status))
  const filteredProgress = tradersWithProgress.filter(t =>
    !search || t.displayName?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase())
  )

  const Cell = ({ children, mono }: any) => (
    <td style={{ padding:'11px 14px', fontSize:13, color:'var(--gray1)', fontFamily:mono?'var(--font-mono)':'var(--font-body)' }}>{children}</td>
  )
  const Head = ({ children }: any) => (
    <th style={{ padding:'11px 14px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{children}</th>
  )

  return (
    <AdminLayout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>Tournament</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', lineHeight:1, margin:0 }}>Progress & Violations</h1>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setShowDqModal(true)} style={{ padding:'10px 20px', borderRadius:9, border:'1px solid rgba(255,56,96,0.35)', background:'rgba(255,56,96,0.08)', color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, letterSpacing:'0.06em', cursor:'pointer' }}>
            ✕ Disqualify Trader
          </button>
          {dqSuccess && <div style={{ padding:'10px 16px', background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.25)', borderRadius:8, color:'var(--green)', fontSize:13 }}>✓ {dqSuccess}</div>}
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
          {[
            {label:'Active Traders',   val:stats.traders?.active||0,        color:'var(--green)'},
            {label:'Disqualified',     val:stats.traders?.disqualified||0,  color:'var(--red)'},
            {label:'Eliminated',       val:stats.traders?.eliminated||0,    color:'var(--gray3)'},
            {label:'KYC Pending',      val:stats.traders?.kycPending||0,    color:'var(--gold)'},
            {label:'Total Registered', val:stats.traders?.total||0,         color:'var(--neon)'},
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {(['overview','disqualified','progress'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 20px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', background:tab===t?'var(--surface)':'transparent', color:tab===t?'var(--white)':'var(--gray3)', borderBottom:tab===t?'2px solid var(--neon)':'2px solid transparent', transition:'all 0.15s' }}>
            {t === 'overview' ? 'Overview' : t === 'disqualified' ? `Disqualified (${dqs.length})` : 'Trader Progress'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input className="input-field" placeholder="🔍 Search traders…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:280, padding:'9px 14px', fontSize:13 }} />
        {tab === 'disqualified' && (
          <select value={reasonFilter} onChange={e=>setReasonFilter(e.target.value)} className="input-field" style={{ width:220, padding:'9px 14px', fontSize:13 }}>
            <option value="">All Reasons</option>
            {Object.entries(DQ_REASONS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13 }}>Loading…</div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {tab === 'overview' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Status breakdown */}
              <div className="card">
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:16 }}>Status Breakdown</div>
                {Object.entries(STATUS_CFG).map(([status, cfg]) => {
                  const count = traders.filter(t=>t.status===status).length
                  return (
                    <div key={status} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:cfg.color, letterSpacing:'0.08em' }}>{cfg.label}</span>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:cfg.color }}>{count}</span>
                    </div>
                  )
                })}
              </div>

              {/* DQ breakdown */}
              <div className="card">
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:16 }}>Disqualification Reasons</div>
                {Object.entries(DQ_REASONS).map(([reason, label]) => {
                  const count = dqs.filter(d=>d.reason===reason).length
                  if (!count) return null
                  return (
                    <div key={reason} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:13, color: DQ_COLOR[reason]||'var(--gray2)' }}>{label}</span>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:DQ_COLOR[reason]||'var(--gray2)' }}>{count}</span>
                    </div>
                  )
                })}
                {dqs.length === 0 && <div style={{ color:'var(--gray3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No disqualifications yet</div>}
              </div>
            </div>
          )}

          {/* ── DISQUALIFIED TAB ──────────────────────────────────── */}
          {tab === 'disqualified' && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {filteredDqs.length === 0 ? (
                <div style={{ padding:60, textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13 }}>No disqualifications{reasonFilter||search?' matching filters':''}</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Trader','Country','Reason','Phase','Details','Issued By','Date',''].map(h=><Head key={h}>{h}</Head>)}</tr></thead>
                  <tbody>
                    {filteredDqs.map((dq, i) => (
                      <tr key={dq.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>{dq.trader?.displayName}</div>
                          <div style={{ fontSize:11, color:'var(--gray3)' }}>{dq.trader?.email}</div>
                        </td>
                        <Cell>{dq.trader?.country?.name||'—'}</Cell>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.06em', color:DQ_COLOR[dq.reason]||'var(--gray2)', background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.2)', borderRadius:4, padding:'3px 8px' }}>{DQ_REASONS[dq.reason]||dq.reason}</span>
                        </td>
                        <Cell>{dq.phase?.replace(/_/g,' ')}</Cell>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--gray2)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dq.details}</td>
                        <Cell>{dq.issuedBy}</Cell>
                        <td style={{ padding:'11px 14px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', whiteSpace:'nowrap' }}>{new Date(dq.issuedAt).toLocaleDateString()}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <button onClick={() => handleReverseDQ(dq.id)} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid rgba(240,192,64,0.25)', background:'rgba(240,192,64,0.06)', color:'var(--gold)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, cursor:'pointer', letterSpacing:'0.06em' }}>REVERSE</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── PROGRESS TAB ──────────────────────────────────────── */}
          {tab === 'progress' && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {filteredProgress.length === 0 ? (
                <div style={{ padding:60, textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13 }}>No active traders found</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Rank','Trader','Country','Status','Return %','Max DD','Trades','Qualified',''].map(h=><Head key={h}>{h}</Head>)}</tr>
                  </thead>
                  <tbody>
                    {filteredProgress.sort((a,b) => {
                      const ra = a.qualifierEntry?.rank || 9999
                      const rb = b.qualifierEntry?.rank || 9999
                      return ra - rb
                    }).map((t, i) => {
                      const cfg = STATUS_CFG[t.status] || STATUS_CFG.ELIMINATED
                      const qe = t.qualifierEntry
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding:'11px 14px', fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:qe?.rank<=3?'var(--gold)':'var(--gray3)', width:56, textAlign:'center' }}>
                            {qe?.rank ? `#${qe.rank}` : '—'}
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>{t.displayName}</div>
                            <div style={{ fontSize:11, color:'var(--gray3)' }}>{t.email}</div>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:13, color:'var(--gray1)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <img src={`https://flagcdn.com/w40/${t.country?.code?.toLowerCase()}.png`} alt="" style={{ width:22, height:15, objectFit:'cover', borderRadius:2 }} />
                              {t.country?.name}
                            </div>
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.06em', color:cfg.color, background:cfg.bg, borderRadius:4, padding:'3px 8px' }}>{cfg.label}</span>
                          </td>
                          <Cell mono>{qe ? `${parseFloat(qe.returnPct).toFixed(2)}%` : '—'}</Cell>
                          <Cell mono>{qe ? `${parseFloat(qe.maxDrawdown).toFixed(2)}%` : '—'}</Cell>
                          <Cell>{qe?.totalTrades ?? t.accounts?.[0]?.totalTrades ?? '—'}</Cell>
                          <td style={{ padding:'11px 14px' }}>
                            {qe?.qualified
                              ? <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--green)', background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.2)', borderRadius:4, padding:'3px 8px' }}>✓ QUALIFIED</span>
                              : <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--gray3)' }}>In Progress</span>
                            }
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            {t.status === 'ACTIVE' && (
                              <button onClick={() => { setDqTarget(t.id); setShowDqModal(true) }} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid rgba(255,56,96,0.25)', background:'rgba(255,56,96,0.06)', color:'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, cursor:'pointer' }}>DQ</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ── DQ Modal ───────────────────────────────────────────────── */}
      {showDqModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--deep)', border:'1px solid var(--border)', borderRadius:16, padding:32, width:480, maxWidth:'95vw' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--white)', marginBottom:4 }}>Disqualify Trader</h2>
            <p style={{ color:'var(--gray3)', fontSize:13, marginBottom:24 }}>This will update the trader status to DISQUALIFIED and freeze their account.</p>

            {/* Trader select */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:7 }}>Select Trader</label>
              <select value={dqTarget} onChange={e=>setDqTarget(e.target.value)} className="input-field" style={{ width:'100%' }}>
                <option value="">— choose trader —</option>
                {traders.filter(t=>t.status==='ACTIVE').map(t => (
                  <option key={t.id} value={t.id}>{t.displayName} ({t.country?.code||'?'})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:7 }}>Reason</label>
              <select value={dqReason} onChange={e=>setDqReason(e.target.value)} className="input-field" style={{ width:'100%' }}>
                {Object.entries(DQ_REASONS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray2)', marginBottom:7 }}>Details / Evidence</label>
              <textarea value={dqDetails} onChange={e=>setDqDetails(e.target.value)} className="input-field" placeholder="Describe the specific rule breach, include account data, timestamps, or supporting evidence…" style={{ width:'100%', minHeight:80, resize:'vertical', fontSize:13, boxSizing:'border-box' as const }} />
            </div>

            {dqError && <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(255,56,96,0.08)', border:'1px solid rgba(255,56,96,0.25)', borderRadius:8, color:'var(--red)', fontSize:13 }}>⚠ {dqError}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setShowDqModal(false); setDqError('') }} className="btn-outline" style={{ flex:1 }}>Cancel</button>
              <button onClick={handleDQ} disabled={dqLoading} style={{ flex:1, padding:'13px', borderRadius:9, border:'none', background:'rgba(255,56,96,0.9)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', cursor:dqLoading?'not-allowed':'pointer', opacity:dqLoading?0.7:1 }}>
                {dqLoading ? 'Disqualifying…' : '✕ Confirm Disqualify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
