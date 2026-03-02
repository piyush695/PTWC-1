'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const TICKER_ITEMS = [
  { label: '🔴 LIVE',   text: 'Qualifier Phase Active — Standings update every 30s' },
  { label: '🏆 $100K',  text: 'Total prize pool on the line for the Grand Final' },
  { label: '📅 Jul 18', text: 'Grand Final LIVE on stage in Dubai, UAE' },
  { label: '⚡ 2,400+', text: 'Traders from 32 countries competing for their flag' },
  { label: '⏳ KYC',    text: 'Complete verification to activate your trading account' },
]

const LINKS = [
  { href: '/leaderboard', label: 'Leaderboard', icon: '◈' },
  { href: '/bracket',     label: 'Bracket',     icon: '◎' },
  { href: '/traders',     label: 'Traders',     icon: '◉' },
  { href: '/news',        label: 'News',        icon: '◇' },
  { href: '/rules',       label: 'Rules',       icon: '▣' },
]

export default function Navbar() {
  const [open, setOpen]           = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [tickerIdx, setTickerIdx] = useState(0)
  const [tickerVis, setTickerVis] = useState(true)
  const path = usePathname()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => {
      setTickerVis(false)
      setTimeout(() => { setTickerIdx(i => (i + 1) % TICKER_ITEMS.length); setTickerVis(true) }, 300)
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  const isActive = (href: string) => path === href
  const ticker = TICKER_ITEMS[tickerIdx]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(3,4,10,0.99)' : 'rgba(3,4,10,0.93)',
        backdropFilter: 'blur(32px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,212,255,0.25)' : 'rgba(0,212,255,0.14)'}`,
        transition: 'all 0.3s ease',
        boxShadow: scrolled
          ? '0 8px 48px rgba(0,0,0,0.8), 0 1px 0 rgba(0,212,255,0.12)'
          : '0 2px 24px rgba(0,0,0,0.5)',
      }}>

        {/* ── TOP ACCENT LINE: neon-gold-neon gradient ─────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #00d4ff 20%, #f0c040 50%, #00d4ff 80%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Soft bloom from the accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '70%', height: 16,
          background: 'radial-gradient(ellipse at center top, rgba(0,212,255,0.28) 0%, rgba(240,192,64,0.12) 40%, transparent 70%)',
          filter: 'blur(8px)', pointerEvents: 'none',
        }} />

        {/* ── TICKER STRIP ─────────────────────────────────────────────── */}
        <div style={{
          height: 34,
          borderBottom: '1px solid rgba(0,212,255,0.1)',
          background: 'linear-gradient(90deg, rgba(0,212,255,0.05) 0%, rgba(0,0,0,0) 50%, rgba(240,192,64,0.04) 100%)',
          display: 'flex', alignItems: 'center',
          padding: '0 32px', gap: 0, overflow: 'hidden',
        }}>
          {/* Scrolling flags */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginRight: 20, overflow: 'hidden', width: 120, alignItems: 'center' }}>
            {['🇦🇪','🇳🇬','🇮🇳','🇬🇧','🇿🇦','🇲🇾','🇵🇰','🇰🇪','🇸🇬','🇧🇷'].map((flag, i) => (
              <span key={i} style={{ fontSize: 14, lineHeight: 1, opacity: 0.75, flexShrink: 0, animation: `flagScroll 20s ${i * -2}s linear infinite` }}>{flag}</span>
            ))}
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(0,212,255,0.25)', marginRight: 20, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, opacity: tickerVis ? 1 : 0, transition: 'opacity 0.3s ease' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: 4, padding: '2px 8px', color: 'var(--neon)',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>{ticker.label}</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
              letterSpacing: '0.04em', color: 'rgba(210,222,245,0.85)',
              whiteSpace: 'nowrap',
            }}>{ticker.text}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 20 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,192,64,0.85)' }}>
              Grand Final · Dubai · Jul 18, 2026
            </span>
          </div>
        </div>

        {/* ── MAIN NAV ROW ─────────────────────────────────────────────── */}
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 28px', height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* ── Logo ───────────────────────────────────────────────────── */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 11,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(240,192,64,0.18))',
              border: '1px solid rgba(0,212,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
              boxShadow: '0 0 28px rgba(0,212,255,0.32), 0 0 60px rgba(0,212,255,0.1), inset 0 1px 0 rgba(255,255,255,0.12)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
              🏆
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, letterSpacing: '0.07em', color: '#fff', lineHeight: 1 }}>HOLA PRIME</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.28em', color: 'var(--neon)', marginTop: 3, lineHeight: 1 }}>WORLD CUP 2026</div>
            </div>
          </Link>

          {/* ── Vertical divider ───────────────────────────────────────── */}
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.2), transparent)', flexShrink: 0 }} />

          {/* ── Desktop nav ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
            {LINKS.map((link, i) => {
              const active = isActive(link.href)
              return (
                <div key={link.href} style={{ display: 'flex', alignItems: 'center' }}>
                  <Link
                    href={link.href}
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '0 20px', height: 44,
                      textDecoration: 'none',
                      fontFamily: 'var(--font-display)', fontWeight: 800,
                      fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: active ? '#fff' : 'rgba(200,215,240,0.7)',
                      borderRadius: 10,
                      background: active
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.18) 0%, rgba(0,153,187,0.12) 100%)'
                        : 'transparent',
                      border: active
                        ? '1px solid rgba(0,212,255,0.4)'
                        : '1px solid transparent',
                      boxShadow: active
                        ? '0 0 24px rgba(0,212,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : 'none',
                      transition: 'all 0.18s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = '#fff'
                        el.style.background = 'rgba(0,212,255,0.08)'
                        el.style.border = '1px solid rgba(0,212,255,0.2)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = 'rgba(200,215,240,0.7)'
                        el.style.background = 'transparent'
                        el.style.border = '1px solid transparent'
                      }
                    }}
                  >
                    {/* Icon — visible on all links */}
                    <span style={{ fontSize: 9, opacity: active ? 1 : 0.55, color: active ? 'var(--neon)' : 'inherit', transition: 'opacity 0.15s' }}>{link.icon}</span>
                    {link.label}

                    {/* Active bottom glow line */}
                    {active && (
                      <span style={{
                        position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)',
                        width: '60%', height: 2, borderRadius: 1,
                        background: 'linear-gradient(90deg, transparent, var(--neon), transparent)',
                        boxShadow: '0 0 8px rgba(0,212,255,0.8)',
                      }} />
                    )}
                  </Link>

                  {/* Subtle separator dot between items */}
                  {i < LINKS.length - 1 && (
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,212,255,0.15)', margin: '0 2px', flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Vertical divider ───────────────────────────────────────── */}
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.2), transparent)', flexShrink: 0 }} />

          {/* ── Right CTAs ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Live badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(0,230,118,0.08)',
              border: '1px solid rgba(0,230,118,0.28)',
              borderRadius: 20, padding: '7px 14px',
            }}>
              <span className="live-dot" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green)' }}>Live</span>
            </div>

            {/* Sign In */}
            <Link href="/login" style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(200,215,240,0.75)', textDecoration: 'none',
              padding: '10px 20px', borderRadius: 8,
              border: '1px solid rgba(200,215,240,0.15)',
              background: 'rgba(255,255,255,0.04)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = '#fff'
                el.style.borderColor = 'rgba(0,212,255,0.45)'
                el.style.background = 'rgba(0,212,255,0.09)'
                el.style.boxShadow = '0 0 14px rgba(0,212,255,0.15)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.color = 'rgba(200,215,240,0.75)'
                el.style.borderColor = 'rgba(200,215,240,0.15)'
                el.style.background = 'rgba(255,255,255,0.04)'
                el.style.boxShadow = 'none'
              }}
            >Sign In</Link>

            {/* Register CTA */}
            <Link href="/register" style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '10px 26px', borderRadius: 8,
              background: 'linear-gradient(135deg, #f0c040 0%, #c88c20 100%)',
              color: '#03040a', textDecoration: 'none',
              boxShadow: '0 0 22px rgba(240,192,64,0.42), inset 0 1px 0 rgba(255,255,255,0.28)',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(240,192,64,0.65)',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-1px)'
                el.style.boxShadow = '0 4px 32px rgba(240,192,64,0.65), inset 0 1px 0 rgba(255,255,255,0.28)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = '0 0 22px rgba(240,192,64,0.42), inset 0 1px 0 rgba(255,255,255,0.28)'
              }}
            >
              🏆 Register
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                display: 'none',
                background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 7, padding: '8px 10px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.65)', fontSize: 16,
              }}
              aria-label="Menu"
            >☰</button>
          </div>
        </div>

        {/* ── Bottom glow line when scrolled ───────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: scrolled
            ? 'linear-gradient(90deg, transparent, rgba(0,212,255,0.25), rgba(240,192,64,0.18), rgba(0,212,255,0.25), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,212,255,0.06), transparent)',
          transition: 'all 0.3s',
          pointerEvents: 'none',
        }} />

        {/* ── Mobile dropdown ──────────────────────────────────────────── */}
        {open && (
          <div style={{ borderTop: '1px solid rgba(0,212,255,0.15)', background: 'rgba(4,7,18,0.99)', padding: '16px 28px 28px' }}>
            {LINKS.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '15px 0',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: isActive(link.href) ? 'var(--neon)' : 'rgba(210,222,245,0.85)',
                textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: 11, color: isActive(link.href) ? 'var(--neon)' : 'var(--gray3)' }}>{link.icon}</span>
                {link.label}
                {isActive(link.href) && <span style={{ marginLeft: 'auto' }} className="badge badge-neon">Active</span>}
              </Link>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Link href="/login" onClick={() => setOpen(false)} style={{ flex: 1, padding: '13px', fontSize: 14, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,212,255,0.35)', color: 'var(--neon)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sign In</Link>
              <Link href="/register" onClick={() => setOpen(false)} style={{ flex: 1, padding: '13px', fontSize: 14, textAlign: 'center', borderRadius: 8, background: 'linear-gradient(135deg,#f0c040,#c88c20)', color: '#03040a', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Register</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Spacer ── */}
      <div style={{ height: 106 }} />

      <style>{`
        @keyframes flagScroll {
          0%   { transform: translateX(0); opacity: 0.75; }
          50%  { opacity: 0.4; }
          100% { transform: translateX(-300px); opacity: 0.75; }
        }
      `}</style>
    </>
  )
}
