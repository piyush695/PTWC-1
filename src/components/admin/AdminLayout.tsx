'use client'
// src/components/admin/AdminLayout.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV = [
  {
    section: 'Overview',
    items: [
      { href: '/admin',             label: 'Dashboard',          icon: '◈' },
    ]
  },
  {
    section: 'Tournament',
    items: [
      { href: '/admin/traders',     label: 'Traders & KYC',      icon: '◉' },
      { href: '/admin/kyc',         label: 'KYC Management',     icon: '🪪' },
      { href: '/admin/tournament',  label: 'Progress & Violations', icon: '⚡' },
      { href: '/admin/bracket',     label: 'Bracket & Matches',  icon: '◈' },
      { href: '/admin/accounts',    label: 'Trading Accounts',   icon: '◇' },
      { href: '/admin/platforms',   label: 'Platforms & APIs',   icon: '🔌' },
    ]
  },
  {
    section: 'Communications',
    items: [
      { href: '/admin/crm',         label: 'CRM',                icon: '◎' },
      { href: '/admin/email',       label: 'Email & SMTP',       icon: '✉' },
    ]
  },
  {
    section: 'Content',
    items: [
      { href: '/admin/cms',         label: 'CMS / News',         icon: '✎' },
    ]
  },
  {
    section: 'System',
    items: [
      { href: '/admin/users',       label: 'Admin Users',        icon: '👥' },
      { href: '/admin/payment',     label: 'Payment Config',     icon: '💳' },
      { href: '/admin/config',      label: 'Tournament Config',  icon: '⚙' },
      { href: '/admin/logs',        label: 'Audit Logs',         icon: '◎' },
    ]
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [me, setMe] = useState<{email:string;role:string;firstName?:string}|null>(null)
  const [phase, setPhase] = useState('REGISTRATION')

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{ if(d.user) setMe(d.user) }).catch(()=>{})
    fetch('/api/config').then(r=>r.json()).then(d=>{ if(d.config?.currentPhase) setPhase(d.config.currentPhase) }).catch(()=>{})
  }, [])

  const ROLE_COLOR: Record<string,string> = { SUPER_ADMIN:'var(--gold)', ADMIN:'var(--neon)' }
  const ROLE_LABEL: Record<string,string> = { SUPER_ADMIN:'Super Admin', ADMIN:'Admin', TRADER:'Trader' }
  const PHASE_LABEL: Record<string,string> = {
    REGISTRATION:'Registration', QUALIFIER:'Qualifier', ROUND_OF_32:'Round of 32',
    ROUND_OF_16:'Round of 16', QUARTERFINAL:'Quarterfinals', SEMIFINAL:'Semifinals',
    GRAND_FINAL:'Grand Final', COMPLETED:'Completed',
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    router.replace('/admin-login')
  }

  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.startsWith(href)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--black)', fontFamily:'var(--font-body)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside style={{ width:collapsed?64:240, flexShrink:0, background:'var(--deep)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:50, transition:'width 0.25s ease', overflow:'hidden' }}>

        {/* Logo */}
        <div style={{ padding:collapsed?'20px 16px':'20px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, minHeight:64 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--neon)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 14px rgba(0,212,255,0.5)' }}>
            <span style={{ fontSize:16 }}>🏆</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.06em', color:'var(--white)', lineHeight:1 }}>HOLA PRIME</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.2em', color:'var(--neon)', lineHeight:1, marginTop:2 }}>ADMIN PANEL</div>
            </div>
          )}
        </div>

        {/* Current user */}
        {me && !collapsed && (
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                {me.role === 'SUPER_ADMIN' ? '👑' : '🛡'}
              </div>
              <div style={{ overflow:'hidden' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.08em', color:ROLE_COLOR[me.role]||'var(--gray2)', textTransform:'uppercase' }}>{ROLE_LABEL[me.role]||me.role}</div>
                <div style={{ fontSize:10, color:'var(--gray3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>{me.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'12px 0' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom:4 }}>
              {!collapsed && (
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', padding:'10px 20px 6px' }}>
                  {group.section}
                </div>
              )}
              {collapsed && <div style={{ height:8 }} />}
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} title={collapsed?item.label:undefined} style={{ display:'flex', alignItems:'center', gap:10, padding:collapsed?'10px 16px':'10px 20px', textDecoration:'none', background:active?'rgba(0,212,255,0.08)':'transparent', borderRight:active?'2px solid var(--neon)':'2px solid transparent', color:active?'var(--neon)':'var(--gray2)', transition:'all 0.15s', justifyContent:collapsed?'center':'flex-start' }}
                    onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)' }}
                    onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background='transparent' }}
                  >
                    <span style={{ fontSize:15, flexShrink:0, opacity:active?1:0.6 }}>{item.icon}</span>
                    {!collapsed && <span style={{ fontFamily:'var(--font-display)', fontWeight:active?800:600, fontSize:13, letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop:'1px solid var(--border)', padding:'12px 0' }}>
          {!collapsed && (
            <>
              <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'none', border:'none', cursor:'pointer', color:'var(--red)', width:'100%', transition:'color 0.15s' }}>
                <span style={{ fontSize:14 }}>⏻</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:'0.08em', fontWeight:600 }}>SIGN OUT</span>
              </button>
              <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', textDecoration:'none', color:'var(--gray3)' }}>
                <span style={{ fontSize:14 }}>↗</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:'0.08em', fontWeight:600 }}>VIEW SITE</span>
              </Link>
            </>
          )}
          <button onClick={() => setCollapsed(c=>!c)} style={{ display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-start', gap:10, padding:collapsed?'10px 16px':'10px 20px', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', width:'100%', transition:'color 0.15s' }}>
            <span style={{ fontSize:16 }}>{collapsed?'→':'←'}</span>
            {!collapsed && <span style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:'0.08em', fontWeight:600 }}>COLLAPSE</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, marginLeft:collapsed?64:240, transition:'margin-left 0.25s ease', display:'flex', flexDirection:'column', minHeight:'100vh' }}>

        {/* Topbar */}
        <header style={{ height:64, borderBottom:'1px solid var(--border)', background:'rgba(7,11,22,0.9)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky', top:0, zIndex:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, letterSpacing:'0.15em', color:'var(--gray3)', textTransform:'uppercase' }}>Admin</span>
            {path !== '/admin' && (
              <>
                <span style={{ color:'var(--gray3)' }}>›</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, letterSpacing:'0.15em', color:'var(--neon)', textTransform:'uppercase' }}>
                  {path.split('/').pop()?.replace(/-/g,' ')}
                </span>
              </>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:8, padding:'6px 14px' }}>
              <span className="live-dot" />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--neon)' }}>
                {PHASE_LABEL[phase] || phase}
              </span>
            </div>
            <Link href="/admin/tournament" style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface2)', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', textDecoration:'none', fontSize:16 }}>
              👤
            </Link>
          </div>
        </header>

        <main style={{ flex:1, padding:'32px 28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
