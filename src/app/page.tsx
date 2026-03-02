'use client'
export const dynamic = 'force-dynamic'
// src/app/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/hero/HeroSection'
import { useTournamentConfig, fmtMoney, fmtMoneyFull, fmtDate, fmtDateRange } from '@/lib/useTournamentConfig'

export default function HomePage() {
  const { config } = useTournamentConfig()
  const [prizeTiers, setPrizeTiers] = useState<{key:string;label:string;prize:string;position:number}[]>([])
  useEffect(() => {
    fetch('/api/prizes').then(r=>r.json()).then(d=>{ if(d.prizes) setPrizeTiers(d.prizes) }).catch(()=>{})
  }, [])
  const prizes = [
    { place:'1ST',    emoji:'🥇', amount:fmtMoneyFull(config.firstPrize),    label:'Grand Champion',       highlight:true  },
    { place:'2ND',    emoji:'🥈', amount:fmtMoneyFull(config.secondPrize),    label:'Runner Up',            highlight:false },
    { place:'3RD',    emoji:'🥉', amount:'$7,500 ×2',  label:'Semi-Finalists',       highlight:false },
    { place:'TOP 8',  emoji:'🏅', amount:'Funded Acc', label:'Quarter-Finalists',    highlight:false },
  ]

  const steps = [
    { num:'01', title:'Register',    desc:'Sign up, complete KYC, claim your country\'s flag. Completely free to enter.' },
    { num:"02", title:"Qualifier",   desc:`${fmtDateRange(config.qualifierStart, config.qualifierEnd)}. Trade on a ${fmtMoney(config.qualifierAccountSize)} funded account. Top trader per country advances.` },
    { num:'03', title:'H2H Bracket', desc:'June 15 – July 10. Weekly battles: R32 → R16 → Quarters → Semis.' },
    { num:"04", title:"Grand Final", desc:`${fmtDate(config.grandFinalDate,'monthday')} — LIVE on stage in Dubai. Two finalists. One World Cup champion.` },
  ]

  const rules = [
    `${fmtMoneyFull(config.qualifierAccountSize)} standardized funded account every round`,
    `Scored on Net % Return — minimum ${config.minTradesPerRound} trades required`,
    `${config.dailyDrawdownPct}% daily / ${config.totalDrawdownPct}% total drawdown auto-disqualifies`,
    'All trades audited — anti-cheat system active 24/7',
    `Maximum leverage 1:${config.maxLeverage} across all rounds`,
    'Major FX, Gold, Oil, Indices — all eligible instruments',
  ]

  const qStart = new Date(config.qualifierStart + 'T12:00:00Z')
  const qEnd   = new Date(config.qualifierEnd   + 'T12:00:00Z')
  const gf     = new Date(config.grandFinalDate + 'T12:00:00Z')
  const fmt = (d: Date) => d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})
  const timeline = [
    { date: `${fmt(new Date(config.registrationDeadline.slice(0,7)+'-01T12:00:00Z'))} – ${fmt(new Date(config.registrationDeadline+'T12:00:00Z'))}`, event:'Registration Open', active: config.currentPhase === 'REGISTRATION' },
    { date: fmtDateRange(config.qualifierStart, config.qualifierEnd),      event:'Open Qualifier',      active: config.currentPhase === 'QUALIFIER'    },
    { date: 'R32',  event:'Round of 32',   active: config.currentPhase === 'ROUND_OF_32'   },
    { date: 'R16',  event:'Round of 16',   active: config.currentPhase === 'ROUND_OF_16'   },
    { date: 'QF',   event:'Quarterfinals', active: config.currentPhase === 'QUARTERFINAL'  },
    { date: 'SF',   event:'Semifinals',    active: config.currentPhase === 'SEMIFINAL'      },
    { date: fmt(gf), event:'🏆 Grand Final LIVE', active: config.currentPhase === 'GRAND_FINAL' },
  ]

  return (
    <div style={{ background:'var(--black)', minHeight:'100vh' }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ padding:'120px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ marginBottom:64 }}>
          <div className="section-label" style={{ marginBottom:20 }}>How It Works</div>
          <h2 style={{
            fontFamily:'var(--font-display)', fontWeight:900,
            fontSize:'clamp(64px,7vw,100px)', textTransform:'uppercase',
            color:'var(--white)', lineHeight:0.95,
          }}>
            Four Phases.<br /><span className="text-neon">One Champion.</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:2 }}>
          {steps.map((step, i) => (
            <div key={step.num}
              style={{ background:'var(--surface)', padding:'44px 36px 40px', borderTop:'2px solid var(--neon)', position:'relative', transition:'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--surface2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='var(--surface)'}
            >
              <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)', letterSpacing:'0.15em', marginBottom:20 }}>{step.num}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', marginBottom:16, textTransform:'uppercase' }}>{step.title}</h3>
              {/* SUBTEXT: large, bright, high-opacity */}
              <p style={{ fontSize:19, color:'rgba(215,228,248,0.93)', lineHeight:1.75, fontWeight:500, margin:0 }}>{step.desc}</p>
              {i < steps.length-1 && (
                <div style={{ position:'absolute', top:'50%', right:-14, transform:'translateY(-50%)', color:'var(--neon)', fontSize:24, zIndex:10 }}>›</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRIZE POOL ───────────────────────────────────────── */}
      <section style={{ padding:'120px 32px', background:'var(--deep)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>

          {/* Heading */}
          <div style={{ textAlign:'center', marginBottom:72 }}>
            <div className="section-label" style={{ marginBottom:20 }}>Prize Structure</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(64px,7vw,100px)', textTransform:'uppercase', lineHeight:0.9, margin:0 }}>
              {/* @ts-ignore */}<span className="text-gold-shimmer">{fmtMoneyFull(config.totalPrizePool)}</span><br />
              <span style={{ color:'var(--white)' }}>Prize Pool</span>
            </h2>
          </div>

          {/* ── TOP 3 PODIUM CARDS ─────────────────────────────────── */}
          {prizeTiers.length > 0 && (() => {
            const top3 = prizeTiers.filter(p => ['place_1','place_2','place_3'].includes(p.key))
            const rest = prizeTiers.filter(p => !['place_1','place_2','place_3'].includes(p.key))
            const PODIUM = [
              { key:'place_1', emoji:'🥇', glow:'rgba(240,192,64,0.25)', border:'rgba(240,192,64,0.4)',  bg:'rgba(240,192,64,0.07)', color:'var(--gold)',  size:52, order:0 },
              { key:'place_2', emoji:'🥈', glow:'rgba(180,200,235,0.15)',border:'rgba(180,200,235,0.25)',bg:'rgba(180,200,235,0.04)',color:'#c8d8f0',    size:44, order:-1 },
              { key:'place_3', emoji:'🥉', glow:'rgba(205,127,50,0.15)', border:'rgba(205,127,50,0.25)', bg:'rgba(205,127,50,0.04)', color:'#e8a060',    size:40, order:1  },
            ]
            const sorted = [...PODIUM].sort((a,b) => a.order - b.order)
            return (
              <>
                {/* Podium — 2nd left, 1st center (tallest), 3rd right */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16, alignItems:'flex-end' }}>
                  {sorted.map(cfg => {
                    const tier = top3.find(t => t.key === cfg.key)
                    if (!tier) return null
                    const is1st = cfg.key === 'place_1'
                    return (
                      <div key={cfg.key} style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 16,
                        padding: is1st ? '56px 32px 48px' : '40px 24px 36px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: `0 0 60px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                        transform: is1st ? 'translateY(-16px)' : 'none',
                        transition: 'transform 0.3s ease',
                      }}>
                        {/* Glow orb behind */}
                        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:200, height:200, borderRadius:'50%', background:`radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, pointerEvents:'none' }} />
                        {/* Crown for 1st */}
                        {is1st && <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', fontSize:22, opacity:0.8 }}>👑</div>}
                        <div style={{ fontSize: cfg.size, marginBottom:16, position:'relative' }}>{cfg.emoji}</div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:cfg.color, marginBottom:8, opacity:0.85 }}>{tier.label}</div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize: is1st?44:34, color:cfg.color, lineHeight:1, marginBottom:8 }}>{tier.prize}</div>
                        <div style={{ width:40, height:2, background:cfg.border, margin:'12px auto 0', borderRadius:2 }} />
                      </div>
                    )
                  })}
                </div>

                {/* ── POSITIONS 4-10 ─────────────────────────────── */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:12 }}>
                  {rest.filter(t => ['place_4','place_5','place_6','place_7','place_8','place_9','place_10'].includes(t.key)).map(tier => (
                    <div key={tier.key} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 14px', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--white)', marginBottom:8 }}>{tier.label}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--gold)', lineHeight:1 }}>{tier.prize}</div>
                    </div>
                  ))}
                </div>

                {/* ── RANGE PRIZES + SPECIAL ─────────────────────── */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
                  {rest.filter(t => !['place_4','place_5','place_6','place_7','place_8','place_9','place_10'].includes(t.key)).map(tier => {
                    const isSpecial = ['most_lots','lowest_dd'].includes(tier.key)
                    return (
                      <div key={tier.key} style={{
                        background: isSpecial ? 'rgba(0,212,255,0.04)' : 'var(--surface)',
                        border: `1px solid ${isSpecial ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`,
                        borderRadius:10, padding:'16px 20px',
                        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                      }}>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)', lineHeight:1.3 }}>
                          {isSpecial && <span style={{ marginRight:6 }}>{tier.key==='most_lots'?'📊':'📉'}</span>}
                          {tier.label}
                        </div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--gold)', whiteSpace:'nowrap' }}>{tier.prize}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}

        </div>
      </section>

      {/* ── RULES + TIMELINE ─────────────────────────────────── */}
      <section style={{ padding:'120px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64 }}>
          <div>
            <div className="section-label" style={{ marginBottom:20 }}>Tournament Rules</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(56px,5.5vw,80px)', textTransform:'uppercase', color:'var(--white)', lineHeight:0.95, marginBottom:48 }}>
              Fair.<br />Transparent.<br /><span className="text-neon">Audited.</span>
            </h2>
            {rules.map((rule,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:20 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--neon)', marginTop:9, flexShrink:0, boxShadow:'0 0 10px rgba(0,212,255,0.7)' }} />
                {/* Rule text — full brightness, large size */}
                <span style={{ color:'rgba(215,228,248,0.95)', fontSize:19, lineHeight:1.7, fontWeight:500 }}>{rule}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:36 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, letterSpacing:'0.06em', color:'var(--white)', marginBottom:28, textTransform:'uppercase' }}>
              📅 Tournament Timeline
            </div>
            {timeline.map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 0', borderBottom:i<timeline.length-1?'1px solid var(--border)':'none', opacity:item.active?1:0.65 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:item.active?'var(--neon)':'var(--gray3)', flexShrink:0, boxShadow:item.active?'0 0 12px rgba(0,212,255,0.8)':'none' }} />
                {/* Date label — visible */}
                <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:item.active?'var(--neon)':'rgba(180,200,230,0.75)', width:110, flexShrink:0, fontWeight:item.active?700:400 }}>{item.date}</div>
                {/* Event name — fully visible */}
                <div style={{ fontSize:17, color:item.active?'var(--white)':'rgba(210,222,245,0.90)', fontWeight:item.active?800:600 }}>{item.event}</div>
                {item.active && <span className="badge badge-neon" style={{ marginLeft:'auto' }}>NOW</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ padding:'0 32px 120px' }}>
        <div style={{
          maxWidth:1280, margin:'0 auto',
          background:'var(--surface)', border:'1px solid var(--border2)',
          borderRadius:20, padding:'84px 64px',
          position:'relative', overflow:'hidden', textAlign:'center',
        }}>
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'70%', height:2, background:'linear-gradient(90deg,transparent,var(--neon),transparent)' }} />
          <div style={{ position:'absolute', top:'-40%', left:'50%', transform:'translateX(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)', filter:'blur(30px)' }} />
          <div style={{ position:'relative' }}>
            <div className="section-label" style={{ marginBottom:20 }}>Limited Spots — One Per Country</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(40px,6vw,76px)', textTransform:'uppercase', color:'var(--white)', marginBottom:18, lineHeight:1 }}>
              Your country needs<br /><span className="text-gold-shimmer">its best trader.</span>
            </h2>
            <p style={{ fontSize:21, color:'rgba(215,228,248,0.93)', maxWidth:520, margin:'0 auto 44px', fontWeight:500 }}>
              {config.registrationOpen ? `Registration closes ${fmtDate(config.registrationDeadline,'long')}. Don't let someone else represent your flag.` : 'Registration is currently closed.'}
            </p>
            <Link href="/register" className="btn-gold" style={{ fontSize:18, padding:'20px 56px' }}>
              🏆 Register &amp; Claim Your Flag
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'40px 32px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'var(--neon)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(0,212,255,0.4)', fontSize:14 }}>🏆</div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, letterSpacing:'0.06em', color:'var(--white)' }}>HOLA PRIME WORLD CUP</span>
          </div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[['Leaderboard','/leaderboard'],['Traders','/traders'],['News','/news'],['Rules','/rules'],['Contact','/contact'],['Terms','/terms'],['Privacy','/privacy']].map(([label,href]) => (
              <Link key={href} href={href} style={{ fontSize:14, color:'rgba(180,200,230,0.7)', textDecoration:'none', transition:'color 0.2s', fontWeight:500 }}
                onMouseEnter={e => (e.target as HTMLElement).style.color='var(--white)'}
                onMouseLeave={e => (e.target as HTMLElement).style.color='rgba(180,200,230,0.7)'}
              >{label}</Link>
            ))}
          </div>
          <div style={{ fontSize:13, color:'rgba(180,200,230,0.55)' }}>© 2026 Hola Prime. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
