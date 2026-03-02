'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/traders/page.tsx — Live DB data
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const STATUS_CFG: Record<string,{label:string;color:string;bg:string;border:string}> = {
  REGISTERED:   {label:'Registered',   color:'var(--gray2)', bg:'rgba(100,110,150,0.1)', border:'rgba(100,110,150,0.2)'},
  KYC_PENDING:  {label:'KYC Pending',  color:'var(--gold)',  bg:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)'},
  KYC_APPROVED: {label:'KYC Approved', color:'var(--neon)',  bg:'rgba(0,212,255,0.1)',  border:'rgba(0,212,255,0.25)'},
  KYC_REJECTED: {label:'KYC Rejected', color:'var(--red)',   bg:'rgba(255,56,96,0.1)',  border:'rgba(255,56,96,0.25)'},
  ACTIVE:       {label:'Active',       color:'var(--green)', bg:'rgba(0,230,118,0.1)',  border:'rgba(0,230,118,0.25)'},
  DISQUALIFIED: {label:'Disqualified', color:'var(--red)',   bg:'rgba(255,56,96,0.1)',  border:'rgba(255,56,96,0.25)'},
  ELIMINATED:   {label:'Eliminated',   color:'var(--gray3)', bg:'rgba(74,85,128,0.2)',  border:'var(--border2)'},
  FINALIST:     {label:'Finalist',     color:'var(--gold)',  bg:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)'},
  CHAMPION:     {label:'Champion 🏆',  color:'var(--gold)',  bg:'rgba(240,192,64,0.15)',border:'rgba(240,192,64,0.4)'},
}

function StatusBadge({status}:{status:string}) {
  const c = STATUS_CFG[status] || STATUS_CFG.REGISTERED
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',padding:'4px 10px',borderRadius:4,color:c.color,background:c.bg,border:`1px solid ${c.border}`}}>{c.label}</span>
}

export default function AdminTradersPage() {
  const [traders, setTraders]           = useState<any[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected]         = useState<any>(null)
  const [noteText, setNoteText]         = useState('')
  const [noteLoading, setNoteLoading]   = useState(false)
  const [counts, setCounts]             = useState<Record<string,number>>({})

  const load = useCallback(async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'50' })
    if (statusFilter) params.set('status', statusFilter)
    if (search)       params.set('search', search)
    const r = await fetch(`/api/admin/traders?${params}`).catch(()=>null)
    if (r?.ok) {
      const d = await r.json()
      setTraders(d.traders||[])
      setTotal(d.total||0)
      if (!statusFilter && !search && p===1) {
        // build count summary from all traders first load
        const c: Record<string,number> = {}
        d.traders?.forEach((t:any)=>{ c[t.status]=(c[t.status]||0)+1 })
        // also fetch totals
        const all = await fetch('/api/admin/stats').then(r=>r.json()).catch(()=>({}))
        setCounts({
          all: all.traders?.total||d.total,
          KYC_PENDING: all.traders?.kycPending||0,
          ACTIVE: all.traders?.active||0,
          DISQUALIFIED: all.traders?.disqualified||0,
          KYC_REJECTED: all.traders?.kycRejected||0,
        })
      }
    }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { setPage(1); load(1) }, [statusFilter, search])

  const saveNote = async () => {
    if (!selected || !noteText.trim()) return
    setNoteLoading(true)
    await fetch(`/api/admin/traders/${selected.id}/notes`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ note: noteText })
    }).catch(()=>{})
    setNoteText('')
    // refresh trader data
    const r = await fetch(`/api/admin/traders/${selected.id}`).then(r=>r.json()).catch(()=>null)
    if (r?.trader) setSelected(r.trader)
    setNoteLoading(false)
  }

  const changeStatus = async (traderId:string, status:string) => {
    await fetch(`/api/admin/traders/${traderId}/status`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status })
    }).catch(()=>{})
    load(page)
    if (selected?.id === traderId) setSelected((p:any)=>p?{...p,status}:p)
  }

  const TABS = [
    {label:`All (${counts.all||total})`,           value:''},
    {label:`KYC Pending (${counts.KYC_PENDING||0})`, value:'KYC_PENDING'},
    {label:`Active (${counts.ACTIVE||0})`,           value:'ACTIVE'},
    {label:`DQ'd (${counts.DISQUALIFIED||0})`,       value:'DISQUALIFIED'},
    {label:`KYC Rejected (${counts.KYC_REJECTED||0})`, value:'KYC_REJECTED'},
  ]

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Tournament</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>Traders & KYC</h1>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {TABS.map(tab=>(
          <button key={tab.value} onClick={()=>{setStatusFilter(tab.value);setPage(1)}} style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,letterSpacing:'0.06em',padding:'8px 16px',borderRadius:8,border:`1px solid ${statusFilter===tab.value?'rgba(0,212,255,0.4)':'var(--border2)'}`,background:statusFilter===tab.value?'rgba(0,212,255,0.08)':'transparent',color:statusFilter===tab.value?'var(--neon)':'var(--gray2)',cursor:'pointer',transition:'all 0.15s'}}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <input className="input-field" placeholder="🔍 Search traders…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:300,padding:'9px 14px',fontSize:13}}/>
        <button onClick={()=>load(page)} className="btn-neon" style={{padding:'9px 18px',fontSize:13}}>↻ Refresh</button>
        <div style={{marginLeft:'auto',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--gray3)',display:'flex',alignItems:'center'}}>{total.toLocaleString()} traders</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 380px':'1fr',gap:20}}>
        {/* Table */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Trader','Country','Status','Return','Max DD','Trades','Account','KYC','Registered'].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</td></tr>
              ) : traders.length === 0 ? (
                <tr><td colSpan={9} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>No traders found</td></tr>
              ) : traders.map((t,i) => {
                const qe = t.qualifierEntry
                const acc = t.accounts?.[0]
                const isSelected = selected?.id === t.id
                return (
                  <tr key={t.id} onClick={()=>setSelected(isSelected?null:t)} style={{borderBottom:'1px solid var(--border)',background:isSelected?'rgba(0,212,255,0.06)':i%2===0?'transparent':'rgba(255,255,255,0.01)',cursor:'pointer',transition:'background 0.1s'}}>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{t.displayName}</div>
                      <div style={{fontSize:11,color:'var(--gray3)'}}>{t.email}</div>
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--gray1)'}}>
                        {t.country?.code && <img src={`https://flagcdn.com/w40/${t.country.code.toLowerCase()}.png`} alt="" style={{width:20,height:14,objectFit:'cover',borderRadius:2,flexShrink:0}}/>}
                        {t.country?.code||'?'}
                      </div>
                    </td>
                    <td style={{padding:'11px 14px'}}><StatusBadge status={t.status}/></td>
                    <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:13,color:qe?.returnPct>0?'var(--green)':'var(--gray3)'}}>{qe?`${parseFloat(qe.returnPct).toFixed(1)}%`:'—'}</td>
                    <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:13,color:'var(--gray2)'}}>{qe?`${parseFloat(qe.maxDrawdown).toFixed(1)}%`:acc?`${parseFloat(acc.maxDrawdown||0).toFixed(1)}%`:'—'}</td>
                    <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:13,color:'var(--gray2)'}}>{acc?.totalTrades??'—'}</td>
                    <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>{acc?.accountNumber||'—'}</td>
                    <td style={{padding:'11px 14px',fontSize:12,color:'var(--gray3)'}}>{t.kycVerifiedAt?new Date(t.kycVerifiedAt).toLocaleDateString():'—'}</td>
                    <td style={{padding:'11px 14px',fontSize:12,color:'var(--gray3)',whiteSpace:'nowrap'}}>{new Date(t.registeredAt).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 50 && (
            <div style={{display:'flex',justifyContent:'center',gap:8,padding:'16px',borderTop:'1px solid var(--border)'}}>
              <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page<=1?0.4:1}}>← Prev</button>
              <span style={{padding:'7px 14px',fontSize:12,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>Page {page} of {Math.ceil(total/50)}</span>
              <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*50>=total} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page*50>=total?0.4:1}}>Next →</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:'var(--white)'}}>{selected.displayName}</div>
                  <div style={{fontSize:12,color:'var(--gray3)',marginTop:3}}>{selected.email}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--gray3)'}}>✕</button>
              </div>

              <StatusBadge status={selected.status}/>

              <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8}}>
                {[
                  ['Name',`${selected.firstName} ${selected.lastName}`],
                  ['Country',selected.country?.name||'—'],
                  ['Phone',selected.phone||'—'],
                  ['Registered',new Date(selected.registeredAt).toLocaleDateString()],
                  ['KYC Verified',selected.kycVerifiedAt?new Date(selected.kycVerifiedAt).toLocaleDateString():'Not verified'],
                  ['Account',selected.accounts?.[0]?.accountNumber||'Not provisioned'],
                  ['Referral',selected.referredBy||'—'],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontFamily:'var(--font-display)',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gray3)'}}>{l}</span>
                    <span style={{fontSize:13,color:'var(--gray1)'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Status change */}
              <div style={{marginTop:16}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:8}}>Change Status</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {['KYC_APPROVED','ACTIVE','KYC_REJECTED','DISQUALIFIED'].map(s=>(
                    <button key={s} onClick={()=>changeStatus(selected.id,s)} disabled={selected.status===s} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${STATUS_CFG[s]?.border||'var(--border2)'}`,background:'transparent',color:STATUS_CFG[s]?.color||'var(--gray2)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.08em',textTransform:'uppercase',cursor:selected.status===s?'not-allowed':'pointer',opacity:selected.status===s?0.4:1}}>
                      {STATUS_CFG[s]?.label||s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:12}}>Admin Notes</div>
              {selected.notes?.length > 0 ? (
                <div style={{maxHeight:120,overflowY:'auto',marginBottom:10}}>
                  {selected.notes.map((n:any)=>(
                    <div key={n.id} style={{borderBottom:'1px solid var(--border)',padding:'8px 0'}}>
                      <div style={{fontSize:12,color:'var(--gray1)',lineHeight:1.5}}>{n.note}</div>
                      <div style={{fontSize:10,color:'var(--gray3)',marginTop:3}}>{n.author} · {new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{fontSize:12,color:'var(--gray3)',marginBottom:10}}>No notes yet</div>}
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} className="input-field" placeholder="Add admin note…" style={{width:'100%',minHeight:60,resize:'vertical',fontSize:12,boxSizing:'border-box'}}/>
              <button onClick={saveNote} disabled={!noteText.trim()||noteLoading} className="btn-neon" style={{marginTop:8,width:'100%',padding:'9px',fontSize:12,opacity:!noteText.trim()||noteLoading?0.5:1}}>
                {noteLoading?'Saving…':'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
