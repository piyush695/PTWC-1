'use client'
export const dynamic = 'force-dynamic'
// src/app/leaderboard/page.tsx – real API + CDN flags + auto-refresh
import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'

const flagUrl = (code: string) => `https://flagcdn.com/w80/${(code || '').toLowerCase()}.png`

interface Entry {
  rank: number
  traderId: string
  displayName: string
  countryCode: string
  countryName: string
  returnPct: number
  pnlUsd: number
  maxDrawdown: number
  totalTrades: number
  winRate: number
  currentBalance: number
  openingBalance: number
  qualified: boolean
  status: string
  lastUpdated: string | null
}

const PHASES = [
  { id: 'QUALIFIER',    label: 'Qualifier'   },
  { id: 'ROUND_OF_32',  label: 'Round of 32' },
  { id: 'ROUND_OF_16',  label: 'Round of 16' },
  { id: 'QUARTERFINAL', label: 'Quarters'    },
  { id: 'SEMIFINAL',    label: 'Semis'       },
  { id: 'GRAND_FINAL',  label: 'Grand Final' },
]

function FlagCell({ code, name }: { code: string; name: string }) {
  const [err, setErr] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 23, borderRadius: 3, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface2)' }}>
        {!err
          ? <img src={flagUrl(code)} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray3)' }}>{code}</div>
        }
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 600 }}>{name || code}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray3)' }}>{code}</div>
      </div>
    </div>
  )
}

function DDBadge({ val }: { val: number }) {
  const color = val > 8 ? 'var(--red)' : val > 5 ? 'var(--gold)' : 'var(--green)'
  const pct   = Math.min((val / 12) * 100, 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color }}>{val.toFixed(2)}%</span>
      <div style={{ width: 52, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function PodiumCard({ e, pos }: { e: Entry; pos: number }) {
  const [err, setErr] = useState(false)
  const medals = ['🥇','🥈','🥉']
  const borderColors = ['rgba(240,192,64,0.35)','rgba(192,208,224,0.25)','rgba(205,128,80,0.25)']
  const bgColors = ['rgba(240,192,64,0.05)','var(--surface)','var(--surface)']
  return (
    <div style={{ background: bgColors[pos], border: `1px solid ${borderColors[pos]}`, borderRadius: 16, padding: '28px 24px', position: 'relative', overflow: 'hidden', boxShadow: pos === 0 ? '0 0 40px rgba(240,192,64,0.08)' : 'none' }}>
      {pos === 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--gold),transparent)' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontSize: 30 }}>{medals[pos]}</span>
        {e.qualified && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(0,230,118,0.12)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 5, padding: '3px 9px' }}>✓ Qualified</span>}
      </div>
      {/* Flag */}
      <div style={{ width: 52, height: 36, borderRadius: 4, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
        {!err
          ? <img src={flagUrl(e.countryCode)} alt={e.countryName} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--gray3)', fontFamily: 'var(--font-mono)' }}>{e.countryCode}</div>
        }
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 2 }}>{e.displayName}</div>
      <div style={{ fontSize: 12, color: 'var(--gray3)', marginBottom: 18 }}>{e.countryName}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 32, color: e.returnPct >= 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
        {e.returnPct >= 0 ? '+' : ''}{e.returnPct.toFixed(2)}%
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gray3)', marginTop: 3, marginBottom: 16 }}>NET RETURN</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'P&L',     value: `${e.pnlUsd >= 0 ? '+' : ''}$${e.pnlUsd.toFixed(0)}`,  color: e.pnlUsd >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Max DD',  value: `${e.maxDrawdown.toFixed(1)}%`,                         color: e.maxDrawdown > 8 ? 'var(--red)' : 'var(--gold)' },
          { label: 'Trades',  value: String(e.totalTrades),                                   color: 'var(--white)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [entries, setEntries]     = useState<Entry[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)
  const [phase, setPhase]         = useState('QUALIFIER')
  const [search, setSearch]       = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date|null>(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [countdown, setCountdown]     = useState(30)
  const [totalCount, setTotalCount]   = useState(0)
  const timerRef = useRef<NodeJS.Timeout|null>(null)
  const countRef = useRef<NodeJS.Timeout|null>(null)

  const fetch_ = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true)
    try {
      const r    = await fetch(`/api/leaderboard?phase=${phase}&limit=200`)
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      setEntries(data.leaderboard ?? [])
      setTotalCount(data.pagination?.total ?? 0)
      setLastUpdated(new Date())
      setError(null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setRefreshing(false); setCountdown(30) }
  }, [phase])

  useEffect(() => { fetch_(false) }, [fetch_])

  useEffect(() => {
    timerRef.current = setInterval(() => fetch_(true), 30_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetch_])

  useEffect(() => {
    countRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1_000)
    return () => { if (countRef.current) clearInterval(countRef.current) }
  }, [])

  const filtered = entries.filter(e =>
    !search ||
    (e?.displayName||'').toLowerCase().includes(search.toLowerCase()) ||
    (e.countryName || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.countryCode || '').toLowerCase().includes(search.toLowerCase())
  )
  const top3 = filtered.slice(0, 3)
  const rest  = filtered.slice(3)

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />

      {/* HEADER */}
      <div style={{ paddingTop: 64, background: 'var(--deep)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 10 }}>Live Rankings</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px,5vw,64px)', color: 'var(--white)', lineHeight: 1, textTransform: 'uppercase', margin: 0 }}>World Cup Leaderboard</h1>
              <p style={{ color: 'var(--gray2)', marginTop: 10, fontSize: 15 }}>Top trader per country advances · Synced live from the trading platform</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
                <span className="live-dot" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray2)' }}>{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
                <span style={{ color: 'var(--border2)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: refreshing ? 'var(--neon)' : 'var(--gray3)', transition: 'color 0.3s' }}>{refreshing ? 'SYNCING...' : `↻ ${countdown}s`}</span>
              </div>
              <button onClick={() => fetch_(false)} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.08)', color: 'var(--neon)', cursor: 'pointer' }}>↻ Refresh</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Registered', value: (totalCount || entries.length).toLocaleString() },
              { label: 'Countries',         value: String(new Set(entries.map(e => e.countryCode)).size) },
              { label: 'Avg Return',        value: entries.length ? `${entries.reduce((s,e)=>s+e.returnPct,0)/entries.length >= 0 ? '+':''}${(entries.reduce((s,e)=>s+e.returnPct,0)/entries.length).toFixed(2)}%` : '—' },
              { label: 'Top Return',        value: entries[0] ? `+${entries[0].returnPct.toFixed(2)}%` : '—' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: 'var(--white)' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gray3)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 28px 80px' }}>

        {/* PHASE TABS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, flexWrap: 'wrap' }}>
          {PHASES.map(p => (
            <button key={p.id} onClick={() => setPhase(p.id)} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 8, border: `1px solid ${phase===p.id ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`, background: phase===p.id ? 'rgba(0,212,255,0.1)' : 'transparent', color: phase===p.id ? 'var(--neon)' : 'var(--gray3)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <input className="input-field" placeholder="🔍  Search trader name or country..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 440, marginBottom: 28 }} />

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--neon)', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)' }}>Loading...</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div style={{ background: 'rgba(255,56,96,0.07)', border: '1px solid rgba(255,56,96,0.25)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ color: 'var(--red)', fontSize: 20 }}>⚠</span>
            <span style={{ fontSize: 14, color: 'var(--red)' }}>{error}</span>
            <button onClick={() => fetch_(false)} style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,56,96,0.3)', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--white)', marginBottom: 8, textTransform: 'uppercase' }}>
              {search ? 'No traders found' : 'No data yet for this phase'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray3)' }}>
              {search ? 'Try a different search.' : 'Rankings will appear here once trading begins.'}
            </div>
          </div>
        )}

        {/* PODIUM */}
        {!loading && !search && filtered.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 36 }}>
            {top3.map((e, i) => <PodiumCard key={e.traderId} e={e} pos={i} />)}
          </div>
        )}

        {/* TABLE */}
        {!loading && filtered.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {refreshing && <div style={{ height: 2, background: 'linear-gradient(90deg,var(--neon),var(--gold))', opacity: 0.7 }} />}
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 190px 120px 130px 110px 90px 80px 110px', background: 'var(--deep)', padding: '0 16px', borderBottom: '1px solid var(--border2)' }}>
              {['#','Trader','Country','Return %','P&L','Balance','DD','Trades','Status'].map((h,i) => (
                <div key={h} style={{ padding: '13px 8px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', textAlign: i > 2 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {(search ? filtered : [...top3,...rest]).map(e => (
              <div key={e.traderId} className="tr-hover" style={{ display: 'grid', gridTemplateColumns: '56px 1fr 190px 120px 130px 110px 90px 80px 110px', padding: '0 16px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ padding: '15px 8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: e.rank===1?'var(--gold)':e.rank===2?'#c0d0e0':e.rank===3?'#cd8050':'var(--gray3)' }}>
                    {e.rank<=3?['🥇','🥈','🥉'][e.rank-1]:`#${e.rank}`}
                  </span>
                </div>
                <div style={{ padding: '15px 8px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'var(--white)' }}>{e.displayName}</div>
                  {e.lastUpdated && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gray3)', marginTop: 1 }}>↻ {new Date(e.lastUpdated).toLocaleTimeString()}</div>}
                </div>
                <div style={{ padding: '15px 8px' }}><FlagCell code={e.countryCode} name={e.countryName} /></div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: e.returnPct>=0?'var(--green)':'var(--red)' }}>{e.returnPct>=0?'+':''}{e.returnPct.toFixed(2)}%</span>
                </div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: e.pnlUsd>=0?'var(--green)':'var(--red)' }}>{e.pnlUsd>=0?'+':''}${e.pnlUsd.toFixed(2)}</span>
                </div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gray1)' }}>${(e.currentBalance||0).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}><DDBadge val={e.maxDrawdown} /></div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: e.totalTrades>=10?'var(--white)':'var(--gold)' }}>
                    {e.totalTrades}{e.totalTrades < 10 && <span style={{ fontSize: 10, marginLeft: 2 }}>⚠</span>}
                  </span>
                </div>
                <div style={{ padding: '15px 8px', textAlign: 'right' }}>
                  {e.qualified
                    ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 5, background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)' }}>✓ Qualified</span>
                    : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 5, background: 'rgba(0,212,255,0.08)', color: 'var(--neon)', border: '1px solid rgba(0,212,255,0.2)' }}>Active</span>
                  }
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--deep)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray3)' }}>Showing {filtered.length} of {totalCount||filtered.length} traders</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray3)' }}>Auto-refreshes every 30s · Sourced from live MT5 platform</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
