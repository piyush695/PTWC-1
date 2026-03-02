'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/platforms/page.tsx
// Trading Platform Integration Manager
// Supports: MT4, MT5, cTrader, DxTrade, Tradovate, NinjaTrader, MatchTrader, TradeLocker
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

// ─── Platform metadata ─────────────────────────────────────────────────────
const PLATFORM_META: Record<string, {
  label: string; color: string; bg: string; border: string
  fields: string[]; logo: string; desc: string; docUrl: string
}> = {
  MT5: {
    label: 'MetaTrader 5', color: '#00d4ff', bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.25)',
    logo: '🔵', desc: 'Industry-standard platform. Requires MT5 Manager API (WebAPI or MT5 Bridge).',
    docUrl: 'https://www.mql5.com/en/docs/integration',
    fields: ['serverHost', 'serverPort', 'serverName', 'managerLogin', 'managerPassword', 'restApiUrl'],
  },
  MT4: {
    label: 'MetaTrader 4', color: '#00aaff', bg: 'rgba(0,170,255,0.06)', border: 'rgba(0,170,255,0.25)',
    logo: '🔷', desc: 'Classic MetaTrader. Requires MT4 Manager API or bridge.',
    docUrl: 'https://www.mql5.com/en/docs/integration',
    fields: ['serverHost', 'serverPort', 'serverName', 'managerLogin', 'managerPassword'],
  },
  CTRADER: {
    label: 'cTrader', color: '#7c4dff', bg: 'rgba(124,77,255,0.07)', border: 'rgba(124,77,255,0.3)',
    logo: '🟣', desc: 'Spotware cTrader Open API. OAuth 2.0 based. Requires cBroker account.',
    docUrl: 'https://help.ctrader.com/open-api/',
    fields: ['serverHost', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl'],
  },
  DXTRADE: {
    label: 'DXtrade', color: '#ff6d2e', bg: 'rgba(255,109,46,0.07)', border: 'rgba(255,109,46,0.28)',
    logo: '🟠', desc: 'Devexperts DXtrade CFD platform. REST + WebSocket API.',
    docUrl: 'https://dx.trade/apis/',
    fields: ['serverHost', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl', 'websocketUrl'],
  },
  TRADOVATE: {
    label: 'Tradovate', color: '#00e676', bg: 'rgba(0,230,118,0.06)', border: 'rgba(0,230,118,0.25)',
    logo: '🟢', desc: 'Cloud-native futures platform. REST + WebSocket API with OAuth.',
    docUrl: 'https://api.tradovate.com/',
    fields: ['serverHost', 'serverName', 'apiKey', 'apiSecret', 'apiPassphrase', 'restApiUrl', 'websocketUrl'],
  },
  NINJATRADER: {
    label: 'NinjaTrader', color: '#f0c040', bg: 'rgba(240,192,64,0.06)', border: 'rgba(240,192,64,0.25)',
    logo: '🟡', desc: 'Futures & forex platform. Requires NinjaTrader Developer API.',
    docUrl: 'https://developer.ninjatrader.com/products/api',
    fields: ['serverHost', 'serverPort', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl'],
  },
  MATCHTRADER: {
    label: 'MatchTrader', color: '#ff4081', bg: 'rgba(255,64,129,0.07)', border: 'rgba(255,64,129,0.28)',
    logo: '🔴', desc: 'MatchTrader white-label platform. REST + gRPC API with JWT authentication.',
    docUrl: 'https://match-trader.com/technology/brokers-api/',
    fields: ['serverHost', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl', 'websocketUrl'],
  },
  TRADELOCKER: {
    label: 'TradeLocker', color: '#00bcd4', bg: 'rgba(0,188,212,0.07)', border: 'rgba(0,188,212,0.28)',
    logo: '🔵', desc: 'Next-gen web/mobile trading platform. REST + WebSocket API.',
    docUrl: 'https://public-api.tradelocker.com/',
    fields: ['serverHost', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl', 'websocketUrl'],
  },
  CUSTOM: {
    label: 'Custom / Other', color: '#8898b8', bg: 'rgba(136,152,184,0.07)', border: 'rgba(136,152,184,0.25)',
    logo: '⚙️', desc: 'Custom broker API integration. Fill in all relevant connection details.',
    docUrl: '',
    fields: ['serverHost', 'serverPort', 'serverName', 'apiKey', 'apiSecret', 'restApiUrl', 'websocketUrl'],
  },
}

const FIELD_META: Record<string, { label: string; placeholder: string; secret?: boolean; type?: string }> = {
  serverHost:      { label: 'Server Host / IP', placeholder: 'api.broker.com or 192.168.1.1' },
  serverPort:      { label: 'Server Port', placeholder: '443', type: 'number' },
  serverName:      { label: 'Server Display Name', placeholder: 'HolaPrime-Live' },
  managerLogin:    { label: 'Manager Login', placeholder: '1234567' },
  managerPassword: { label: 'Manager Password', placeholder: '••••••••••••', secret: true },
  apiKey:          { label: 'API Key / Client ID', placeholder: 'pk_live_xxxxxxxxxxxxxxxxxxxx' },
  apiSecret:       { label: 'API Secret / Client Secret', placeholder: '••••••••••••••••••••', secret: true },
  apiPassphrase:   { label: 'API Passphrase', placeholder: '••••••••', secret: true },
  restApiUrl:      { label: 'REST API Base URL', placeholder: 'https://api.broker.com/v1' },
  websocketUrl:    { label: 'WebSocket URL', placeholder: 'wss://stream.broker.com/ws' },
}

const PHASES = ['QUALIFIER', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'GRAND_FINAL']
const STATUS_CFG = {
  CONNECTED: { color: 'var(--green)',  bg: 'rgba(0,230,118,0.1)',   icon: '●', label: 'Connected'  },
  ERROR:      { color: 'var(--red)',    bg: 'rgba(255,56,96,0.1)',   icon: '●', label: 'Error'       },
  DEGRADED:   { color: 'var(--gold)',   bg: 'rgba(240,192,64,0.1)',  icon: '●', label: 'Degraded'    },
  UNTESTED:   { color: 'var(--gray2)', bg: 'rgba(136,152,184,0.1)', icon: '○', label: 'Not Tested'  },
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Platform {
  id: string; name: string; type: string; brokerName: string
  serverHost: string; serverPort: number | null; serverName: string
  managerLogin: string; apiKey: string; restApiUrl: string; websocketUrl: string
  isActive: boolean; isPublic: boolean
  connectionStatus: string; connectionError: string | null
  lastTestedAt: string | null; lastSyncAt: string | null
  allowedPhases: string[]; defaultLeverage: number; defaultBalance: number
  currency: string; accountPrefix: string; sortOrder: number
  description: string; websiteUrl: string; supportEmail: string; notes: string
  _count?: { accounts: number; selections: number }
}

const EMPTY_PLATFORM: Partial<Platform> = {
  name: '', type: 'MT5', brokerName: '', serverHost: '', serverPort: null,
  serverName: '', managerLogin: '', apiKey: '', restApiUrl: '', websocketUrl: '',
  isActive: false, isPublic: false, allowedPhases: ['QUALIFIER'],
  defaultLeverage: 30, defaultBalance: 10000, currency: 'USD',
  accountPrefix: 'HP-WC-', description: '', websiteUrl: '', supportEmail: '', notes: '',
}

// ─── Field masking ─────────────────────────────────────────────────────────
function SecretField({ label, placeholder, value, onChange }: any) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          className="input-field"
          placeholder={placeholder}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 13, paddingRight: 44 }}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray3)', fontSize: 14 }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}

// ─── Connection status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.UNTESTED
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      {status === 'CONNECTED' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'livePulse 2s infinite' }} />}
      {cfg.label}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
export default function AdminPlatformsPage() {
  const [platforms, setPlatforms]     = useState<Platform[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<'overview'|'add'|'edit'>('overview')
  const [editPlatform, setEditPlatform] = useState<Partial<Platform>>(EMPTY_PLATFORM)
  const [editingId, setEditingId]     = useState<string|null>(null)
  const [saving, setSaving]           = useState(false)
  const [testing, setTesting]         = useState<string|null>(null)
  const [testResult, setTestResult]   = useState<{id:string; ok:boolean; msg:string}|null>(null)
  const [saveMsg, setSaveMsg]         = useState('')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/platforms')
      const d = await r.json()
      setPlatforms(d.platforms || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const meta = (type: string) => PLATFORM_META[type] || PLATFORM_META.CUSTOM

  const openAdd = () => {
    setEditPlatform({ ...EMPTY_PLATFORM })
    setEditingId(null)
    setSaveMsg('')
    setActiveTab('add')
  }

  const openEdit = (p: Platform) => {
    setEditPlatform({ ...p })
    setEditingId(p.id)
    setSaveMsg('')
    setActiveTab('edit')
  }

  const setField = (k: string, v: any) => setEditPlatform(prev => ({ ...prev, [k]: v }))

  const togglePhase = (phase: string) => {
    const phases = editPlatform.allowedPhases || []
    setField('allowedPhases', phases.includes(phase) ? phases.filter(p => p !== phase) : [...phases, phase])
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const url    = editingId ? `/api/admin/platforms/${editingId}` : '/api/admin/platforms'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlatform),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      setSaveMsg('✓ Platform saved successfully')
      load()
      setTimeout(() => { setActiveTab('overview'); setSaveMsg('') }, 1200)
    } catch (e: any) { setSaveMsg('⚠ ' + e.message) }
    setSaving(false)
  }

  const handleTest = async (id: string) => {
    setTesting(id); setTestResult(null)
    try {
      const r = await fetch(`/api/admin/platforms/${id}/test`, { method: 'POST' })
      const d = await r.json()
      setTestResult({ id, ok: d.connected, msg: d.message || (d.connected ? 'Connection successful' : 'Connection failed') })
      load() // refresh status
    } catch (e: any) {
      setTestResult({ id, ok: false, msg: e.message })
    }
    setTesting(null)
  }

  const handleToggleActive = async (p: Platform) => {
    await fetch(`/api/admin/platforms/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    load()
  }

  const handleTogglePublic = async (p: Platform) => {
    await fetch(`/api/admin/platforms/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !p.isPublic }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/platforms/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    load()
  }

  const activePlatforms = platforms.filter(p => p.isActive)
  const publicPlatforms = platforms.filter(p => p.isPublic)
  const connectedCount  = platforms.filter(p => p.connectionStatus === 'CONNECTED').length

  // ─── Form section helper ────────────────────────────────────────────────
  const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--deep)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white)' }}>{title}</span>
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  )

  const FormRow = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ paddingTop: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray1)' }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: 'var(--gray3)', marginTop: 3, lineHeight: 1.5 }}>{note}</div>}
      </div>
      <div>{children}</div>
    </div>
  )

  const currentMeta = meta(editPlatform.type || 'MT5')

  return (
    <AdminLayout>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 8 }}>Integrations</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: 'var(--white)', lineHeight: 1, margin: 0 }}>Trading Platforms</h1>
          <button onClick={openAdd} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--neon)', color: 'var(--black)', boxShadow: '0 0 20px rgba(0,212,255,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
            + Add Platform
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {([['overview', '◈ All Platforms'], ['add', '+ Connect New'], ...(activeTab === 'edit' ? [['edit', '✎ Edit Platform']] : [])] as [string,string][]).map(([val, label]) => (
          <button key={val} onClick={() => setActiveTab(val as any)} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 22px', border: 'none', background: 'transparent', cursor: 'pointer', color: activeTab === val ? 'var(--neon)' : 'var(--gray2)', borderBottom: `2px solid ${activeTab === val ? 'var(--neon)' : 'transparent'}`, transition: 'all 0.15s', marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════ TAB: OVERVIEW ════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Total Platforms',   value: platforms.length,        color: 'var(--neon)',  icon: '◈' },
              { label: 'Active',            value: activePlatforms.length,  color: 'var(--green)', icon: '●' },
              { label: 'Trader-Visible',    value: publicPlatforms.length,  color: 'var(--gold)',  icon: '👁' },
              { label: 'Connected',         value: connectedCount,          color: 'var(--neon)',  icon: '⚡' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: s.color, borderRadius: '10px 0 0 10px' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--neon)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)' }}>Loading platforms...</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Empty */}
          {!loading && platforms.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--white)', textTransform: 'uppercase', marginBottom: 10 }}>No Platforms Connected</div>
              <div style={{ fontSize: 15, color: 'var(--gray2)', marginBottom: 28, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>Connect your first trading platform to provision accounts for tournament participants.</div>
              <button onClick={openAdd} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 28px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--neon)', color: 'var(--black)', boxShadow: '0 0 20px rgba(0,212,255,0.35)' }}>
                + Connect First Platform
              </button>
            </div>
          )}

          {/* Platform cards grid */}
          {!loading && platforms.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px,1fr))', gap: 16 }}>
              {platforms.map(p => {
                const m   = meta(p.type)
                const sts = STATUS_CFG[p.connectionStatus as keyof typeof STATUS_CFG] || STATUS_CFG.UNTESTED
                const isTest = testing === p.id
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${p.isActive ? m.border : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: p.isActive ? `0 0 30px ${m.color}10` : 'none' }}>
                    {/* Card header */}
                    <div style={{ padding: '18px 22px', background: p.isActive ? m.bg : 'var(--deep)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Platform type logo */}
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${m.color}20, ${m.color}08)`, border: `1px solid ${m.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {m.logo}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.name || m.label}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>{p.type}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>{p.serverName || p.serverHost || '—'}</div>
                      </div>
                      <StatusBadge status={p.connectionStatus} />
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '18px 22px' }}>
                      {/* Info grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                        {[
                          { label: 'Accounts',  value: String(p._count?.accounts || 0) },
                          { label: 'Selections', value: String(p._count?.selections || 0) },
                          { label: 'Leverage',  value: `1:${p.defaultLeverage}` },
                          { label: 'Balance',   value: `$${Number(p.defaultBalance).toLocaleString()}` },
                          { label: 'Currency',  value: p.currency || 'USD' },
                          { label: 'Prefix',    value: p.accountPrefix || '—' },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'var(--deep)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--gray1)' }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Allowed phases */}
                      {p.allowedPhases?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 7 }}>Available Phases</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {p.allowedPhases.map(ph => (
                              <span key={ph} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'rgba(0,212,255,0.08)', color: 'var(--neon)', border: '1px solid rgba(0,212,255,0.2)' }}>{ph.replace(/_/g,' ')}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Connection error */}
                      {p.connectionError && (
                        <div style={{ background: 'rgba(255,56,96,0.07)', border: '1px solid rgba(255,56,96,0.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--red)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', lineHeight: 1.5 }}>{p.connectionError}</span>
                        </div>
                      )}

                      {/* Test result banner */}
                      {testResult?.id === p.id && (
                        <div style={{ background: testResult.ok ? 'rgba(0,230,118,0.07)' : 'rgba(255,56,96,0.07)', border: `1px solid ${testResult.ok ? 'rgba(0,230,118,0.25)' : 'rgba(255,56,96,0.25)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 15 }}>{testResult.ok ? '✅' : '❌'}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: testResult.ok ? 'var(--green)' : 'var(--red)' }}>{testResult.msg}</span>
                        </div>
                      )}

                      {/* Toggles + Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        {/* Toggle switches */}
                        <div style={{ display: 'flex', gap: 14 }}>
                          {[
                            { label: 'Active', value: p.isActive, toggle: () => handleToggleActive(p), color: 'var(--green)' },
                            { label: 'Trader-Visible', value: p.isPublic, toggle: () => handleTogglePublic(p), color: 'var(--gold)' },
                          ].map(t => (
                            <button key={t.label} onClick={t.toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <div style={{ width: 36, height: 20, borderRadius: 10, background: t.value ? t.color : 'var(--surface2)', border: `1px solid ${t.value ? t.color : 'var(--border2)'}`, position: 'relative', transition: 'all 0.2s', boxShadow: t.value ? `0 0 8px ${t.color}60` : 'none' }}>
                                <div style={{ position: 'absolute', top: 2, left: t.value ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: t.value ? 'var(--black)' : 'var(--gray3)', transition: 'left 0.2s' }} />
                              </div>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.value ? t.color : 'var(--gray3)' }}>{t.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleTest(p.id)}
                            disabled={isTest}
                            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)', color: 'var(--neon)', cursor: isTest ? 'not-allowed' : 'pointer', opacity: isTest ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {isTest ? <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid var(--neon)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : '⚡'}
                            {isTest ? 'Testing...' : 'Test'}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--gray1)', cursor: 'pointer' }}
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(255,56,96,0.25)', background: 'rgba(255,56,96,0.06)', color: 'var(--red)', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Last synced */}
                      {p.lastTestedAt && (
                        <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray3)' }}>
                          Last tested: {new Date(p.lastTestedAt).toLocaleString()}
                          {p.lastSyncAt && ` · Last sync: ${new Date(p.lastSyncAt).toLocaleString()}`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══════ TAB: ADD / EDIT ══════════════════════════════════════════════ */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <div style={{ maxWidth: 780 }}>
          {/* Platform type selector (only on add) */}
          {activeTab === 'add' && (
            <FormSection title="Choose Platform Type">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {Object.entries(PLATFORM_META).map(([type, m]) => {
                  const active = editPlatform.type === type
                  return (
                    <button key={type} onClick={() => setField('type', type)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', borderRadius: 12, border: `1px solid ${active ? m.color : 'var(--border)'}`, background: active ? m.bg : 'var(--deep)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: active ? `0 0 16px ${m.color}20` : 'none' }}>
                      <span style={{ fontSize: 28 }}>{m.logo}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? m.color : 'var(--gray2)', textAlign: 'center', lineHeight: 1.3 }}>{m.label}</span>
                    </button>
                  )
                })}
              </div>
              {/* Platform description */}
              <div style={{ background: `${currentMeta.bg}`, border: `1px solid ${currentMeta.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{currentMeta.logo}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: currentMeta.color, marginBottom: 4 }}>{currentMeta.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.65 }}>{currentMeta.desc}</div>
                  {currentMeta.docUrl && (
                    <a href={currentMeta.docUrl} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: currentMeta.color, textDecoration: 'none', marginTop: 6, display: 'inline-block', opacity: 0.8 }}>
                      API Documentation →
                    </a>
                  )}
                </div>
              </div>
            </FormSection>
          )}

          {/* Display info */}
          <FormSection title="Display Information">
            <FormRow label="Platform Name" note="Shown to traders and admins">
              <input className="input-field" placeholder={`e.g. ${currentMeta.label} — HolaPrime`} value={editPlatform.name || ''} onChange={e => setField('name', e.target.value)} />
            </FormRow>
            <FormRow label="Broker Name" note="Broker / white-label provider">
              <input className="input-field" placeholder="e.g. HolaPrime Markets Ltd" value={editPlatform.brokerName || ''} onChange={e => setField('brokerName', e.target.value)} />
            </FormRow>
            <FormRow label="Description" note="Shown on trader platform selector">
              <textarea className="input-field" placeholder="Brief description for traders..." value={editPlatform.description || ''} onChange={e => setField('description', e.target.value)} rows={2} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            </FormRow>
            <FormRow label="Website URL">
              <input className="input-field" placeholder="https://broker.com" value={editPlatform.websiteUrl || ''} onChange={e => setField('websiteUrl', e.target.value)} />
            </FormRow>
            <FormRow label="Support Email">
              <input className="input-field" placeholder="support@broker.com" value={editPlatform.supportEmail || ''} onChange={e => setField('supportEmail', e.target.value)} />
            </FormRow>
          </FormSection>

          {/* Connection credentials */}
          <FormSection title={`Connection Credentials — ${currentMeta.label}`}>
            <div style={{ background: 'rgba(240,192,64,0.05)', border: '1px solid rgba(240,192,64,0.2)', borderRadius: 8, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>🔒</span>
              <div style={{ fontSize: 12, color: 'var(--gray2)', lineHeight: 1.6 }}>Credentials are stored encrypted. API secrets are never exposed in responses. Ensure your broker's IP allowlist includes this server.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {(FIELD_META.serverHost ? ['serverHost'] : []).map(f => (
                currentMeta.fields.includes(f) && (
                  <div key={f} style={{ gridColumn: '1/-1' }}>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 6 }}>{FIELD_META[f].label}</label>
                    <input className="input-field" placeholder={FIELD_META[f].placeholder} value={(editPlatform as any)[f] || ''} onChange={e => setField(f, e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                  </div>
                )
              ))}
              {currentMeta.fields.filter(f => f !== 'serverHost').map(f => {
                const fm = FIELD_META[f]
                if (!fm) return null
                const isFullWidth = ['restApiUrl', 'websocketUrl'].includes(f)
                if (fm.secret) return (
                  <div key={f} style={{ gridColumn: isFullWidth ? '1/-1' : 'auto' }}>
                    <SecretField label={fm.label} placeholder={fm.placeholder} value={(editPlatform as any)[f]} onChange={(v: string) => setField(f, v)} />
                  </div>
                )
                return (
                  <div key={f} style={{ gridColumn: isFullWidth ? '1/-1' : 'auto' }}>
                    <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray2)', marginBottom: 6 }}>{fm.label}</label>
                    <input className="input-field" type={fm.type || 'text'} placeholder={fm.placeholder} value={(editPlatform as any)[f] || ''} onChange={e => setField(f, fm.type === 'number' ? Number(e.target.value) : e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                  </div>
                )
              })}
            </div>
          </FormSection>

          {/* Tournament config */}
          <FormSection title="Tournament Configuration">
            <FormRow label="Account Prefix" note="Prefix for provisioned account numbers">
              <input className="input-field" placeholder="HP-WC-" value={editPlatform.accountPrefix || ''} onChange={e => setField('accountPrefix', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, maxWidth: 200 }} />
            </FormRow>
            <FormRow label="Default Balance ($)" note="Starting balance for each account">
              <input className="input-field" type="number" value={editPlatform.defaultBalance || 10000} onChange={e => setField('defaultBalance', Number(e.target.value))} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, maxWidth: 200 }} />
            </FormRow>
            <FormRow label="Max Leverage" note="e.g. 30 for 1:30">
              <input className="input-field" type="number" value={editPlatform.defaultLeverage || 30} onChange={e => setField('defaultLeverage', Number(e.target.value))} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, maxWidth: 150 }} />
            </FormRow>
            <FormRow label="Currency" note="Account base currency">
              <select className="input-field" value={editPlatform.currency || 'USD'} onChange={e => setField('currency', e.target.value)} style={{ maxWidth: 150 }}>
                {['USD','EUR','GBP','AUD','JPY','CHF'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="Allowed Phases" note="Which tournament rounds use this platform">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PHASES.map(ph => {
                  const on = (editPlatform.allowedPhases || []).includes(ph)
                  return (
                    <button key={ph} onClick={() => togglePhase(ph)} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 6, border: `1px solid ${on ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`, background: on ? 'rgba(0,212,255,0.1)' : 'transparent', color: on ? 'var(--neon)' : 'var(--gray3)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {ph.replace(/_/g,' ')}
                    </button>
                  )
                })}
              </div>
            </FormRow>
            <FormRow label="Sort Order" note="Lower = shown first to traders">
              <input className="input-field" type="number" value={editPlatform.sortOrder ?? 0} onChange={e => setField('sortOrder', Number(e.target.value))} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, maxWidth: 120 }} />
            </FormRow>
            <FormRow label="Internal Notes">
              <textarea className="input-field" placeholder="Admin-only notes about this integration..." value={editPlatform.notes || ''} onChange={e => setField('notes', e.target.value)} rows={3} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            </FormRow>
          </FormSection>

          {/* Save area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 32px', borderRadius: 9, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'var(--neon)', color: 'var(--black)', boxShadow: '0 0 22px rgba(0,212,255,0.35)', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              {saving && <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--black)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
              {saving ? 'Saving...' : (editingId ? '✓ Update Platform' : '+ Add Platform')}
            </button>
            <button onClick={() => setActiveTab('overview')} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 22px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--gray2)', cursor: 'pointer' }}>
              Cancel
            </button>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: saveMsg.startsWith('⚠') ? 'var(--red)' : 'var(--green)' }}>{saveMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* ══════ DELETE CONFIRM MODAL ══════════════════════════════════════════ */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,4,10,0.85)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--deep)', border: '1px solid rgba(255,56,96,0.3)', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--white)', textTransform: 'uppercase', marginBottom: 12 }}>Remove Platform?</div>
            <p style={{ fontSize: 14, color: 'var(--gray2)', lineHeight: 1.65, marginBottom: 24 }}>
              This will disconnect the platform and remove all API credentials. Existing trader accounts linked to this platform will remain in the database but become unsynced.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '13px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Remove</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '13px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--gray2)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
