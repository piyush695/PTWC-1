'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code?.toLowerCase()}.png`

function DrawdownRing({ value, max, color, label }: { value:number; max:number; color:string; label:string }) {
  const pct = Math.min(100, (value / max) * 100)
  const r = 28, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width={70} height={70} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
        <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 0.6s ease', filter:`drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div style={{ textAlign:'center', marginTop:-6 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:16, color, lineHeight:1 }}>{value.toFixed(1)}%</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', marginTop:3 }}>{label}</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--gray3)' }}>max {max}%</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [time, setTime]         = useState(new Date())
  const [trader, setTrader]     = useState<any>(null)
  const [account, setAccount]   = useState<any>(null)
  const [trades, setTrades]     = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [notifs, setNotifs]     = useState<any[]>([])
  const [config, setConfig]     = useState<any>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv) }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/trader-me').then(r=>r.json()),
      fetch('/api/trader/account').then(r=>r.json()),
      fetch('/api/trader/trades?limit=5').then(r=>r.json()),
      fetch('/api/leaderboard?limit=5').then(r=>r.json()),
      fetch('/api/notifications').then(r=>r.json()),
      fetch('/api/config').then(r=>r.json()),
    ]).then(([me, acc, tr, lb, notifR, cfg]) => {
      if (me.user) setTrader(me.user.trader || me.user)
      if (acc.account) setAccount(acc.account)
      if (tr.trades) setTrades(tr.trades.slice(0,5))
      if (lb.leaderboard) setLeaderboard(lb.leaderboard.slice(0,5))
      if (notifR.notifications) setNotifs(notifR.notifications.filter((n:any)=>!n.isRead).slice(0,4))
      if (cfg.config) setConfig(cfg.config)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const t = trader || {}
  const a = account || {}
  const returnPct   = parseFloat(a.currentBalance && a.openingBalance ? (((a.currentBalance - a.openingBalance) / a.openingBalance) * 100).toFixed(2) : '0')
  const maxDD       = parseFloat(a.maxDrawdown || '0')
  const winRate     = a.totalTrades ? ((a.winningTrades / a.totalTrades) * 100).toFixed(1) : '0'
  const profit      = a.currentBalance && a.openingBalance ? (a.currentBalance - a.openingBalance) : 0
  const qe          = t.qualifierEntry || t.trader?.qualifierEntry
  const rank        = qe?.rank || null

  const PHASE_LABEL: Record<string,string> = { REGISTRATION:'Registration Open', QUALIFIER:'Qualifier Active', ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16', QUARTERFINAL:'Quarterfinals', SEMIFINAL:'Semifinals', GRAND_FINAL:'Grand Final', COMPLETED:'Tournament Complete' }

  const TIMELINE = [
    { label:'Registration', date: config?.registrationDeadline ? new Date(config.registrationDeadline).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'May 30', phase:'REGISTRATION' },
    { label:'Qualifier',    date: config?.qualifierStart ? `${new Date(config.qualifierStart).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}–${new Date(config.qualifierEnd||config.qualifierStart).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` : 'Jun 1–12', phase:'QUALIFIER' },
    { label:'Round of 32',  date:'Jun 15', phase:'ROUND_OF_32' },
    { label:'Round of 16',  date:'Jun 22', phase:'ROUND_OF_16' },
    { label:'Quarters',     date:'Jun 29', phase:'QUARTERFINAL' },
    { label:'Semis',        date:'Jul 6',  phase:'SEMIFINAL' },
    { label:'Grand Final',  date: config?.grandFinalDate ? new Date(config.grandFinalDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Jul 18', phase:'GRAND_FINAL' },
  ]

  if (loading) return (
    <DashboardLayout trader={{}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
        <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTop:'3px solid var(--neon)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <div style={{ fontFamily:'var(--font-display)', fontSize:13, color:'var(--gray3)', letterSpacing:'0.15em' }}>LOADING DASHBOARD</div>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout trader={t}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>Trader Dashboard</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', lineHeight:1, margin:0 }}>
            Welcome back, {t.displayName || t.firstName || 'Trader'}
          </h1>
          {t.country && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
              {t.country?.code && <img src={flagUrl(t.country.code)} alt="" style={{ width:24, height:16, objectFit:'cover', borderRadius:2 }} />}
              <span style={{ fontSize:13, color:'var(--gray3)' }}>{t.country?.name || t.country}</span>
              {rank && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--gold)', background:'rgba(240,192,64,0.1)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:4, padding:'2px 8px' }}>#{rank} Qualifier</span>}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ padding:'10px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)' }}>{time.toLocaleTimeString('en-GB')}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)', marginTop:2 }}>{config ? PHASE_LABEL[config.currentPhase] || config.currentPhase : 'Loading...'}</div>
          </div>
        </div>
      </div>

      {/* Account hero — only if account provisioned */}
      {a.accountNumber ? (
        <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:14, padding:'24px 28px', marginBottom:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,var(--neon),transparent)' }} />
          <div style={{ display:'flex', gap:0, flexWrap:'wrap' }}>
            {[
              { label:'Account', value:a.accountNumber, mono:true },
              { label:'Server',  value:a.platform?.serverName || a.platform?.name || '—', mono:true },
              { label:'Balance', value:`$${Number(a.currentBalance).toLocaleString('en',{minimumFractionDigits:2})}`, color:'var(--white)' },
              { label:'Return',  value:`${returnPct >= 0 ? '+' : ''}${returnPct}%`, color:returnPct>=0?'var(--green)':'var(--red)' },
              { label:'Status',  value:a.status, color:a.status==='ACTIVE'?'var(--green)':'var(--gold)' },
            ].map((item, i) => (
              <div key={item.label} style={{ flex:1, minWidth:120, padding:'0 20px', borderRight:i<4?'1px solid var(--border)':'none', marginBottom:8 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>{item.label}</div>
                <div style={{ fontFamily:item.mono?'var(--font-mono)':'var(--font-display)', fontWeight:700, fontSize:14, color:item.color||'var(--gray1)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background:'rgba(240,192,64,0.04)', border:'1px solid rgba(240,192,64,0.2)', borderRadius:14, padding:20, marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:24 }}>⏳</span>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--gold)' }}>Account Being Provisioned</div>
            <div style={{ fontSize:13, color:'var(--gray3)', marginTop:3 }}>Your $10,000 funded trading account is being set up. You'll receive an email with your MT5 credentials within 24 hours after KYC approval.</div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Net Profit',    value: profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`, color:profit>=0?'var(--green)':'var(--red)' },
          { label:'Total Trades',  value: a.totalTrades ?? '—', color:'var(--white)' },
          { label:'Win Rate',      value: a.totalTrades ? `${winRate}%` : '—', color:'var(--neon)' },
          { label:'Max Drawdown',  value: `${maxDD.toFixed(2)}%`, color:maxDD>8?'var(--red)':maxDD>5?'var(--gold)':'var(--green)' },
          { label:'Volume (Lots)', value: a.totalVolumeLots ? Number(a.totalVolumeLots).toFixed(2) : '—', color:'var(--gray1)' },
          { label:'Qualifier Rank',value: rank ? `#${rank}` : '—', color:'var(--gold)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:s.color, lineHeight:1 }}>{String(s.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Drawdown gauges */}
        {a.accountNumber && (
          <div className="card">
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:16 }}>Risk Gauges</div>
            <div style={{ display:'flex', justifyContent:'space-around' }}>
              <DrawdownRing value={maxDD} max={parseFloat(config?.totalDrawdownPct || '12')} color={maxDD > (config?.totalDrawdownPct*0.75||9) ? 'var(--red)' : 'var(--neon)'} label="Total DD" />
              <DrawdownRing value={0} max={parseFloat(config?.dailyDrawdownPct || '8')} color="var(--green)" label="Daily DD" />
            </div>
          </div>
        )}

        {/* Notifications preview */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)' }}>Notifications</div>
            <Link href="/dashboard/notifications" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--neon)', textDecoration:'none' }}>View All →</Link>
          </div>
          {notifs.length === 0 ? (
            <div style={{ color:'var(--gray3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>All caught up ✓</div>
          ) : notifs.map((n:any) => (
            <div key={n.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{n.type==='WARNING'?'⚠':n.type==='SUCCESS'?'✓':'ℹ'}</span>
              <div style={{ fontSize:12, color:'var(--gray2)', lineHeight:1.5, flex:1 }}>{n.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent trades */}
      {trades.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)' }}>Recent Trades</div>
            <Link href="/dashboard/trades" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--neon)', textDecoration:'none' }}>View All →</Link>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Symbol','Direction','Lots','Open','Close','P&L','Time'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((tr:any) => (
                <tr key={tr.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>{tr.symbol}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:tr.direction==='BUY'?'var(--green)':'var(--red)', background:tr.direction==='BUY'?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', borderRadius:4, padding:'2px 8px' }}>{tr.direction}</span>
                  </td>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray2)' }}>{tr.lots}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray3)' }}>{Number(tr.openPrice).toFixed(5)}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray3)' }}>{tr.closePrice ? Number(tr.closePrice).toFixed(5) : <span style={{color:'var(--neon)'}}>OPEN</span>}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color:Number(tr.profit)>=0?'var(--green)':'var(--red)' }}>
                    {tr.profit != null ? `${Number(tr.profit)>=0?'+':''}$${Number(tr.profit).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding:'9px 10px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)' }}>
                    {new Date(tr.openTime).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nearby leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)' }}>Qualifier Leaderboard</div>
            <Link href="/dashboard/leaderboard" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--neon)', textDecoration:'none' }}>Full Board →</Link>
          </div>
          {leaderboard.map((e:any) => {
            const isMe = e.traderId === (t.id || t.trader?.id)
            return (
              <div key={e.traderId} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 4px', borderBottom:'1px solid var(--border)', background:isMe?'rgba(0,212,255,0.04)':'transparent', margin:'0 -4px', borderRadius:isMe?6:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:e.rank<=3?'var(--gold)':'var(--gray3)', width:32, textAlign:'center', flexShrink:0 }}>#{e.rank}</div>
                <img src={flagUrl(e.countryCode)} alt="" style={{ width:22, height:15, objectFit:'cover', borderRadius:2, flexShrink:0 }} onError={e=>{(e.target as HTMLElement).style.display='none'}} />
                <div style={{ flex:1, fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:isMe?'var(--neon)':'var(--white)' }}>{e.displayName}{isMe?' (you)':''}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color:Number(e.returnPct)>=0?'var(--green)':'var(--red)' }}>+{Number(e?.returnPct||0).toFixed(2)}%</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tournament timeline */}
      <div className="card">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:20 }}>Tournament Timeline</div>
        <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
          {TIMELINE.map((step, i) => {
            const currentIdx = TIMELINE.findIndex(s => s.phase === config?.currentPhase)
            const done   = i < currentIdx
            const active = i === currentIdx
            return (
              <div key={step.label} style={{ flex:1, minWidth:80, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
                {i < TIMELINE.length - 1 && (
                  <div style={{ position:'absolute', top:13, left:'50%', right:'-50%', height:2, background:done?'var(--neon)':'var(--border)', zIndex:0, transition:'background 0.3s' }} />
                )}
                <div style={{ width:26, height:26, borderRadius:'50%', background:done?'var(--neon)':active?'rgba(0,212,255,0.2)':'var(--surface2)', border:active?'2px solid var(--neon)':done?'none':'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:done?'var(--black)':active?'var(--neon)':'var(--gray3)', fontWeight:700, zIndex:1, position:'relative', boxShadow:active?'0 0 12px rgba(0,212,255,0.4)':'none', transition:'all 0.3s' }}>
                  {done ? '✓' : i+1}
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:active?'var(--white)':done?'var(--neon)':'var(--gray3)', marginTop:8, textAlign:'center' }}>{step.label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--gray3)', marginTop:2, textAlign:'center' }}>{step.date}</div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
