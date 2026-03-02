'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/logs/page.tsx
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const ACTION_COLOR: Record<string,string> = {
  LOGIN:'var(--neon)', LOGOUT:'var(--gray3)', REGISTER:'var(--green)',
  KYC_APPROVED:'var(--green)', KYC_REJECTED:'var(--red)', KYC_OVERRIDE:'var(--gold)',
  TRADER_DISQUALIFIED:'var(--red)', TRADER_STATUS_CHANGED:'var(--gold)',
  PAYMENT_CONFIG_UPDATED:'var(--gold)', CONFIG_UPDATED:'var(--neon)',
  PLATFORM_CREATED:'var(--neon)', PLATFORM_UPDATED:'var(--neon)',
  MATCH_RESULT_RECORDED:'var(--green)', BRACKET_DRAWN:'var(--gold)',
  BULK_EMAIL_SENT:'var(--gold)', ADMIN_CREATED:'var(--neon)',
  ROLE_CHANGED:'var(--gold)', ACCOUNT_PROVISIONED:'var(--green)',
}

export default function AdminLogsPage() {
  const [logs, setLogs]     = useState<any[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (search) params.set('action', search)
    if (entity) params.set('entity', entity)
    const r = await fetch(`/api/admin/logs?${params}`).catch(() => null)
    if (r?.ok) {
      const d = await r.json()
      setLogs(d.logs || [])
      setTotal(d.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load(1) }, [search, entity])

  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' })

  const ENTITIES = ['', 'TRADER', 'USER', 'PAYMENT', 'CONFIG', 'PLATFORM', 'KYC', 'BRACKET', 'EMAIL']

  return (
    <AdminLayout>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>System</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', lineHeight:1, margin:0 }}>Audit Logs</h1>
        <div style={{ fontSize:14, color:'var(--gray3)', marginTop:6 }}>{total.toLocaleString()} total actions recorded</div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input className="input-field" placeholder="🔍 Search action…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{ width:260, padding:'9px 14px', fontSize:13 }} />
        <select value={entity} onChange={e=>{setEntity(e.target.value);setPage(1)}} className="input-field" style={{ width:180, padding:'9px 14px', fontSize:13 }}>
          {ENTITIES.map(e => <option key={e} value={e}>{e || 'All Entity Types'}</option>)}
        </select>
        <button onClick={() => load(1)} className="btn-neon" style={{ padding:'9px 20px', fontSize:13 }}>Refresh</button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Timestamp','Admin','Action','Entity','Details','IP'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:12 }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:12 }}>No logs found</td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', whiteSpace:'nowrap' }}>{fmt(log.createdAt)}</td>
                <td style={{ padding:'11px 16px', fontSize:13, color:'var(--gray1)' }}>
                  <div style={{ fontWeight:600 }}>{log.user?.firstName || '—'}</div>
                  <div style={{ fontSize:11, color:'var(--gray3)' }}>{log.user?.email}</div>
                </td>
                <td style={{ padding:'11px 16px' }}>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', color: ACTION_COLOR[log.action] || 'var(--gray2)' }}>{log.action}</span>
                </td>
                <td style={{ padding:'11px 16px', fontSize:12, color:'var(--gray3)', fontFamily:'var(--font-mono)' }}>
                  {log.entityType && <span style={{ background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.12)', borderRadius:4, padding:'2px 6px' }}>{log.entityType}</span>}
                </td>
                <td style={{ padding:'11px 16px', fontSize:12, color:'var(--gray2)', maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.details || '—'}</td>
                <td style={{ padding:'11px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
          <button onClick={() => { const p = Math.max(1,page-1); setPage(p); load(p) }} disabled={page<=1} className="btn-outline" style={{ padding:'8px 16px', fontSize:13, opacity:page<=1?0.4:1 }}>← Prev</button>
          <span style={{ padding:'8px 16px', fontSize:13, color:'var(--gray3)', fontFamily:'var(--font-display)' }}>Page {page} of {Math.ceil(total/50)}</span>
          <button onClick={() => { const p = page+1; setPage(p); load(p) }} disabled={page*50>=total} className="btn-outline" style={{ padding:'8px 16px', fontSize:13, opacity:page*50>=total?0.4:1 }}>Next →</button>
        </div>
      )}
    </AdminLayout>
  )
}
