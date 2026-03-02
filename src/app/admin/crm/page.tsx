'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const STATUS_CFG: Record<string,{color:string;bg:string;border:string}> = {
  REGISTERED: {color:'var(--neon)', bg:'rgba(0,212,255,0.08)',  border:'rgba(0,212,255,0.2)'},
  KYC_PENDING:{color:'var(--gold)', bg:'rgba(240,192,64,0.08)', border:'rgba(240,192,64,0.2)'},
  KYC_APPROVED:{color:'var(--green)',bg:'rgba(0,230,118,0.08)', border:'rgba(0,230,118,0.2)'},
  ACTIVE:     {color:'var(--green)',bg:'rgba(0,230,118,0.08)',  border:'rgba(0,230,118,0.2)'},
  DISQUALIFIED:{color:'var(--red)', bg:'rgba(255,56,96,0.08)',  border:'rgba(255,56,96,0.2)'},
  KYC_REJECTED:{color:'var(--red)', bg:'rgba(255,56,96,0.08)',  border:'rgba(255,56,96,0.2)'},
  ELIMINATED: {color:'var(--gray3)',bg:'rgba(74,85,128,0.15)', border:'var(--border2)'},
}

export default function AdminCRMPage() {
  const [traders, setTraders]   = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [page, setPage]         = useState(1)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkBody, setBulkBody]       = useState('')
  const [bulkMsg, setBulkMsg]         = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [logs, setLogs]         = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const load = useCallback(async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'50' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    const r = await fetch(`/api/admin/traders?${params}`).then(r=>r.json()).catch(()=>({}))
    setTraders(r.traders||[])
    setTotal(r.total||0)
    setLoading(false)
  }, [search, status])

  useEffect(() => { setPage(1); load(1) }, [search, status])

  useEffect(() => {
    setLogsLoading(true)
    fetch('/api/admin/logs?limit=10&entity=EMAIL').then(r=>r.json()).then(d => {
      setLogs(d.logs||[])
      setLogsLoading(false)
    }).catch(()=>setLogsLoading(false))
  }, [])

  const sendBulk = async () => {
    if (!bulkSubject || !bulkBody) return
    setBulkSending(true)
    const r = await fetch('/api/admin/email/bulk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ subject:bulkSubject, body:bulkBody, statusFilter:status||undefined }),
    }).then(r=>r.json()).catch(()=>({}))
    setBulkMsg(r.sent ? `✓ Sent to ${r.sent} traders` : 'Error: ' + (r.error||'Failed'))
    setBulkSending(false)
    if (r.sent) { setTimeout(()=>{setBulkMsg('');setShowBulk(false);setBulkSubject('');setBulkBody('')},3000) }
  }

  const counts: Record<string,number> = {}
  traders.forEach(t => { counts[t.status] = (counts[t.status]||0)+1 })

  return (
    <AdminLayout>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Communications</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>CRM</h1>
        </div>
        <button onClick={()=>setShowBulk(true)} className="btn-neon" style={{padding:'10px 20px',fontSize:13}}>✉ Send Bulk Email</button>
      </div>

      {/* Stats strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:20}}>
        {Object.entries(STATUS_CFG).map(([s,c])=>(
          <div key={s} onClick={()=>setStatus(st=>st===s?'':s)} className="card" style={{padding:'14px 16px',cursor:'pointer',border:`1px solid ${status===s?c.border:'var(--border)'}`,background:status===s?c.bg:'var(--surface)'}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:c.color,marginBottom:6}}>{s.replace(/_/g,' ')}</div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:24,color:'var(--white)'}}>{counts[s]||0}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20}}>
        {/* Traders table */}
        <div>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <input className="input-field" placeholder="🔍 Search name or email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{flex:1,padding:'9px 14px',fontSize:13}}/>
            <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="input-field" style={{padding:'9px 14px',fontSize:13}}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_CFG).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <button onClick={()=>load(page)} className="btn-outline" style={{padding:'9px 14px',fontSize:13}}>↻</button>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border)'}}>
                  {['Trader','Country','Status','Registered','KYC'].map(h=>(
                    <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</td></tr>
                : traders.length===0 ? <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>No traders found</td></tr>
                : traders.map((t:any,i:number)=>{
                  const sc = STATUS_CFG[t.status]||STATUS_CFG.REGISTERED
                  return (
                    <tr key={t.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{t.displayName||`${t.firstName||''} ${t.lastName||''}`.trim()||'—'}</div>
                        <div style={{fontSize:11,color:'var(--gray3)'}}>{t.email}</div>
                      </td>
                      <td style={{padding:'10px 14px',fontSize:12,color:'var(--gray2)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          {t.country?.code&&<img src={`https://flagcdn.com/w40/${t.country.code.toLowerCase()}.png`} alt="" style={{width:18,height:12,objectFit:'cover',borderRadius:2}}/>}
                          {t.country?.name||'—'}
                        </div>
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.06em',color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:4,padding:'3px 8px'}}>{t.status}</span>
                      </td>
                      <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>{new Date(t.createdAt).toLocaleDateString('en-GB',{dateStyle:'medium'})}</td>
                      <td style={{padding:'10px 14px',fontSize:12,color:t.kycRecord?.status==='APPROVED'?'var(--green)':t.kycRecord?.status==='REJECTED'?'var(--red)':'var(--gray3)'}}>{t.kycRecord?.status||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {total>50&&(
              <div style={{display:'flex',justifyContent:'center',gap:8,padding:12,borderTop:'1px solid var(--border)'}}>
                <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'6px 12px',fontSize:11,opacity:page<=1?0.4:1}}>← Prev</button>
                <span style={{padding:'6px 12px',fontSize:11,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>{page} / {Math.ceil(total/50)}</span>
                <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*50>=total} className="btn-outline" style={{padding:'6px 12px',fontSize:11,opacity:page*50>=total?0.4:1}}>Next →</button>
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:12}}>Recent Email Activity</div>
          <div className="card" style={{padding:0}}>
            {logsLoading ? <div style={{padding:24,textAlign:'center',color:'var(--gray3)',fontSize:12,fontFamily:'var(--font-display)'}}>Loading…</div>
            : logs.length===0 ? <div style={{padding:24,textAlign:'center',color:'var(--gray3)',fontSize:12,fontFamily:'var(--font-display)'}}>No email logs yet</div>
            : logs.map((log:any)=>(
              <div key={log.id} style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(0,212,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>✉</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:'var(--gray1)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.details||log.action}</div>
                  <div style={{fontSize:10,color:'var(--gray3)',marginTop:3}}>{new Date(log.createdAt).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk email modal */}
      {showBulk&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
          <div style={{background:'var(--deep)',border:'1px solid var(--border)',borderRadius:16,padding:32,width:520,maxWidth:'95vw'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:'var(--white)',marginBottom:20}}>Send Bulk Email</h2>
            {status&&<div style={{marginBottom:14,fontSize:13,color:'var(--neon)'}}>Filter: sending to <strong>{status}</strong> traders only</div>}
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Subject</label>
              <input className="input-field" value={bulkSubject} onChange={e=>setBulkSubject(e.target.value)} style={{width:'100%',boxSizing:'border-box'}} placeholder="Email subject…"/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Body</label>
              <textarea className="input-field" value={bulkBody} onChange={e=>setBulkBody(e.target.value)} rows={8} style={{width:'100%',boxSizing:'border-box',resize:'vertical'}} placeholder="Email content… (plain text or HTML)"/>
            </div>
            {bulkMsg&&<div style={{marginBottom:12,fontSize:13,color:bulkMsg.startsWith('✓')?'var(--green)':'var(--red)'}}>{bulkMsg}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowBulk(false)} className="btn-outline" style={{flex:1}}>Cancel</button>
              <button onClick={sendBulk} disabled={!bulkSubject||!bulkBody||bulkSending} className="btn-neon" style={{flex:1,opacity:!bulkSubject||!bulkBody||bulkSending?0.6:1}}>{bulkSending?'Sending…':'✉ Send Email'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
