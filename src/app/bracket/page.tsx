'use client'
export const dynamic = 'force-dynamic'
// src/app/bracket/page.tsx — real data from /api/bracket
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'

const flagUrl = (code: string) => `https://flagcdn.com/w40/${(code||'').toLowerCase()}.png`

const PHASE_ORDER = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','GRAND_FINAL']
const PHASE_LABELS: Record<string,string> = {
  ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16',
  QUARTER_FINAL:'Quarterfinals', SEMI_FINAL:'Semifinals', GRAND_FINAL:'🏆 Grand Final',
}

function MatchCard({ match }: { match: any }) {
  const Slot = ({ participant, result }: { participant: any; result: any }) => {
    if (!participant) return (
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.3 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--gray3)' }}>?</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--gray3)', letterSpacing: '0.05em' }}>TBD</span>
      </div>
    )
    const cc = participant.trader?.country?.code || ''
    const isWinner = result?.winnerId === participant.traderId
    const isLoser = match.status === 'COMPLETED' && !isWinner
    return (
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: isWinner ? 'rgba(0,230,118,0.06)' : 'transparent', opacity: isLoser ? 0.35 : 1 }}>
        {cc && <div style={{ width: 22, height: 15, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}><img src={flagUrl(cc)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: isWinner ? 'var(--green)' : 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {participant.trader?.displayName || '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray3)' }}>{cc}</div>
        </div>
        {result?.p1ReturnPct != null && (
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: isWinner ? 'var(--green)' : isLoser ? 'var(--red)' : 'var(--gray1)', flexShrink: 0 }}>
            {result.p1ReturnPct >= 0 ? '+' : ''}{result.p1ReturnPct?.toFixed(2)}%
          </div>
        )}
        {isWinner && <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>}
      </div>
    )
  }

  const isLive = match.status === 'IN_PROGRESS'
  const isDone = match.status === 'COMPLETED'

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${isLive ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', minWidth: 220, boxShadow: isLive ? '0 0 20px rgba(0,212,255,0.12)' : 'none' }}>
      {isLive && (
        <div style={{ background: 'rgba(0,212,255,0.08)', borderBottom: '1px solid rgba(0,212,255,0.2)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--neon)' }}>LIVE</span>
        </div>
      )}
      <div style={{ borderBottom: '1px solid var(--border)' }}><Slot participant={match.participant1} result={match.result} /></div>
      <Slot participant={match.participant2} result={match.result} />
    </div>
  )
}

export default function BracketPage() {
  const [rounds, setRounds]         = useState<Record<string, any[]>>({})
  const [activePhase, setActivePhase] = useState('ROUND_OF_32')
  const [loading, setLoading]       = useState(true)
  const [currentPhase, setCurrentPhase] = useState('')

  useEffect(() => {
    Promise.all(
      PHASE_ORDER.map(phase =>
        fetch(`/api/bracket?phase=${phase}`).then(r => r.json()).catch(() => ({ matches: [] }))
      )
    ).then(results => {
      const byPhase: Record<string, any[]> = {}
      PHASE_ORDER.forEach((phase, i) => { byPhase[phase] = results[i].matches || [] })
      setRounds(byPhase)

      // Set active phase to first one with matches
      const active = PHASE_ORDER.find(p => (byPhase[p] || []).length > 0) || 'ROUND_OF_32'
      setActivePhase(active)
      // Find live phase
      const live = PHASE_ORDER.find(p => (byPhase[p] || []).some((m: any) => m.status === 'IN_PROGRESS'))
      if (live) setCurrentPhase(live)
      setLoading(false)
    })
    fetch('/api/config').then(r=>r.json()).then(d => { if (d.config?.currentPhase) setCurrentPhase(d.config.currentPhase) }).catch(()=>{})
  }, [])

  const activeMatches = rounds[activePhase] || []
  const liveMatches = activeMatches.filter((m: any) => m.status === 'IN_PROGRESS')

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ paddingTop: 64, background: 'var(--deep)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px 0' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Tournament</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px, 5vw, 64px)', color: 'var(--white)', marginBottom: 8 }}>H2H Bracket</h1>
          <p style={{ color: 'var(--gray2)', fontSize: 15, marginBottom: 32 }}>Head-to-head elimination · Highest % return each week advances</p>

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 0 }}>
            {PHASE_ORDER.map(phase => {
              const hasMatches = (rounds[phase] || []).length > 0
              const hasLive = (rounds[phase] || []).some((m: any) => m.status === 'IN_PROGRESS')
              return (
                <button key={phase} onClick={() => setActivePhase(phase)} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: 'transparent', color: activePhase === phase ? 'var(--neon)' : hasMatches ? 'var(--gray2)' : 'var(--gray3)', borderBottom: `2px solid ${activePhase === phase ? 'var(--neon)' : 'transparent'}`, transition: 'all 0.2s', opacity: hasMatches ? 1 : 0.4 }}>
                  {PHASE_LABELS[phase]}
                  {hasLive && <span className="badge badge-red" style={{ marginLeft: 8 }}>LIVE</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--gray3)', fontFamily: 'var(--font-display)', fontSize: 13 }}>Loading bracket…</div>
        ) : activeMatches.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--white)', marginBottom: 8 }}>{PHASE_LABELS[activePhase]}</div>
            <div style={{ color: 'var(--gray3)', fontSize: 14 }}>Matches for this round have not been drawn yet.</div>
          </div>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span className="live-dot" />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--white)' }}>Live Right Now</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16 }}>
                  {liveMatches.map((match: any) => {
                    const p1 = match.participant1?.trader
                    const p2 = match.participant2?.trader
                    const ret1 = match.result?.p1ReturnPct || 0
                    const ret2 = match.result?.p2ReturnPct || 0
                    return (
                      <div key={match.id} className="card-glow" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--neon), transparent)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                          <span className="live-dot" />
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.15em', color: 'var(--neon)' }}>{PHASE_LABELS[activePhase]} — LIVE</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            {p1?.country?.code && <div style={{ margin: '0 auto 6px', width: 40, height: 27, borderRadius: 3, overflow: 'hidden' }}><img src={flagUrl(p1.country.code)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)', marginBottom: 12 }}>{p1?.displayName || '—'}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, color: ret1 > ret2 ? 'var(--green)' : 'var(--red)' }}>{ret1 >= 0 ? '+' : ''}{ret1.toFixed(2)}%</div>
                            {ret1 > ret2 && <div style={{ marginTop: 6 }}><span className="badge badge-green">Leading</span></div>}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--gold)', letterSpacing: '0.1em' }}>VS</div>
                            <div style={{ width: 1, height: 40, background: 'var(--border2)', margin: '8px auto' }} />
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray3)' }}>LIVE</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {p2?.country?.code && <div style={{ margin: '0 auto 6px', width: 40, height: 27, borderRadius: 3, overflow: 'hidden' }}><img src={flagUrl(p2.country.code)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--white)', marginBottom: 12 }}>{p2?.displayName || '—'}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, color: ret2 > ret1 ? 'var(--green)' : 'var(--red)' }}>{ret2 >= 0 ? '+' : ''}{ret2.toFixed(2)}%</div>
                            {ret2 > ret1 && <div style={{ marginTop: 6 }}><span className="badge badge-green">Leading</span></div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--white)', marginBottom: 24 }}>{PHASE_LABELS[activePhase]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {activeMatches.map((match: any) => <MatchCard key={match.id} match={match} />)}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray2)' }}>Scoring</div>
          {[['Primary','Net % Return'],['Tiebreaker 1','Lower Max Drawdown'],['Tiebreaker 2','More Trades'],['Min Trades','10 per round'],['Round Duration','5 days (Mon–Fri)']].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--gray3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}:</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--white)' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
