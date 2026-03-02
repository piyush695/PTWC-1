'use client'
// src/components/hero/HeroSection.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTournamentConfig, fmtMoney, fmtDate } from '@/lib/useTournamentConfig'



function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now())
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000)  / 60000),
      seconds: Math.floor((diff % 60000)    / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const iv = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(iv)
  }, [])
  return t
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const s = String(value).padStart(label === 'DAYS' ? 3 : 2, '0')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Digit display */}
      <div style={{
        display: 'flex', gap: 4,
      }}>
        {s.split('').map((digit, i) => (
          <div key={i} style={{
            width: label === 'DAYS' ? 52 : 56,
            height: label === 'DAYS' ? 64 : 72,
            background: 'rgba(8, 12, 24, 0.95)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: label === 'DAYS' ? 36 : 42,
            color: 'var(--white)',
            letterSpacing: 0,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            {/* mid-line separator */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,212,255,0.08)', transform: 'translateY(-50%)' }} />
            {digit}
          </div>
        ))}
      </div>
      {/* Label */}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--gray3)',
      }}>{label}</span>
    </div>
  )
}

export default function HeroSection() {
  const { config } = useTournamentConfig()
  const grandFinalDate = new Date(config.grandFinalDate + 'T10:00:00Z')
  const { days, hours, minutes, seconds } = useCountdown(grandFinalDate)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingTop: 100,
      background: 'var(--black)',
    }}>

      {/* ── Background layers ──────────────────────────────────── */}
      {/* Grid */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

      {/* Top center radial glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* Bottom gold glow */}
      <div style={{
        position: 'absolute', bottom: '-5%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(240,192,64,0.05) 0%, transparent 70%)',
        filter: 'blur(30px)', pointerEvents: 'none',
      }} />

      {/* Horizontal neon lines */}
      <div style={{ position: 'absolute', top: '42%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.06), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '58%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.04), transparent)', pointerEvents: 'none' }} />

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 1100,
        margin: '0 auto', padding: '60px 32px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        gap: 0,
      }}>

        {/* Stage label */}
        <div className="animate-fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: 100, padding: '8px 22px',
          marginBottom: 32,
        }}>
          <span className="live-dot" />
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase',
            color: 'var(--neon)',
          }}>
            THE WORLD STAGE · PROP TRADING
          </span>
        </div>

        {/* Main headline */}
        <div className="animate-fade-up delay-1" style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(16px, 2.2vw, 26px)',
            letterSpacing: '0.35em', textTransform: 'uppercase',
            color: 'var(--gray2)', marginBottom: 12,
          }}>
            HOLA PRIME PRESENTS
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(56px, 9vw, 120px)',
            lineHeight: 0.88, letterSpacing: '-0.02em',
            textTransform: 'uppercase', margin: 0,
          }}>
            <span style={{ color: 'var(--white)', display: 'block' }}>THE PROP TRADING</span>
            <span style={{ display: 'block' }}>
              <span className="text-gold-shimmer">WORLD CUP 2026</span>
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="animate-fade-up delay-2" style={{
          fontSize: 18, color: 'var(--gray2)', lineHeight: 1.65,
          maxWidth: 560, margin: '24px auto 48px',
        }}>
          Where the world's top prop traders compete for their country's flag —
          live on stage in <strong style={{ color: 'var(--white)' }}>Dubai, {fmtDate(config.grandFinalDate, 'long')}.</strong>
        </p>

        {/* ── TROPHY + PRIZE ─────────────────────────────────── */}
        <div className="animate-fade-up delay-2" style={{
          position: 'relative',
          marginBottom: 52,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Trophy glow behind */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 340, height: 340, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,192,64,0.1) 0%, transparent 70%)',
            filter: 'blur(20px)',
            animation: 'trophyAura 3s ease-in-out infinite',
          }} />

          {/* Outer decorative ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 260, height: 260, borderRadius: '50%',
            border: '1px dashed rgba(240,192,64,0.15)',
            animation: 'rotateSlow 30s linear infinite',
          }}>
            {/* Ring dots */}
            {[0,60,120,180,240,300].map(deg => (
              <div key={deg} style={{
                position: 'absolute',
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 8px rgba(240,192,64,0.8)',
                top: `calc(50% + ${Math.sin(deg*Math.PI/180)*126}px - 3px)`,
                left: `calc(50% + ${Math.cos(deg*Math.PI/180)*126}px - 3px)`,
              }} />
            ))}
          </div>

          {/* Inner neon ring */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 190, height: 190, borderRadius: '50%',
            border: '1px solid rgba(0,212,255,0.2)',
            boxShadow: '0 0 30px rgba(0,212,255,0.08)',
            animation: 'rotateSlow 20s linear reverse infinite',
          }} />

          {/* Trophy */}
          <div style={{
            position: 'relative',
            width: 140, height: 140,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 40% 35%, rgba(240,192,64,0.12), rgba(3,4,10,0.98))',
            borderRadius: '50%',
            border: '1px solid rgba(240,192,64,0.3)',
            boxShadow: '0 0 50px rgba(240,192,64,0.15), inset 0 0 30px rgba(240,192,64,0.05)',
            animation: 'trophyBob 4s ease-in-out infinite',
            zIndex: 2,
          }}>
            <span style={{
              fontSize: 72,
              filter: 'drop-shadow(0 0 20px rgba(240,192,64,0.9)) drop-shadow(0 0 40px rgba(240,192,64,0.5))',
              animation: 'trophyGlow 3s ease-in-out infinite',
              lineHeight: 1,
            }}>🏆</span>
          </div>

          {/* Prize pool pill — floating below trophy */}
          <div style={{
            marginTop: 24, zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'rgba(7,11,22,0.95)',
            border: '1px solid rgba(240,192,64,0.35)',
            borderRadius: 100,
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(240,192,64,0.12)',
          }}>
            <div style={{ padding: '10px 20px', background: 'rgba(240,192,64,0.08)' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--gold)',
              }}>TOURNAMENT PRIZE POOL</span>
            </div>
            <div style={{ padding: '10px 24px' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: 22, color: 'var(--white)',
                textShadow: '0 0 20px rgba(240,192,64,0.4)',
              }}>{fmtMoney(config.totalPrizePool)}</span>
            </div>
          </div>
        </div>

        {/* ── COUNTDOWN TIMER ────────────────────────────────── */}
        <div className="animate-fade-up delay-3" style={{ marginBottom: 48 }}>
          {/* "COMING SOON" label */}
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--gray3)', textAlign: 'center', marginBottom: 20,
          }}>
            GRAND FINAL IN
          </div>

          {/* Timer units */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'center' }}>
            {mounted ? (
              <>
                <CountdownUnit value={days}    label="DAYS"    />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'64px', marginTop:0 }}>:</div>
                <CountdownUnit value={hours}   label="HOURS"   />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'72px', animation: 'colonBlink 1s step-end infinite' }}>:</div>
                <CountdownUnit value={minutes} label="MINUTES" />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'72px', animation: 'colonBlink 1s step-end infinite' }}>:</div>
                <CountdownUnit value={seconds} label="SECONDS" />
              </>
            ) : (
              // SSR placeholder — prevents hydration mismatch
              <>
                <CountdownUnit value={0} label="DAYS"    />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'72px' }}>:</div>
                <CountdownUnit value={0} label="HOURS"   />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'72px' }}>:</div>
                <CountdownUnit value={0} label="MINUTES" />
                <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:900, color:'rgba(0,212,255,0.3)', lineHeight:'72px' }}>:</div>
                <CountdownUnit value={0} label="SECONDS" />
              </>
            )}
          </div>

          {/* Date label */}
          <div style={{
            marginTop: 16, textAlign: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--gray3)',
          }}>
            {new Date(config.grandFinalDate + 'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).toUpperCase()} · LIVE EVENT · DUBAI, UAE
          </div>
        </div>

        {/* ── CTA BUTTONS ────────────────────────────────────── */}
        <div className="animate-fade-up delay-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 }}>
          <Link href="/register" className="btn-gold" style={{ fontSize: 16, padding: '16px 44px' }}>
            Register Now
          </Link>
          <Link href="/leaderboard" className="btn-outline" style={{ fontSize: 16, padding: '16px 36px' }}>
            Live Leaderboard
          </Link>
        </div>

        {/* ── BOTTOM STATS BAR ───────────────────────────────── */}
        <div className="animate-fade-up delay-5" style={{
          width: '100%',
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          background: 'rgba(6,10,20,0.96)',
          border: '1px solid rgba(0,212,255,0.22)',
          borderRadius: 20, overflow: 'hidden',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.08), inset 0 0 60px rgba(0,0,0,0.3)',
        }}>
          {/* Top shimmer line */}
          <div style={{ gridColumn:'1/-1', height:2, background:'linear-gradient(90deg,transparent 0%,rgba(0,212,255,0.6) 20%,rgba(240,192,64,0.8) 50%,rgba(0,212,255,0.6) 80%,transparent 100%)' }} />
          {([
            { value:fmtMoney(config.totalPrizePool),   label:'Prize Pool',      icon:'💰', color:'#f0c040', glow:'rgba(240,192,64,0.12)',  topColor:'rgba(240,192,64,0.6)'  },
            { value:'32',      label:'Countries',       icon:'🌍', color:'#00d4ff', glow:'rgba(0,212,255,0.10)',   topColor:'rgba(0,212,255,0.5)'  },
            { value:'2,400+',  label:'Registered',      icon:'👥', color:'#00e676', glow:'rgba(0,230,118,0.10)',   topColor:'rgba(0,230,118,0.5)'  },
            { value:fmtMoney(config.qualifierAccountSize),    label:'Funded Account',  icon:'💳', color:'#00d4ff', glow:'rgba(0,212,255,0.10)',   topColor:'rgba(0,212,255,0.5)'  },
            { value:fmtDate(config.grandFinalDate,'monthday'),  label:'Grand Final',     icon:'📅', color:'#f0c040', glow:'rgba(240,192,64,0.12)',  topColor:'rgba(240,192,64,0.6)' },
          ] as Array<{value:string;label:string;icon:string;color:string;glow:string;topColor:string}>).map((s, i) => (
            <div key={s.label} style={{
              padding:'60px 24px 56px', textAlign:'center',
              borderRight: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              position:'relative', transition:'background 0.25s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = s.glow}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {/* Per-column top accent */}
              <div style={{ position:'absolute', top:2, left:'50%', transform:'translateX(-50%)', width:'70%', height:2, background:`linear-gradient(90deg,transparent,${s.topColor},transparent)`, borderRadius:2 }} />
              {/* Icon */}
              <div style={{ fontSize:64, marginBottom:20, lineHeight:1, filter:`drop-shadow(0 0 12px ${s.color}90) drop-shadow(0 0 24px ${s.color}40)` }}>{s.icon}</div>
              {/* Value */}
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'clamp(52px,5.5vw,80px)', color:s.color, lineHeight:1, textShadow:`0 0 32px ${s.color}60, 0 0 64px ${s.color}20` }}>{s.value}</div>
              {/* Label */}
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(220,232,255,0.88)', marginTop:18, lineHeight:1.3 }}>{s.label}</div>
              {/* Bottom glow line */}
              <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'60%', height:1, background:`linear-gradient(90deg,transparent,${s.color}70,transparent)` }} />
            </div>
          ))}
        </div>

      </div>

      {/* Bottom fade to next section */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(to bottom, transparent, var(--black))', pointerEvents:'none' }} />

      <style>{`
        @keyframes trophyAura {
          0%,100% { opacity:0.5; transform:translate(-50%,-50%) scale(1);    }
          50%      { opacity:1;   transform:translate(-50%,-50%) scale(1.12); }
        }
        @keyframes rotateSlow {
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes trophyBob {
          0%,100% { transform: translateY(0);   }
          50%      { transform: translateY(-10px); }
        }
        @keyframes trophyGlow {
          0%,100% { filter: drop-shadow(0 0 16px rgba(240,192,64,0.8)) drop-shadow(0 0 40px rgba(240,192,64,0.4)); }
          50%      { filter: drop-shadow(0 0 28px rgba(240,192,64,1.0)) drop-shadow(0 0 70px rgba(240,192,64,0.7)); }
        }
        @keyframes colonBlink {
          0%,49% { opacity:1; }
          50%,100% { opacity:0.15; }
        }
      `}</style>
    </section>
  )
}
