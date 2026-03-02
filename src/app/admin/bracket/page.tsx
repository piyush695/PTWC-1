'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/bracket/page.tsx – Draw Engine + H2H Match Management
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const flagUrl = (code: string) => `https://flagcdn.com/w40/${(code||'').toLowerCase()}.png`

type Phase = 'ROUND_OF_32'|'ROUND_OF_16'|'QUARTERFINAL'|'SEMIFINAL'|'GRAND_FINAL'

interface MatchTrader {
  id: string; name: string; countryCode: string; countryName: string
  flagUrl: string|null; returnPct: number|null
}
interface Match {
  id: string; matchNumber: number; status: string
  trader1: MatchTrader|null; trader2: MatchTrader|null
  winner: { id: string; name: string }|null
  startTime: string|null; endTime: string|null
}
interface DryRunResult {
  dryRun: boolean; phase: string; totalSeeds: number
  matchCount: number; byeTrader: { displayName: string; seed: number }|null
  matchups: Array<{ matchNumber: number; trader1: any; trader2: any }>
}

const PHASES: { id: Phase; label: string; dates: string }[] = [
  { id: 'ROUND_OF_32',  label: 'Round of 32',   dates: 'Jun 15–21' },
  { id: 'ROUND_OF_16',  label: 'Round of 16',   dates: 'Jun 22–28' },
  { id: 'QUARTERFINAL', label: 'Quarterfinals', dates: 'Jun 29–Jul 5' },
  { id: 'SEMIFINAL',    label: 'Semifinals',    dates: 'Jul 6–10' },
  { id: 'GRAND_FINAL',  label: 'Grand Final',   dates: 'Jul 18' },
]

const STATUS_CFG: Record<string,{color:string;bg:string;label:string}> = {
  SCHEDULED:  { color:'var(--gray2)',  bg:'rgba(74,85,128,0.2)',   label:'Scheduled' },
  ACTIVE:     { color:'var(--neon)',   bg:'rgba(0,212,255,0.1)',   label:'Live'      },
  COMPLETED:  { color:'var(--green)',  bg:'rgba(0,230,118,0.1)',   label:'Completed' },
  WALKOVER:   { color:'var(--gold)',   bg:'rgba(240,192,64,0.1)',  label:'Walkover'  },
  DISPUTED:   { color:'var(--red)',    bg:'rgba(255,56,96,0.1)',   label:'Disputed'  },
}

function FlagImg({ code, name, size=28 }: { code:string; name:string; size?:number }) {
  const [err, setErr] = useState(false)
  return (
    <div style={{ width:size, height:Math.round(size*0.68), borderRadius:3, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)', background:'var(--surface2)' }}>
      {!err
        ? <img src={flagUrl(code)} alt={name} onError={()=>setErr(true)} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:8, color:'var(--gray3)' }}>{code}</div>
      }
    </div>
  )
}

export default function AdminBracketPage() {
  const [activeTab, setActiveTab]       = useState<'draw'|'matches'|'bracket'>('draw')
  const [phase, setPhase]               = useState<Phase>('ROUND_OF_32')
  const [matches, setMatches]           = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [dryRun, setDryRun]             = useState<DryRunResult|null>(null)
  const [loadingDry, setLoadingDry]     = useState(false)
  const [creating, setCreating]         = useState(false)
  const [createResult, setCreateResult] = useState<any>(null)
  const [createError, setCreateError]   = useState('')
  const [recordModal, setRecordModal]   = useState<Match|null>(null)
  const [recordingWinner, setRecordingWinner] = useState('')
  const [recordLoading, setRecordLoading]     = useState(false)
  const [recordSuccess, setRecordSuccess]     = useState('')

  // Load matches for selected phase
  const loadMatches = useCallback(async () => {
    setLoadingMatches(true)
    try {
      const r    = await fetch(`/api/admin/draw?phase=${phase}`)
      const data = await r.json()
      setMatches(data.matches || [])
    } catch { setMatches([]) }
    setLoadingMatches(false)
  }, [phase])

  useEffect(() => { if (activeTab === 'matches' || activeTab === 'bracket') loadMatches() }, [loadMatches, activeTab])

  // Dry run preview
  const runPreview = async () => {
    setLoadingDry(true); setDryRun(null); setCreateResult(null); setCreateError('')
    try {
      const r    = await fetch('/api/admin/draw', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phase, dryRun: true }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setDryRun(data)
    } catch (e: any) { setCreateError(e.message) }
    setLoadingDry(false)
  }

  // Confirm draw creation
  const confirmDraw = async () => {
    setCreating(true); setCreateResult(null); setCreateError('')
    try {
      const r    = await fetch('/api/admin/draw', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phase, dryRun: false }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setCreateResult(data); setDryRun(null)
      loadMatches()
    } catch (e: any) { setCreateError(e.message) }
    setCreating(false)
  }

  // Record match result
  const recordResult = async (match: Match, winnerId: string) => {
    setRecordLoading(true); setRecordSuccess('')
    try {
      const r    = await fetch('/api/admin/draw', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ matchId: match.id, winnerId }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setRecordSuccess(`Result recorded — ${data.winnerId === match.trader1?.id ? match.trader1?.name : match.trader2?.name} advances`)
      loadMatches()
      setTimeout(() => { setRecordModal(null); setRecordSuccess('') }, 1800)
    } catch (e: any) { setRecordSuccess('Error: ' + e.message) }
    setRecordLoading(false)
  }

  const phaseMatches = matches
  const activeMatches    = phaseMatches.filter(m => m.status === 'ACTIVE')
  const completedMatches = phaseMatches.filter(m => m.status === 'COMPLETED')
  const scheduledMatches = phaseMatches.filter(m => m.status === 'SCHEDULED')

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>Tournament</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, margin:0 }}>Draw Engine & H2H Bracket</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:28 }}>
        {[['draw','⚡ Create Draw'],['matches','◈ Manage Matches'],['bracket','◎ Bracket View']].map(([val,label]) => (
          <button key={val} onClick={()=>setActiveTab(val as any)} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px 22px', border:'none', background:'transparent', cursor:'pointer', color: activeTab===val ? 'var(--neon)' : 'var(--gray2)', borderBottom:`2px solid ${activeTab===val ? 'var(--neon)' : 'transparent'}`, transition:'all 0.15s', marginBottom:-1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PHASE SELECTOR (shared) ───────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={()=>{ setPhase(p.id); setDryRun(null); setCreateResult(null); setCreateError('') }} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 16px', borderRadius:8, border:`1px solid ${phase===p.id ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`, background: phase===p.id ? 'rgba(0,212,255,0.1)' : 'transparent', color: phase===p.id ? 'var(--neon)' : 'var(--gray3)', cursor:'pointer', transition:'all 0.15s' }}>
            {p.label} <span style={{ fontSize:9, color:'var(--gray3)', marginLeft:4 }}>{p.dates}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════ TAB: CREATE DRAW ═══════════════════════════════ */}
      {activeTab === 'draw' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>

          {/* Left: draw preview / results */}
          <div>
            {/* Info card */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:24, marginBottom:20 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--white)', marginBottom:16 }}>
                How the Draw Works
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { n:'1', label:'Qualifier closes', desc:'All trades stop. Final standings locked.' },
                  { n:'2', label:'Top 1 per country selected', desc:'Highest return% per country qualifies.' },
                  { n:'3', label:'Standard seeding', desc:'Seed 1 vs Seed N, Seed 2 vs Seed N-1...' },
                  { n:'4', label:'Matches created', desc:'Match accounts provisioned automatically.' },
                  { n:'5', label:'Notifications sent', desc:'All traders emailed their match details.' },
                ].map(s => (
                  <div key={s.n} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:12, color:'var(--neon)', flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--white)' }}>{s.label}</div>
                      <div style={{ fontSize:12, color:'var(--gray3)', marginTop:2 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {createError && (
              <div style={{ background:'rgba(255,56,96,0.07)', border:'1px solid rgba(255,56,96,0.3)', borderRadius:10, padding:'14px 18px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ color:'var(--red)', fontSize:18 }}>⚠</span>
                <span style={{ fontSize:13, color:'var(--red)' }}>{createError}</span>
              </div>
            )}

            {/* Dry run preview */}
            {dryRun && (
              <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.25)', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
                <div style={{ padding:'16px 20px', background:'rgba(0,212,255,0.05)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, color:'var(--neon)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    ⚡ Draw Preview — {PHASES.find(p=>p.id===phase)?.label}
                  </div>
                  <div style={{ display:'flex', gap:16 }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray2)' }}>{dryRun.matchCount} matches</span>
                    {dryRun.byeTrader && <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gold)' }}>1 bye</span>}
                  </div>
                </div>
                <div style={{ maxHeight:420, overflowY:'auto' }}>
                  {dryRun.matchups.map((m, i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', gap:10, padding:'14px 20px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                      {/* T1 */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)', background:'rgba(240,192,64,0.1)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>S{m.trader1.seed}</div>
                          <FlagImg code={(m.trader1.country||'').slice(0,2).toUpperCase()||'XX'} name={m.trader1.country||''} size={22} />
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>{m.trader1.name}</span>
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--green)', marginTop:3 }}>+{parseFloat(m.trader1.returnPct).toFixed(2)}%</div>
                      </div>
                      <div style={{ textAlign:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:'var(--gray3)' }}>VS</div>
                      {/* T2 */}
                      <div style={{ textAlign:'right' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>{m.trader2.name}</span>
                          <FlagImg code={(m.trader2.country||'').slice(0,2).toUpperCase()||'XX'} name={m.trader2.country||''} size={22} />
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold)', background:'rgba(240,192,64,0.1)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>S{m.trader2.seed}</div>
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--green)', marginTop:3 }}>+{parseFloat(m.trader2.returnPct).toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                  {dryRun.byeTrader && (
                    <div style={{ padding:'14px 20px', background:'rgba(240,192,64,0.04)', borderTop:'1px solid rgba(240,192,64,0.15)' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--gold)' }}>
                        🟡 BYE — {dryRun.byeTrader.displayName} (Seed {dryRun.byeTrader.seed}) auto-advances to next round
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create result */}
            {createResult && (
              <div style={{ background:'rgba(0,230,118,0.06)', border:'1px solid rgba(0,230,118,0.3)', borderRadius:12, padding:'20px 24px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,230,118,0.12)', border:'2px solid var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✓</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, color:'var(--green)', textTransform:'uppercase' }}>Draw Created Successfully</div>
                </div>
                <div style={{ display:'flex', gap:24 }}>
                  <div><div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'var(--white)' }}>{createResult.matchesCreated}</div><div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>Matches Created</div></div>
                  {createResult.byeMatch && <div><div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'var(--gold)' }}>1</div><div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>Bye Walkover</div></div>}
                </div>
                <button onClick={()=>setActiveTab('matches')} style={{ marginTop:14, fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', padding:'10px 18px', borderRadius:7, border:'none', background:'var(--green)', color:'var(--black)', cursor:'pointer' }}>
                  View Matches →
                </button>
              </div>
            )}
          </div>

          {/* Right: action panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Warning */}
            <div style={{ background:'rgba(240,192,64,0.05)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ color:'var(--gold)', fontSize:18, flexShrink:0 }}>⚠</span>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--gold)', marginBottom:4 }}>Before Creating the Draw</div>
                  <div style={{ fontSize:12, color:'var(--gray2)', lineHeight:1.65 }}>
                    Ensure the qualifier period has officially ended and all trades have been synced from the broker platform. This action cannot be undone.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Preview */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--white)', marginBottom:6 }}>
                Step 1 — Preview Draw
              </div>
              <div style={{ fontSize:13, color:'var(--gray3)', marginBottom:14, lineHeight:1.6 }}>Run a dry-run to see exactly which matchups will be created before committing.</div>
              <button onClick={runPreview} disabled={loadingDry} style={{ width:'100%', padding:'13px', borderRadius:8, border:'1px solid rgba(0,212,255,0.3)', background:'rgba(0,212,255,0.08)', color:'var(--neon)', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', cursor:loadingDry?'not-allowed':'pointer', transition:'all 0.15s', opacity:loadingDry?0.5:1 }}>
                {loadingDry ? '⟳ Simulating...' : '◎ Preview Matchups'}
              </button>
            </div>

            {/* Step 2: Create */}
            <div style={{ background:'var(--surface)', border:`1px solid ${dryRun ? 'rgba(0,230,118,0.3)' : 'var(--border)'}`, borderRadius:12, padding:'20px', opacity: dryRun ? 1 : 0.5 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--white)', marginBottom:6 }}>
                Step 2 — Create Draw
              </div>
              <div style={{ fontSize:13, color:'var(--gray3)', marginBottom:14, lineHeight:1.6 }}>
                {dryRun ? `Ready to create ${dryRun.matchCount} matches for ${PHASES.find(p=>p.id===phase)?.label}.` : 'Preview the draw first.'}
              </div>
              <button onClick={confirmDraw} disabled={!dryRun || creating} style={{ width:'100%', padding:'14px', borderRadius:8, border:'none', background: dryRun ? 'var(--neon)' : 'var(--surface2)', color: dryRun ? 'var(--black)' : 'var(--gray3)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.1em', textTransform:'uppercase', cursor:!dryRun||creating?'not-allowed':'pointer', boxShadow: dryRun ? '0 0 20px rgba(0,212,255,0.35)' : 'none', transition:'all 0.2s', opacity:creating?0.7:1 }}>
                {creating ? '⟳ Creating...' : '⚡ Confirm & Create Draw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB: MANAGE MATCHES ════════════════════════════ */}
      {activeTab === 'matches' && (
        <>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Total Matches',  value: phaseMatches.length,        color:'var(--neon)'  },
              { label:'Live',           value: activeMatches.length,       color:'var(--green)' },
              { label:'Completed',      value: completedMatches.length,    color:'var(--gray2)' },
              { label:'Scheduled',      value: scheduledMatches.length,    color:'var(--gold)'  },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:s.color }} />
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:30, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', marginTop:6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {loadingMatches && (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13, letterSpacing:'0.15em', textTransform:'uppercase' }}>Loading matches...</div>
          )}

          {!loadingMatches && phaseMatches.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14 }}>
              <div style={{ fontSize:40, marginBottom:14 }}>◎</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--white)', marginBottom:8, textTransform:'uppercase' }}>No Matches Yet</div>
              <div style={{ fontSize:14, color:'var(--gray3)', marginBottom:20 }}>Create the draw first to generate H2H matches for this phase.</div>
              <button onClick={()=>setActiveTab('draw')} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', padding:'11px 22px', borderRadius:8, border:'none', background:'var(--neon)', color:'var(--black)', cursor:'pointer' }}>
                Go to Draw Engine →
              </button>
            </div>
          )}

          {!loadingMatches && phaseMatches.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {phaseMatches.map(m => {
                const cfg = STATUS_CFG[m.status] || STATUS_CFG.SCHEDULED
                return (
                  <div key={m.id} style={{ background:'var(--surface)', border:`1px solid ${m.status==='ACTIVE' ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`, borderRadius:14, overflow:'hidden', boxShadow: m.status==='ACTIVE' ? '0 0 24px rgba(0,212,255,0.06)' : 'none' }}>
                    {/* Match header */}
                    <div style={{ padding:'10px 20px', background:'var(--deep)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)' }}>
                        {PHASES.find(p=>p.id===phase)?.label} · Match #{m.matchNumber}
                      </span>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        {m.status === 'ACTIVE' && <span className="live-dot" />}
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', borderRadius:5, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}30` }}>{cfg.label}</span>
                      </div>
                    </div>

                    <div style={{ padding:'20px', display:'grid', gridTemplateColumns:'1fr auto 1fr auto', gap:16, alignItems:'center' }}>
                      {/* Trader 1 */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                          {m.trader1?.countryCode && <FlagImg code={m.trader1.countryCode} name={m.trader1.countryName} size={32} />}
                          <div>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color: m.winner?.id===m.trader1?.id ? 'var(--green)' : 'var(--white)' }}>{m.trader1?.name || 'TBD'}</div>
                            <div style={{ fontSize:12, color:'var(--gray3)' }}>{m.trader1?.countryName}</div>
                          </div>
                          {m.winner?.id===m.trader1?.id && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:5, background:'rgba(0,230,118,0.1)', color:'var(--green)', border:'1px solid rgba(0,230,118,0.3)' }}>Winner ✓</span>}
                        </div>
                        {m.trader1?.returnPct != null && (
                          <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:20, color: m.trader1.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {m.trader1.returnPct >= 0 ? '+' : ''}{m.trader1.returnPct.toFixed(2)}%
                          </div>
                        )}
                      </div>

                      {/* VS */}
                      <div style={{ textAlign:'center', padding:'0 12px' }}>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'var(--gold)', letterSpacing:'0.08em' }}>VS</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--gray3)', marginTop:4 }}>{PHASES.find(p=>p.id===phase)?.dates}</div>
                      </div>

                      {/* Trader 2 */}
                      <div style={{ textAlign:'right' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'flex-end', marginBottom:8 }}>
                          {m.winner?.id===m.trader2?.id && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:5, background:'rgba(0,230,118,0.1)', color:'var(--green)', border:'1px solid rgba(0,230,118,0.3)' }}>Winner ✓</span>}
                          <div>
                            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color: m.winner?.id===m.trader2?.id ? 'var(--green)' : 'var(--white)' }}>{m.trader2?.name || m.status==='WALKOVER' ? 'BYE' : 'TBD'}</div>
                            <div style={{ fontSize:12, color:'var(--gray3)', textAlign:'right' }}>{m.trader2?.countryName}</div>
                          </div>
                          {m.trader2?.countryCode && <FlagImg code={m.trader2.countryCode} name={m.trader2.countryName} size={32} />}
                        </div>
                        {m.trader2?.returnPct != null && (
                          <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:20, color: m.trader2.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {m.trader2.returnPct >= 0 ? '+' : ''}{m.trader2.returnPct.toFixed(2)}%
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div>
                        {m.status !== 'COMPLETED' && m.status !== 'WALKOVER' && (
                          <button onClick={()=>setRecordModal(m)} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', padding:'11px 16px', borderRadius:8, border:'none', background:'var(--neon)', color:'var(--black)', cursor:'pointer', boxShadow:'0 0 14px rgba(0,212,255,0.3)', whiteSpace:'nowrap' }}>
                            Record Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════ TAB: BRACKET VIEW ══════════════════════════════ */}
      {activeTab === 'bracket' && (
        <div>
          {loadingMatches ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13, letterSpacing:'0.15em', textTransform:'uppercase' }}>Loading bracket...</div>
          ) : phaseMatches.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14 }}>
              <div style={{ fontSize:40, marginBottom:14 }}>◎</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--white)', marginBottom:8, textTransform:'uppercase' }}>No Bracket Yet</div>
              <div style={{ fontSize:14, color:'var(--gray3)' }}>Create the draw to generate the H2H bracket for this phase.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:16, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--white)', marginBottom:18 }}>
                {PHASES.find(p=>p.id===phase)?.label} Bracket · {phaseMatches.length} Matches
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:10 }}>
                {phaseMatches.map(m => {
                  const cfg = STATUS_CFG[m.status] || STATUS_CFG.SCHEDULED
                  return (
                    <div key={m.id} style={{ background:'var(--surface)', border:`1px solid ${m.status==='COMPLETED'?'rgba(0,230,118,0.2)':m.status==='ACTIVE'?'rgba(0,212,255,0.25)':'var(--border)'}`, borderRadius:12, padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)' }}>Match #{m.matchNumber}</span>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 8px', borderRadius:4, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}30` }}>{cfg.label}</span>
                      </div>
                      {[m.trader1, m.trader2].map((t, i) => t ? (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i===0 ? '1px solid var(--border)' : 'none' }}>
                          <FlagImg code={t.countryCode} name={t.countryName} size={24} />
                          <span style={{ fontFamily:'var(--font-display)', fontWeight: m.winner?.id===t.id ? 900 : 700, fontSize:14, color: m.winner?.id===t.id ? 'var(--green)' : 'var(--white)', flex:1 }}>
                            {t.name}
                            {m.winner?.id===t.id && ' ✓'}
                          </span>
                          {t.returnPct != null && (
                            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: t.returnPct>=0 ? 'var(--green)' : 'var(--red)' }}>
                              {t.returnPct>=0?'+':''}{t.returnPct.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <div key={i} style={{ padding:'10px 0', borderBottom: i===0 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--gray3)' }}>
                            {m.status==='WALKOVER' ? '🟡 BYE' : 'TBD'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ RECORD RESULT MODAL ════════════════════════════ */}
      {recordModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,4,10,0.85)', backdropFilter:'blur(12px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'var(--deep)', border:'1px solid var(--border)', borderRadius:18, width:'100%', maxWidth:480, overflow:'hidden' }}>
            <div style={{ padding:'22px 28px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--white)', textTransform:'uppercase', margin:0 }}>Record Match Result</h2>
              <button onClick={()=>{setRecordModal(null);setRecordSuccess('')}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:22, lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:28 }}>
              <div style={{ fontSize:14, color:'var(--gray2)', marginBottom:20, lineHeight:1.6 }}>
                Select the winner. This records the result and advances them to the next round.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {[recordModal.trader1, recordModal.trader2].filter(Boolean).map(t => t && (
                  <button key={t.id} onClick={()=>recordResult(recordModal, t.id)} disabled={recordLoading} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderRadius:12, border:'1px solid var(--border2)', background:'var(--surface)', cursor:recordLoading?'not-allowed':'pointer', transition:'all 0.15s', textAlign:'left', opacity:recordLoading?0.5:1 }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--neon)';(e.currentTarget as HTMLElement).style.background='rgba(0,212,255,0.05)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border2)';(e.currentTarget as HTMLElement).style.background='var(--surface)'}}
                  >
                    <FlagImg code={t.countryCode} name={t.countryName} size={32} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--white)' }}>{t.name}</div>
                      <div style={{ fontSize:12, color:'var(--gray3)' }}>{t.countryName}</div>
                    </div>
                    {t.returnPct != null && (
                      <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:16, color:'var(--green)' }}>
                        +{t.returnPct.toFixed(2)}%
                      </div>
                    )}
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.08em', color:'var(--neon)', marginLeft:4 }}>SELECT →</span>
                  </button>
                ))}
              </div>
              {recordSuccess && (
                <div style={{ padding:'12px 16px', borderRadius:8, background: recordSuccess.startsWith('Error') ? 'rgba(255,56,96,0.08)' : 'rgba(0,230,118,0.08)', border:`1px solid ${recordSuccess.startsWith('Error') ? 'rgba(255,56,96,0.3)' : 'rgba(0,230,118,0.3)'}`, fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color: recordSuccess.startsWith('Error') ? 'var(--red)' : 'var(--green)' }}>
                  {recordSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
