'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface KycApplicant {
  id:string; displayName:string; email:string; country:string; flag:string
  traderStatus:string
  kyc:{ status:string; reviewAnswer?:string; reviewRejectType?:string; rejectLabels:string[]; clientComment?:string; reviewComment?:string; docType?:string; docCountry?:string; docFirstName?:string; docLastName?:string; docDob?:string; docNumber?:string; sumsubApplicantId?:string; manualDecision?:string; manualNote?:string; manuallyReviewedBy?:string; manuallyReviewedAt?:string; sdkStartedAt?:string; submittedAt?:string; completedAt?:string; updatedAt?:string } | null
  registeredAt:string
}

const KYC_STATUS: Record<string,{color:string;bg:string;border:string;label:string;icon:string}> = {
  NOT_STARTED:            {color:'var(--gray3)',bg:'rgba(74,85,128,0.15)',border:'var(--border2)',              icon:'○', label:'Not Started'},
  PENDING:                {color:'var(--gold)', bg:'rgba(240,192,64,0.1)',border:'rgba(240,192,64,0.25)',       icon:'⏳',label:'Pending'},
  IN_REVIEW:              {color:'var(--neon)', bg:'rgba(0,212,255,0.1)', border:'rgba(0,212,255,0.25)',        icon:'🔎',label:'In Review'},
  APPROVED:               {color:'var(--green)',bg:'rgba(0,230,118,0.1)', border:'rgba(0,230,118,0.25)',        icon:'✓', label:'Approved'},
  REJECTED:               {color:'var(--red)',  bg:'rgba(255,56,96,0.1)', border:'rgba(255,56,96,0.25)',        icon:'✕', label:'Rejected'},
  RESUBMISSION_REQUESTED: {color:'#ff9800',     bg:'rgba(255,152,0,0.1)', border:'rgba(255,152,0,0.3)',         icon:'↺', label:'Resubmission'},
}

function KycBadge({ status }:{ status:string }) {
  const c = KYC_STATUS[status] || KYC_STATUS.NOT_STARTED
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',padding:'4px 10px',borderRadius:4,color:c.color,background:c.bg,border:`1px solid ${c.border}`}}>{c.icon} {c.label}</span>
}

export default function AdminKYCPage() {
  const [applicants, setApplicants] = useState<KycApplicant[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [selected, setSelected]     = useState<KycApplicant|null>(null)
  const [decisionModal, setDecisionModal] = useState<'APPROVE'|'REJECT'|'REQUEST_RESUBMISSION'|null>(null)
  const [decisionNote, setDecisionNote]   = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionMsg, setDecisionMsg]     = useState('')

  const load = useCallback(async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'50' })
    if (filter) params.set('status', filter)
    if (search) params.set('search', search)
    const r = await fetch(`/api/admin/traders?${params}`).then(r=>r.json()).catch(()=>({}))
    // Map trader data to KycApplicant shape
    const mapped: KycApplicant[] = (r.traders||[]).map((t:any) => ({
      id: t.id,
      displayName: t.displayName || `${t.firstName||''} ${t.lastName||''}`.trim() || t.email,
      email: t.email,
      country: t.country?.name || '—',
      flag: t.country?.flag || '',
      traderStatus: t.status,
      kyc: t.kycRecord ? {
        status: t.kycRecord.status,
        reviewAnswer: t.kycRecord.reviewAnswer,
        reviewRejectType: t.kycRecord.reviewRejectType,
        rejectLabels: t.kycRecord.rejectLabels || [],
        clientComment: t.kycRecord.clientComment,
        reviewComment: t.kycRecord.reviewComment,
        docType: t.kycRecord.docType,
        docCountry: t.kycRecord.docCountry,
        docFirstName: t.kycRecord.docFirstName,
        docLastName: t.kycRecord.docLastName,
        docDob: t.kycRecord.docDob,
        docNumber: t.kycRecord.docNumber,
        sumsubApplicantId: t.kycRecord.sumsubApplicantId,
        manualDecision: t.kycRecord.manualDecision,
        manualNote: t.kycRecord.manualNote,
        submittedAt: t.kycRecord.submittedAt,
        completedAt: t.kycRecord.completedAt,
        updatedAt: t.kycRecord.updatedAt,
      } : null,
      registeredAt: t.createdAt,
    }))
    setApplicants(mapped)
    setTotal(r.total||0)
    setLoading(false)
  }, [filter, search])

  useEffect(() => { setPage(1); load(1) }, [filter, search])

  const counts = {
    all:      total,
    pending:  applicants.filter(a=>['PENDING','IN_REVIEW'].includes(a.kyc?.status||'')).length,
    approved: applicants.filter(a=>a.kyc?.status==='APPROVED').length,
    rejected: applicants.filter(a=>a.kyc?.status==='REJECTED').length,
    resub:    applicants.filter(a=>a.kyc?.status==='RESUBMISSION_REQUESTED').length,
    none:     applicants.filter(a=>!a.kyc||a.kyc.status==='NOT_STARTED').length,
  }

  const submitDecision = async () => {
    if (!selected || !decisionModal) return
    setDecisionLoading(true)
    const r = await fetch(`/api/admin/kyc/${selected.id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ decision: decisionModal, note: decisionNote }),
    }).then(r=>r.json()).catch(()=>({}))
    if (r.success) {
      setDecisionMsg('Decision saved!')
      load(page)
      setTimeout(() => { setDecisionMsg(''); setDecisionModal(null); setDecisionNote('') }, 1500)
    } else {
      setDecisionMsg('Error: ' + (r.error||'Unknown'))
    }
    setDecisionLoading(false)
  }

  const filtered = applicants // Already filtered server-side

  return (
    <AdminLayout>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Compliance</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>KYC Management</h1>
        </div>
        <button onClick={()=>load(page)} style={{padding:'9px 18px',borderRadius:8,border:'1px solid var(--border2)',background:'transparent',color:'var(--gray2)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,cursor:'pointer'}}>↻ Refresh</button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="input-field" placeholder="🔍 Search trader or email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} style={{width:280,padding:'9px 14px',fontSize:13}}/>
        {[
          {val:'',           label:`All (${total})`},
          {val:'PENDING',    label:`Pending (${counts.pending})`},
          {val:'APPROVED',   label:`Approved (${counts.approved})`},
          {val:'REJECTED',   label:`Rejected (${counts.rejected})`},
          {val:'NOT_STARTED',label:`No KYC (${counts.none})`},
        ].map(f=>(
          <button key={f.val} onClick={()=>{setFilter(f.val);setPage(1)}} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${filter===f.val?'rgba(0,212,255,0.4)':'var(--border2)'}`,background:filter===f.val?'rgba(0,212,255,0.08)':'transparent',color:filter===f.val?'var(--neon)':'var(--gray2)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer'}}>{f.label}</button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 380px':'1fr',gap:20}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Trader','Country','Trader Status','KYC Status','Registered','Actions'].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={6} style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>No results</td></tr>
              : filtered.map((a,i)=>(
                <tr key={a.id} style={{borderBottom:'1px solid var(--border)',background:selected?.id===a.id?'rgba(0,212,255,0.06)':i%2===0?'transparent':'rgba(255,255,255,0.01)',cursor:'pointer'}} onClick={()=>setSelected(selected?.id===a.id?null:a)}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{a.displayName}</div>
                    <div style={{fontSize:11,color:'var(--gray3)'}}>{a.email}</div>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:12,color:'var(--gray2)'}}>{a.flag} {a.country}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.08em',color:'var(--gray2)',background:'rgba(255,255,255,0.06)',borderRadius:4,padding:'3px 8px'}}>{a.traderStatus}</span>
                  </td>
                  <td style={{padding:'10px 14px'}}><KycBadge status={a.kyc?.status||'NOT_STARTED'}/></td>
                  <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>{new Date(a.registeredAt).toLocaleDateString('en-GB',{dateStyle:'medium'})}</td>
                  <td style={{padding:'10px 14px'}}>
                    {(a.kyc?.status==='PENDING'||a.kyc?.status==='IN_REVIEW')&&(
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={e=>{e.stopPropagation();setSelected(a);setDecisionModal('APPROVE')}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid rgba(0,230,118,0.3)',background:'rgba(0,230,118,0.08)',color:'var(--green)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer'}}>✓ Approve</button>
                        <button onClick={e=>{e.stopPropagation();setSelected(a);setDecisionModal('REJECT')}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid rgba(255,56,96,0.3)',background:'rgba(255,56,96,0.08)',color:'var(--red)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer'}}>✕ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total>50&&(
            <div style={{display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--border)'}}>
              <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page<=1?0.4:1}}>← Prev</button>
              <span style={{padding:'7px 14px',fontSize:12,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>Page {page} / {Math.ceil(total/50)}</span>
              <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*50>=total} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page*50>=total?0.4:1}}>Next →</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected&&(
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,color:'var(--white)'}}>{selected.displayName}</div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--gray3)'}}>✕</button>
            </div>
            <KycBadge status={selected.kyc?.status||'NOT_STARTED'}/>
            <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
              {selected.kyc&&Object.entries({
                'Sumsub ID':   selected.kyc.sumsubApplicantId?.slice(0,16)+'…'||'—',
                'Doc Type':    selected.kyc.docType?.replace(/_/g,' ')||'—',
                'Doc Country': selected.kyc.docCountry||'—',
                'Name on Doc': selected.kyc.docFirstName&&selected.kyc.docLastName?`${selected.kyc.docFirstName} ${selected.kyc.docLastName}`:'—',
                'Date of Birth':selected.kyc.docDob||'—',
                'Submitted':   selected.kyc.submittedAt?new Date(selected.kyc.submittedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—',
                'Completed':   selected.kyc.completedAt?new Date(selected.kyc.completedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—',
              }).map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gray3)'}}>{l}</span>
                  <span style={{fontSize:12,color:'var(--gray1)'}}>{v}</span>
                </div>
              ))}
              {selected.kyc?.clientComment&&<div style={{marginTop:8,padding:12,background:'rgba(255,152,0,0.06)',border:'1px solid rgba(255,152,0,0.2)',borderRadius:8,fontSize:12,color:'#ff9800',lineHeight:1.6}}>{selected.kyc.clientComment}</div>}
            </div>
            {(selected.kyc?.status==='PENDING'||selected.kyc?.status==='IN_REVIEW')&&(
              <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={()=>setDecisionModal('APPROVE')} style={{padding:'10px',borderRadius:8,border:'1px solid rgba(0,230,118,0.3)',background:'rgba(0,230,118,0.08)',color:'var(--green)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,cursor:'pointer'}}>✓ Approve</button>
                <button onClick={()=>setDecisionModal('REJECT')} style={{padding:'10px',borderRadius:8,border:'1px solid rgba(255,56,96,0.3)',background:'rgba(255,56,96,0.08)',color:'var(--red)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,cursor:'pointer'}}>✕ Reject</button>
                <button onClick={()=>setDecisionModal('REQUEST_RESUBMISSION')} style={{padding:'10px',borderRadius:8,border:'1px solid rgba(255,152,0,0.3)',background:'rgba(255,152,0,0.06)',color:'#ff9800',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,cursor:'pointer'}}>↺ Request Resubmission</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision modal */}
      {decisionModal&&selected&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
          <div style={{background:'var(--deep)',border:'1px solid var(--border)',borderRadius:16,padding:32,width:440,maxWidth:'95vw',position:'relative'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:'var(--white)',marginBottom:6}}>{decisionModal==='APPROVE'?'Approve KYC':decisionModal==='REJECT'?'Reject KYC':'Request Resubmission'}</h2>
            <p style={{fontSize:13,color:'var(--gray3)',marginBottom:20}}>For: <strong style={{color:'var(--white)'}}>{selected.displayName}</strong></p>
            <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Admin Note (optional)</label>
            <textarea value={decisionNote} onChange={e=>setDecisionNote(e.target.value)} rows={3} className="input-field" style={{width:'100%',boxSizing:'border-box',resize:'vertical',marginBottom:16}} placeholder={decisionModal==='REJECT'?'Reason for rejection…':decisionModal==='REQUEST_RESUBMISSION'?'What needs resubmitting…':'Notes…'}/>
            {decisionMsg&&<div style={{marginBottom:12,fontSize:13,color:decisionMsg.startsWith('Error')?'var(--red)':'var(--green)'}}>{decisionMsg}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setDecisionModal(null);setDecisionNote('')}} className="btn-outline" style={{flex:1}}>Cancel</button>
              <button onClick={submitDecision} disabled={decisionLoading} className="btn-neon" style={{flex:1,opacity:decisionLoading?0.7:1}}>{decisionLoading?'Saving…':'Confirm'}</button>
            </div>
            <button onClick={()=>{setDecisionModal(null);setDecisionNote('')}} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'var(--gray3)',fontSize:18,cursor:'pointer'}}>✕</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
