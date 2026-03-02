'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import nextDynamic from 'next/dynamic'

const SumsubWidget = nextDynamic(() => import('@/components/kyc/SumsubWidget'), { ssr: false })

const KYC_STATUS_CFG: Record<string,{label:string;color:string;bg:string;border:string;icon:string}> = {
  NOT_STARTED:            {label:'Not Started',          color:'var(--gray3)', bg:'rgba(74,85,128,0.15)', border:'var(--border2)',             icon:'○'},
  PENDING:                {label:'Submission Pending',   color:'var(--gold)',  bg:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)',      icon:'⏳'},
  IN_REVIEW:              {label:'Under Review',         color:'var(--neon)',  bg:'rgba(0,212,255,0.1)',  border:'rgba(0,212,255,0.25)',       icon:'🔎'},
  APPROVED:               {label:'Verified ✓',           color:'var(--green)', bg:'rgba(0,230,118,0.1)',  border:'rgba(0,230,118,0.3)',        icon:'✓'},
  REJECTED:               {label:'Rejected',             color:'var(--red)',   bg:'rgba(255,56,96,0.1)',  border:'rgba(255,56,96,0.25)',       icon:'✕'},
  RESUBMISSION_REQUESTED: {label:'Resubmission Needed',  color:'#ff9800',     bg:'rgba(255,152,0,0.1)',  border:'rgba(255,152,0,0.3)',        icon:'↺'},
}

export default function KYCPage() {
  const [trader, setTrader]   = useState<any>(null)
  const [kyc, setKyc]         = useState<any>(null)
  const [token, setToken]     = useState<string|null>(null)
  const [showWidget, setShowWidget] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/trader-me').then(r=>r.json()).catch(()=>({})),
      fetch('/api/kyc/status').then(r=>r.json()).catch(()=>({})),
    ]).then(([me, kycR]) => {
      if (me.user) setTrader(me.user.trader||me.user)
      if (kycR.kyc) setKyc(kycR.kyc)
      setLoading(false)
    })
  }, [])

  const startKyc = async () => {
    setTokenLoading(true)
    const r = await fetch('/api/kyc/token', { method:'POST' }).then(r=>r.json()).catch(()=>({}))
    if (r.token) { setToken(r.token); setShowWidget(true) }
    setTokenLoading(false)
  }

  const onKycComplete = () => {
    setShowWidget(false)
    // Reload KYC status
    fetch('/api/kyc/status').then(r=>r.json()).then(d=>{ if(d.kyc) setKyc(d.kyc) })
  }

  if (loading) return <DashboardLayout trader={{}}><div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>Loading…</div></DashboardLayout>

  const kycStatus = kyc?.status || 'NOT_STARTED'
  const cfg = KYC_STATUS_CFG[kycStatus] || KYC_STATUS_CFG.NOT_STARTED
  const canStart = ['NOT_STARTED','REJECTED','RESUBMISSION_REQUESTED'].includes(kycStatus)

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Verification</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>KYC Verification</h1>
      </div>

      {/* Status card */}
      <div className="card" style={{marginBottom:20,border:`1px solid ${cfg.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:56,height:56,borderRadius:12,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{cfg.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:4}}>KYC Status</div>
            <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:cfg.color}}>{cfg.label}</div>
            {kyc?.clientComment&&<div style={{fontSize:13,color:'var(--gold)',marginTop:6,lineHeight:1.6}}>{kyc.clientComment}</div>}
            {kyc?.rejectLabels?.length>0&&<div style={{fontSize:12,color:'var(--red)',marginTop:4}}>{kyc.rejectLabels.join(', ')}</div>}
          </div>
          {canStart&&(
            <button onClick={startKyc} disabled={tokenLoading} style={{padding:'12px 24px',borderRadius:10,border:'none',background:'var(--neon)',color:'var(--black)',fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,letterSpacing:'0.08em',cursor:tokenLoading?'not-allowed':'pointer',opacity:tokenLoading?0.7:1,flexShrink:0}}>
              {tokenLoading?'Loading…':kycStatus==='NOT_STARTED'?'Start Verification':'Retry Verification'}
            </button>
          )}
          {kycStatus==='IN_REVIEW'&&<div style={{padding:'12px 20px',background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:10,fontSize:13,color:'var(--neon)',textAlign:'center'}}>Review in progress.<br/>Usually 24-48 hours.</div>}
        </div>
      </div>

      {/* Sumsub widget */}
      {showWidget && token && (
        <div className="card" style={{marginBottom:20}}>
          <SumsubWidget accessToken={token} onComplete={onKycComplete} />
        </div>
      )}

      {/* Approved details */}
      {kycStatus==='APPROVED'&&kyc&&(
        <div className="card" style={{marginBottom:20,border:'1px solid rgba(0,230,118,0.2)'}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:16}}>Verified Document</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {[
              ['Document Type', kyc.docType?.replace(/_/g,' ')||'—'],
              ['Country',       kyc.docCountry||'—'],
              ['Full Name',     kyc.docFirstName&&kyc.docLastName?`${kyc.docFirstName} ${kyc.docLastName}`:'—'],
              ['Date of Birth', kyc.docDob||'—'],
              ['Verified At',   kyc.completedAt?new Date(kyc.completedAt).toLocaleDateString('en-GB',{dateStyle:'medium'}):'—'],
              ['Sumsub ID',     kyc.sumsubApplicantId?.slice(0,12)+'…'||'—'],
            ].map(([l,v])=>(
              <div key={l} style={{padding:'12px 16px',background:'rgba(0,230,118,0.03)',border:'1px solid rgba(0,230,118,0.1)',borderRadius:8}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:4}}>{l}</div>
                <div style={{fontSize:13,color:'var(--gray1)'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {kycStatus==='NOT_STARTED'&&(
        <div className="card">
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:16}}>What You'll Need</div>
          {[
            {icon:'🪪', label:'Government-issued photo ID', desc:'Passport, national ID card, or driving license'},
            {icon:'🤳', label:'Selfie verification',        desc:'Quick selfie to match your face with your ID'},
            {icon:'📶', label:'Stable internet connection', desc:'The process takes about 3–5 minutes'},
          ].map(step=>(
            <div key={step.label} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:24,flexShrink:0}}>{step.icon}</span>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)',marginBottom:3}}>{step.label}</div>
                <div style={{fontSize:12,color:'var(--gray3)'}}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
