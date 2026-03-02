'use client'
export const dynamic = 'force-dynamic'
// src/app/dashboard/platform/page.tsx
// Trader platform selection — choose where to trade the tournament
import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import Link from 'next/link'

// ─── Platform visual config (no secrets) ──────────────────────────────────
const PLATFORM_VISUAL: Record<string, {
  color: string; glow: string; bg: string; border: string
  logo: string; tagline: string; badge: string
}> = {
  MT5:         { color: '#00d4ff', glow: 'rgba(0,212,255,0.18)',  bg: 'rgba(0,212,255,0.05)',  border: 'rgba(0,212,255,0.25)', logo: '🔵', tagline: 'Industry Standard', badge: 'Most Popular' },
  MT4:         { color: '#00aaff', glow: 'rgba(0,170,255,0.16)',  bg: 'rgba(0,170,255,0.05)',  border: 'rgba(0,170,255,0.22)', logo: '🔷', tagline: 'Classic Platform',  badge: 'Proven & Stable' },
  CTRADER:     { color: '#7c4dff', glow: 'rgba(124,77,255,0.18)', bg: 'rgba(124,77,255,0.06)', border: 'rgba(124,77,255,0.28)', logo: '🟣', tagline: 'Advanced Execution', badge: 'Pro Choice' },
  DXTRADE:     { color: '#ff6d2e', glow: 'rgba(255,109,46,0.16)', bg: 'rgba(255,109,46,0.05)', border: 'rgba(255,109,46,0.25)', logo: '🟠', tagline: 'Modern Web Platform', badge: 'Web Native' },
  TRADOVATE:   { color: '#00e676', glow: 'rgba(0,230,118,0.16)',  bg: 'rgba(0,230,118,0.05)',  border: 'rgba(0,230,118,0.25)', logo: '🟢', tagline: 'Cloud-Native Futures', badge: 'Low Latency' },
  NINJATRADER: { color: '#f0c040', glow: 'rgba(240,192,64,0.16)', bg: 'rgba(240,192,64,0.05)', border: 'rgba(240,192,64,0.25)', logo: '🟡', tagline: 'Futures & Forex Pro',  badge: 'Advanced Charts' },
  MATCHTRADER: { color: '#ff4081', glow: 'rgba(255,64,129,0.16)', bg: 'rgba(255,64,129,0.05)', border: 'rgba(255,64,129,0.25)', logo: '🔴', tagline: 'Next-Gen Trading',     badge: 'Mobile First' },
  TRADELOCKER: { color: '#00bcd4', glow: 'rgba(0,188,212,0.16)',  bg: 'rgba(0,188,212,0.05)',  border: 'rgba(0,188,212,0.25)', logo: '🩵', tagline: 'Modern Web & Mobile',  badge: 'New Platform' },
  CUSTOM:      { color: '#8898b8', glow: 'rgba(136,152,184,0.14)', bg: 'rgba(136,152,184,0.05)', border: 'rgba(136,152,184,0.22)', logo: '⚙️', tagline: 'Custom Integration',  badge: 'Specialist' },
}

interface Platform {
  id: string; name: string; type: string; brokerName: string
  description: string; serverName: string; websiteUrl: string
  supportEmail: string; defaultLeverage: number; defaultBalance: number
  currency: string; connectionStatus: string; allowedPhases: string[]
  supportedPairs: string[]
}

// ─── Platform feature highlights per type ─────────────────────────────────
const TYPE_FEATURES: Record<string, string[]> = {
  MT5:         ['Multi-asset trading', 'Built-in algo trading (EA)', 'Advanced charting tools', 'One-click execution', 'Mobile & desktop apps'],
  MT4:         ['Battle-tested reliability', 'Expert Advisors (EA)', 'Wide broker support', 'Fast execution', 'Simple clean interface'],
  CTRADER:     ['Level II depth of market', 'cBots automation', 'Spotware-regulated', 'Fast ECN execution', 'Excellent mobile app'],
  DXTRADE:     ['Browser-based no install', 'Risk management tools', 'Real-time P&L tracking', 'WebSocket streaming', 'Customisable workspace'],
  TRADOVATE:   ['Cloud-based platform', 'Commission-free futures', 'Real-time analytics', 'DOM ladder trading', 'Strategy automation'],
  NINJATRADER: ['Professional charting', 'Strategy backtesting', 'Order flow analysis', 'Simulator included', 'Huge community'],
  MATCHTRADER: ['PWA — no install needed', 'One-click trading', 'Real-time streaming', 'Risk controls built-in', 'Multi-device sync'],
  TRADELOCKER: ['Modern clean UI', 'TradingView charts built-in', 'Fast web & mobile', 'Copy trading support', 'API access'],
  CUSTOM:      ['Custom broker setup', 'Specialist instruments', 'Dedicated support', 'Flexible configuration'],
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PlatformPage() {
  const [platforms, setPlatforms]       = useState<Platform[]>([])
  const [currentId, setCurrentId]       = useState<string | null>(null)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [confirmedId, setConfirmedId]   = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState<{ok: boolean; text: string} | null>(null)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [trader, setTrader]             = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/platforms')
      const d = await r.json()
      setPlatforms(d.platforms || [])
      setCurrentId(d.currentPlatformId)
      setSelectedId(d.currentPlatformId)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/auth/trader-me').then(r=>r.json()).then(d=>{
      if(d.user) setTrader(d.user.trader||d.user)
    }).catch(()=>{})
  }, [])

  useEffect(() => { load() }, [load])

  const handleSelect = async (platformId: string, confirm = false) => {
    setSaving(true); setSaveMsg(null); setConfirmModal(false)
    try {
      const r = await fetch('/api/platforms/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, confirm }),
      })
      const d = await r.json()
      if (!r.ok) {
        setSaveMsg({ ok: false, text: d.error || 'Failed to save selection' })
      } else {
        setSaveMsg({ ok: true, text: confirm ? '✓ Platform confirmed! Your trading account will be provisioned shortly.' : '✓ Platform saved. Confirm when ready to lock in your choice.' })
        setCurrentId(platformId)
        setSelectedId(platformId)
        if (confirm) setConfirmedId(platformId)
      }
    } catch (e: any) {
      setSaveMsg({ ok: false, text: 'Network error — please try again.' })
    }
    setSaving(false)
  }

  const visual = (type: string) => PLATFORM_VISUAL[type] || PLATFORM_VISUAL.CUSTOM
  const features = (type: string) => TYPE_FEATURES[type] || TYPE_FEATURES.CUSTOM

  const selectedPlatform  = platforms.find(p => p.id === selectedId)
  const confirmedPlatform = platforms.find(p => p.id === confirmedId) || platforms.find(p => p.id === currentId)

  // ─── Confirm modal ────────────────────────────────────────────────────
  const ConfirmModal = () => {
    if (!confirmModal || !selectedPlatform) return null
    const v = visual(selectedPlatform.type)
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,4,10,0.88)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={e => { if (e.target === e.currentTarget) setConfirmModal(false) }}
      >
        <div style={{ background: 'var(--deep)', border: `1px solid ${v.border}`, borderRadius: 20, padding: 40, maxWidth: 480, width: '100%', position: 'relative', overflow: 'hidden', boxShadow: `0 0 80px ${v.glow}, 0 0 160px rgba(0,0,0,0.8)` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${v.color},transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: v.bg, border: `1px solid ${v.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{v.logo}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--white)', textTransform: 'uppercase' }}>{selectedPlatform.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', color: v.color, textTransform: 'uppercase', marginTop: 2 }}>{selectedPlatform.type}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>⚠ This action is final</div>
            <div style={{ fontSize: 14, color: 'rgba(220,230,248,0.85)', lineHeight: 1.7 }}>
              Once confirmed, your platform selection is <strong style={{ color: 'var(--white)' }}>locked</strong> when trading begins. You can save now without confirming, and confirm later before the Qualifier starts.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Server', value: selectedPlatform.serverName || '—' },
              { label: 'Leverage', value: `1:${selectedPlatform.defaultLeverage}` },
              { label: 'Balance', value: `$${Number(selectedPlatform.defaultBalance).toLocaleString()}` },
              { label: 'Currency', value: selectedPlatform.currency || 'USD' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--gray1)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => handleSelect(selectedPlatform.id, true)} disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: 10, border: 'none', background: v.color, color: '#03040a', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 20px ${v.glow}`, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Confirming...' : '✓ Confirm Platform'}
            </button>
            <button onClick={() => handleSelect(selectedPlatform.id, false)} disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: 10, border: `1px solid ${v.border}`, background: v.bg, color: v.color, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              Save for Now
            </button>
          </div>
          <button onClick={() => setConfirmModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--gray3)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout trader={trader||{}}>
      <ConfirmModal />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 8 }}>Setup</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--white)', lineHeight: 1, margin: '0 0 10px' }}>Choose Your Trading Platform</h1>
            <p style={{ fontSize: 16, color: 'rgba(180,200,235,0.82)', maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
              Select the platform you'll use to trade the World Cup. Your $10,000 funded account will be provisioned on this platform. Once the Qualifier starts, your choice is locked.
            </p>
          </div>
          {currentId && (
            <div style={{ background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: 12, padding: '14px 20px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>Current Selection</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--white)' }}>
                {platforms.find(p => p.id === currentId)?.name || '—'}
              </div>
              {confirmedId && (
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginTop: 4 }}>✓ Confirmed</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 32 }}>
        {[
          { icon: '💰', label: 'Funded Account', value: '$10,000 provided for every round' },
          { icon: '🔒', label: 'Lock-In',        value: 'Selection locked when Qualifier starts' },
          { icon: '⚡', label: 'Provisioning',   value: 'Account ready within 24 hours of confirmation' },
          { icon: '🛟', label: 'Support',         value: 'Platform support available via your broker' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'rgba(180,200,235,0.8)', lineHeight: 1.5 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div style={{ background: saveMsg.ok ? 'rgba(0,230,118,0.07)' : 'rgba(255,56,96,0.07)', border: `1px solid ${saveMsg.ok ? 'rgba(0,230,118,0.25)' : 'rgba(255,56,96,0.25)'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>{saveMsg.ok ? '✅' : '❌'}</span>
          <span style={{ fontSize: 15, color: saveMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{saveMsg.text}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: 44, height: 44, border: '3px solid var(--border)', borderTop: '3px solid var(--neon)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gray3)' }}>Loading available platforms...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* No platforms */}
      {!loading && platforms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔧</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--white)', textTransform: 'uppercase', marginBottom: 12 }}>Platforms Coming Soon</div>
          <p style={{ fontSize: 15, color: 'rgba(180,200,235,0.8)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.7 }}>
            The admin team is finalising the trading platform integrations. You'll be notified as soon as platforms are available to choose from.
          </p>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.3)', color: 'var(--neon)', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      )}

      {/* ── Platform cards ────────────────────────────────────────────────── */}
      {!loading && platforms.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {platforms.map(p => {
            const v        = visual(p.type)
            const feats    = features(p.type)
            const isSelected  = selectedId === p.id
            const isConfirmed = confirmedId === p.id
            const isExpanded  = expandedId === p.id
            const isOnline    = p.connectionStatus === 'CONNECTED'

            return (
              <div key={p.id}
                style={{
                  background: isSelected ? v.bg : 'var(--surface)',
                  border: `1px solid ${isSelected ? v.color : isExpanded ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 0 40px ${v.glow}` : isExpanded ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                {/* Top accent line when selected */}
                {isSelected && (
                  <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${v.color},transparent)` }} />
                )}

                {/* ── CARD MAIN ROW ──────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px' }}>

                  {/* Platform logo */}
                  <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${v.color}20, ${v.color}08)`, border: `1px solid ${v.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, boxShadow: isSelected ? `0 0 20px ${v.glow}` : 'none' }}>
                    {v.logo}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{p.name}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 5, background: `${v.color}15`, color: v.color, border: `1px solid ${v.color}30` }}>{p.type}</span>
                      {v.badge && (
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 5, background: 'rgba(240,192,64,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,192,64,0.25)' }}>{v.badge}</span>
                      )}
                      {isConfirmed && (
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 5, background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)' }}>✓ Confirmed</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(180,200,235,0.7)' }}>{v.tagline}</span>
                      {p.brokerName && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>by {p.brokerName}</span>}
                      {p.serverName && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>· {p.serverName}</span>}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {[
                      { label: 'Balance', value: `$${Number(p.defaultBalance).toLocaleString()}` },
                      { label: 'Leverage', value: `1:${p.defaultLeverage}` },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--deep)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--gray1)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Connection status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--red)', boxShadow: isOnline ? '0 0 8px var(--green)' : 'none', animation: isOnline ? 'livePulse 2s infinite' : 'none' }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: isOnline ? 'var(--green)' : 'var(--red)' }}>{isOnline ? 'Online' : 'Offline'}</span>
                  </div>

                  {/* Select button */}
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedId(p.id); setSaveMsg(null); setExpandedId(p.id) }}
                    style={{
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '10px 22px', borderRadius: 9, border: `1px solid ${isSelected ? v.color : 'var(--border2)'}`,
                      background: isSelected ? v.color : 'transparent',
                      color: isSelected ? '#03040a' : 'var(--gray2)',
                      cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s',
                      boxShadow: isSelected ? `0 0 18px ${v.glow}` : 'none',
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>

                  {/* Expand arrow */}
                  <span style={{ color: 'var(--gray3)', fontSize: 14, flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
                </div>

                {/* ── EXPANDED DETAILS PANEL ─────────────────────────────── */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${isSelected ? v.border : 'var(--border)'}`, padding: '24px', background: isSelected ? 'rgba(0,0,0,0.15)' : 'var(--deep)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

                      {/* Description & features */}
                      <div style={{ gridColumn: '1/3' }}>
                        {p.description && (
                          <p style={{ fontSize: 15, color: 'rgba(200,218,248,0.85)', lineHeight: 1.75, marginBottom: 20 }}>{p.description}</p>
                        )}
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: v.color, marginBottom: 12 }}>Platform Features</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {feats.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, flexShrink: 0, boxShadow: `0 0 6px ${v.color}80` }} />
                              <span style={{ fontSize: 14, color: 'rgba(200,218,248,0.88)', lineHeight: 1.5 }}>{f}</span>
                            </div>
                          ))}
                        </div>

                        {/* Allowed phases */}
                        {p.allowedPhases?.length > 0 && (
                          <div style={{ marginTop: 20 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 8 }}>Tournament Phases</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {p.allowedPhases.map(ph => (
                                <span key={ph} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4, background: 'rgba(0,212,255,0.08)', color: 'var(--neon)', border: '1px solid rgba(0,212,255,0.2)' }}>
                                  {ph.replace(/_/g,' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right column: account details + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Account details card */}
                        <div style={{ background: 'var(--surface)', border: `1px solid ${isSelected ? v.border : 'var(--border)'}`, borderRadius: 12, padding: 18 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: v.color, marginBottom: 14 }}>Account Details</div>
                          {[
                            { k: 'Server',   v: p.serverName || '—' },
                            { k: 'Balance',  v: `$${Number(p.defaultBalance).toLocaleString()} ${p.currency}` },
                            { k: 'Leverage', v: `1:${p.defaultLeverage}` },
                            { k: 'Currency', v: p.currency || 'USD' },
                            { k: 'Broker',   v: p.brokerName || '—' },
                          ].map(row => (
                            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray3)' }}>{row.k}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--gray1)' }}>{row.v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Support links */}
                        {(p.websiteUrl || p.supportEmail) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {p.websiteUrl && (
                              <a href={p.websiteUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: `1px solid ${v.border}`, background: v.bg, color: v.color, textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'opacity 0.15s' }}>
                                <span>↗</span> Platform Website
                              </a>
                            )}
                            {p.supportEmail && (
                              <a href={`mailto:${p.supportEmail}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--gray2)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                <span>✉</span> {p.supportEmail}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Confirm button */}
                        {isSelected && !isConfirmed && (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmModal(true) }}
                            style={{ padding: '14px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${v.color}, ${v.color}bb)`, color: '#03040a', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 0 24px ${v.glow}`, transition: 'all 0.15s' }}
                          >
                            ✓ Confirm This Platform
                          </button>
                        )}
                        {isConfirmed && (
                          <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✓ Platform Confirmed</div>
                            <div style={{ fontSize: 12, color: 'rgba(0,230,118,0.7)', marginTop: 4 }}>Your account will be provisioned shortly</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom action bar */}
      {!loading && platforms.length > 0 && selectedId && selectedId !== currentId && (
        <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: 'rgba(3,4,10,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', padding: '16px 24px', marginTop: 32, marginLeft: -28, marginRight: -28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', zIndex: 50 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--white)', textTransform: 'uppercase' }}>
              {platforms.find(p => p.id === selectedId)?.name} selected
            </div>
            <div style={{ fontSize: 13, color: 'rgba(180,200,235,0.7)', marginTop: 2 }}>Save your selection or confirm to lock it in</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => handleSelect(selectedId, false)} disabled={saving} style={{ padding: '12px 24px', borderRadius: 9, border: '1px solid rgba(0,212,255,0.35)', background: 'rgba(0,212,255,0.08)', color: 'var(--neon)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              Save Selection
            </button>
            <button onClick={() => setConfirmModal(true)} disabled={saving} style={{ padding: '12px 28px', borderRadius: 9, border: 'none', background: 'var(--neon)', color: 'var(--black)', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,212,255,0.4)', opacity: saving ? 0.6 : 1 }}>
              Confirm Platform →
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
