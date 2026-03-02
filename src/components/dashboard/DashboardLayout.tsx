'use client'
// src/components/dashboard/DashboardLayout.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',              label: 'Overview',       icon: '◈' },
  { href: '/dashboard/account',      label: 'Trading Account',icon: '◉' },
  { href: '/dashboard/platform',     label: 'Trading Platform', icon: '⚡' },
  { href: '/dashboard/trades',       label: 'Trade History',  icon: '◇' },
  { href: '/dashboard/bracket',      label: 'My Bracket',     icon: '◈' },
  { href: '/dashboard/leaderboard',  label: 'Leaderboard',    icon: '◎' },
  { href: '/dashboard/kyc',          label: 'KYC / Verify',   icon: '◉' },
  { href: '/dashboard/notifications',label: 'Notifications',  icon: '◇', badge: 3 },
  { href: '/dashboard/settings',     label: 'Settings',       icon: '◎' },
]

// flagcdn real image
const flagUrl = (code: string) => `https://flagcdn.com/w40/${(code||'').toLowerCase()}.png`

export default function DashboardLayout({
  children,
  trader,
}: {
  children: React.ReactNode
  trader: {
    displayName: string
    country: string
    countryCode: string
    status: string
    kycStatus: string
    rank: number | null
    returnPct: number
  }
}) {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? path === '/dashboard' : path.startsWith(href)

  const statusColor: Record<string, string> = {
    ACTIVE: 'var(--green)', KYC_PENDING: 'var(--gold)',
    KYC_APPROVED: 'var(--neon)', DISQUALIFIED: 'var(--red)',
    REGISTERED: 'var(--gray2)',
  }
  const statusLabel: Record<string, string> = {
    ACTIVE: 'Active', KYC_PENDING: 'KYC Pending',
    KYC_APPROVED: 'KYC Approved', DISQUALIFIED: 'Disqualified',
    REGISTERED: 'Registered',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--black)', fontFamily: 'var(--font-body)' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'var(--deep)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(0,212,255,0.5)', fontSize: 16 }}>🏆</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', color: 'var(--white)', lineHeight: 1 }}>HOLA PRIME</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.2em', color: 'var(--neon)', lineHeight: 1, marginTop: 2 }}>WORLD CUP 2026</div>
            </div>
          </Link>
        </div>

        {/* Trader profile card */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,212,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {/* Avatar with flag */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {(trader?.displayName || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 13, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.3)' }}>
                <img src={flagUrl(trader.countryCode)} alt={trader.country} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {trader.displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray3)', marginTop: 1 }}>{trader.country}</div>
            </div>
          </div>
          {/* Status + rank row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4,
              color: statusColor[trader.status] || 'var(--gray2)',
              background: `${(statusColor[trader.status] || '#888')}15`,
              border: `1px solid ${(statusColor[trader.status] || '#888')}30`,
            }}>{statusLabel[trader.status] || trader.status}</span>
            {trader.rank && (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: 'var(--gold)', marginLeft: 'auto' }}>
                #{trader.rank} RANKED
              </span>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', textDecoration: 'none',
                background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                borderRight: active ? '2px solid var(--neon)' : '2px solid transparent',
                color: active ? 'var(--neon)' : 'var(--gray2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.5, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: active ? 800 : 600, fontSize: 13, letterSpacing: '0.04em', flex: 1 }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span style={{ background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 9, borderRadius: 100, padding: '2px 6px', lineHeight: 1 }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
          <Link href="/leaderboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', textDecoration: 'none', color: 'var(--gray3)', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--white)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--gray3)'}
          >
            <span style={{ fontSize: 13 }}>↗</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}>PUBLIC LEADERBOARD</span>
          </Link>
          <Link href="/api/auth/signout" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', textDecoration: 'none', color: 'var(--gray3)', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--gray3)'}
          >
            <span style={{ fontSize: 13 }}>⏻</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}>SIGN OUT</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar */}
        <header style={{
          height: 64, borderBottom: '1px solid var(--border)',
          background: 'rgba(7,11,22,0.9)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', position: 'sticky', top: 0, zIndex: 40,
        }}>
          {/* Page title */}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gray3)' }}>
            Trader Portal
            <span style={{ color: 'var(--gray3)', margin: '0 8px' }}>›</span>
            <span style={{ color: 'var(--neon)' }}>
              {NAV.find(n => isActive(n.href))?.label || 'Overview'}
            </span>
          </div>
          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Phase indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 8, padding: '6px 14px' }}>
              <span className="live-dot" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neon)' }}>
                Registration Phase
              </span>
            </div>
            {/* Return quick-stat */}
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: (trader?.returnPct ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {(trader?.returnPct ?? 0) >= 0 ? '+' : ''}{(trader?.returnPct ?? 0).toFixed(2)}%
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '32px 28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
