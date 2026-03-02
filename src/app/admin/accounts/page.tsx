'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const STATUS_CFG: Record<string,{color:string;bg:string;border:string;label:string}> = {
  PENDING:{color:'var(--gold)',bg:'rgba(240,192,64,0.12)',border:'rgba(240,192,64,0.3)',label:'Pending'},
  ACTIVE: {color:'var(--green)',bg:'rgba(0,230,118,0.1)',border:'rgba(0,230,118,0.3)',label:'Active'},
  FROZEN: {color:'var(--neon)',bg:'rgba(0,212,255,0.1)',border:'rgba(0,212,255,0.3)',label:'Frozen'},
  CLOSED: {color:'var(--gray3)',bg:'rgba(74,85,128,0.15)',border:'var(--border2)',label:'Closed'},
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts]   = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [selected, setSelected]   = useState<any>(null)
  const [editBrokerId, setEditBrokerId] = useState('')
  const [editMsg, setEditMsg]     = useState('')
  const [provTraderId, setProvTraderId] = useState('')
  const [provPlatformId, setProvPlatformId] = useState('')
  const [provMsg, setProvMsg]     = useState('')
  const [provision, setProvision] = useState(false)
  const [platforms, setPlatforms] = useState<any[]>([])

  const load = useCallback(async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'50' })
    if (search) params.set('search',search)
    if (statusFilter) params.set('status',statusFilter)
    const [accR, platR] = await Promise.all([
      fetch(`/api/admin/accounts?${params}`).then(r=>r.json()).catch(()=>({})),
      fetch('/api/admin/platforms').then(r=>r.json()).catch(()=>({})),
    ])
    setAccounts(accR.accounts||[])
    setTotal(accR.total||0)
    setPlatforms(platR.platforms||[])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { setPage(1); load(1) }, [search, statusFilter])

  const saveEdit = async () => {
    if (!selected) return
    const r = await fetch(`/api/admin/accounts/${selected.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ brokerAccountId: editBrokerId })
    }).then(r=>r.json()).catch(()=>({}))
    if (r.account) {
      setEditMsg('Saved!'); setSelected({...selected,brokerAccountId:editBrokerId})
      setTimeout(()=>setEditMsg(''),2000); load(page)
    } else { setEditMsg('Error: '+r.error) }
  }

  const saveStatus = async (accountId:string, status:string) => {
    await fetch(`/api/admin/accounts/${accountId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ status })
    }).catch(()=>{})
    load(page)
    if (selected?.id===accountId) setSelected((p:any)=>p?{...p,status}:p)
  }

  const provisionAccount = async () => {
    if (!provTraderId || !provPlatformId) return
    const r = await fetch('/api/admin/accounts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ traderId:provTraderId, platformId:provPlatformId, phase:'QUALIFIER' })
    }).then(r=>r.json()).catch(()=>({}))
    if (r.account) { setProvMsg('Account created! Number: '+r.account.accountNumber); setProvision(false); load(page) }
    else { setProvMsg('Error: '+r.error) }
    setTimeout(()=>setProvMsg(''),4000)
  }

  const returnPct = (a:any) => a.currentBalance&&a.openingBalance ? (((a.currentBalance-a.openingBalance)/a.openingBalance)*100).toFixed(2) : null

  return (
    <AdminLayout>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Tournament</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>Trading Accounts</h1>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setProvision(true)} className="btn-neon" style={{padding:'10px 20px',fontSize:13}}>+ Provision Account</button>
          {provMsg&&<div style={{padding:'10px 14px',background:'rgba(0,230,118,0.1)',border:'1px solid rgba(0,230,118,0.2)',borderRadius:8,color:'var(--green)',fontSize:13}}>{provMsg}</div>}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <input className="input-field" placeholder="🔍 Search account, trader, broker ID…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:300,padding:'9px 14px',fontSize:13}}/>
        <select value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="input-field" style={{padding:'9px 14px',fontSize:13}}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={()=>load(page)} className="btn-outline" style={{padding:'9px 16px',fontSize:13}}>↻</button>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--gray3)'}}>{total.toLocaleString()} accounts</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 360px':'1fr',gap:20}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Account #','Broker ID','Trader','Country','Status','Balance','Return','DD%','Trades','Last Sync'].map(h=>(
                  <th key={h} style={{padding:'11px 12px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={10} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</td></tr>
              : accounts.length===0 ? <tr><td colSpan={10} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>No accounts found</td></tr>
              : accounts.map((a:any,i:number)=>{
                const ret = returnPct(a)
                const isSelected = selected?.id===a.id
                const sc = STATUS_CFG[a.status]||STATUS_CFG.PENDING
                return (
                  <tr key={a.id} onClick={()=>{setSelected(isSelected?null:a);setEditBrokerId(a.brokerAccountId||'')}} style={{borderBottom:'1px solid var(--border)',background:isSelected?'rgba(0,212,255,0.06)':i%2===0?'transparent':'rgba(255,255,255,0.01)',cursor:'pointer'}}>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--neon)'}}>{a.accountNumber}</td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>{a.brokerAccountId||'—'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--white)'}}>{a.trader?.displayName}</div>
                      <div style={{fontSize:10,color:'var(--gray3)'}}>{a.trader?.email}</div>
                    </td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'var(--gray2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        {a.trader?.country?.code&&<img src={`https://flagcdn.com/w40/${a.trader.country.code.toLowerCase()}.png`} alt="" style={{width:18,height:12,objectFit:'cover',borderRadius:2}}/>}
                        {a.trader?.country?.code}
                      </div>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.08em',color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:4,padding:'3px 7px'}}>{sc.label}</span>
                    </td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray1)'}}>${Number(a.currentBalance).toLocaleString('en',{minimumFractionDigits:0})}</td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:12,color:ret&&Number(ret)>=0?'var(--green)':'var(--red)'}}>{ret?`${Number(ret)>=0?'+':''}${ret}%`:'—'}</td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:12,color:Number(a.maxDrawdown)>8?'var(--red)':'var(--gray2)'}}>{Number(a?.maxDrawdown||0).toFixed(1)}%</td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray2)'}}>{a.totalTrades}</td>
                    <td style={{padding:'10px 12px',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--gray3)',whiteSpace:'nowrap'}}>{a.lastSyncAt?new Date(a.lastSyncAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Never'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {total>50&&(
            <div style={{display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--border)'}}>
              <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page<=1?0.4:1}}>← Prev</button>
              <span style={{padding:'7px 14px',fontSize:12,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>Page {page} of {Math.ceil(total/50)}</span>
              <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*50>=total} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page*50>=total?0.4:1}}>Next →</button>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected&&(
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,color:'var(--white)'}}>{selected.accountNumber}</div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--gray3)'}}>✕</button>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Broker Account ID</label>
              <div style={{display:'flex',gap:8}}>
                <input className="input-field" value={editBrokerId} onChange={e=>setEditBrokerId(e.target.value)} placeholder="MT5/cTrader account number" style={{flex:1,padding:'9px 12px',fontSize:13}}/>
                <button onClick={saveEdit} className="btn-neon" style={{padding:'9px 14px',fontSize:12}}>Save</button>
              </div>
              {editMsg&&<div style={{fontSize:12,color:'var(--green)',marginTop:6}}>{editMsg}</div>}
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:8}}>Change Status</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {Object.entries(STATUS_CFG).map(([s,c])=>(
                  <button key={s} onClick={()=>saveStatus(selected.id,s)} disabled={selected.status===s} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${c.border}`,background:'transparent',color:c.color,fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.08em',textTransform:'uppercase',cursor:selected.status===s?'not-allowed':'pointer',opacity:selected.status===s?0.4:1}}>{c.label}</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                ['Trader',   selected.trader?.displayName],
                ['Balance',  `$${Number(selected.currentBalance).toLocaleString()}`],
                ['Opening',  `$${Number(selected.openingBalance).toLocaleString()}`],
                ['Trades',   selected.totalTrades],
                ['Win Rate', selected.totalTrades?`${((selected.winningTrades/selected.totalTrades)*100).toFixed(1)}%`:'—'],
                ['Max DD',   `${Number(selected?.maxDrawdown||0).toFixed(2)}%`],
                ['Platform', selected.platform?.name||'—'],
                ['Phase',    selected.phase?.replace(/_/g,' ')],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gray3)'}}>{l}</span>
                  <span style={{fontSize:13,color:'var(--gray1)'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Provision modal */}
      {provision&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
          <div style={{background:'var(--deep)',border:'1px solid var(--border)',borderRadius:16,padding:32,width:440,maxWidth:'95vw'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:'var(--white)',marginBottom:20}}>Provision Trading Account</h2>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Trader ID</label>
              <input className="input-field" value={provTraderId} onChange={e=>setProvTraderId(e.target.value)} placeholder="Trader ID (from Traders page)" style={{width:'100%',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Platform</label>
              <select value={provPlatformId} onChange={e=>setProvPlatformId(e.target.value)} className="input-field" style={{width:'100%'}}>
                <option value="">— select platform —</option>
                {platforms.map((p:any)=><option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setProvision(false)} className="btn-outline" style={{flex:1}}>Cancel</button>
              <button onClick={provisionAccount} disabled={!provTraderId||!provPlatformId} className="btn-neon" style={{flex:1,opacity:!provTraderId||!provPlatformId?0.5:1}}>Create Account</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
