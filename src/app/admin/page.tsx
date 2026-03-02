'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/page.tsx — Real-data admin dashboard
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'

function MiniBarChart({ data }: { data: { day: string; count: number }[] }) {
  if (!data?.length) return <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray3)',fontSize:12}}>No data</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
      {data.map((d, i) => (
        <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
          <div style={{ width:'100%', borderRadius:4, height:`${(d.count/max)*70}px`, background:i===data.length-1?'linear-gradient(to top,var(--neon),rgba(0,212,255,0.4))':'rgba(0,212,255,0.15)', boxShadow:i===data.length-1?'0 0 8px rgba(0,212,255,0.4)':'none', transition:'height 0.3s ease', minHeight:4 }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--gray3)' }}>{d.day?.slice(5) || d.day}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [time, setTime]   = useState(new Date())
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch('/api/admin/stats').then(r=>r.json()).then(d=>{setStats(d);setLoading(false)}).catch(()=>setLoading(false))
  }, [])

  const s = stats || {}
  const traders = s.traders || {}

  const STAT_CARDS = [
    {label:'Total Registered',  value:traders.total??'—',          delta:`+${traders.todayNew??0} today`,    color:'var(--neon)',  href:'/admin/traders'},
    {label:'KYC Pending',       value:traders.kycPending??'—',      delta:'Requires review',                   color:'var(--gold)', href:'/admin/kyc'},
    {label:'Active Traders',    value:traders.active??'—',          delta:`+${traders.weekNew??0} this week`, color:'var(--green)',href:'/admin/traders?status=ACTIVE'},
    {label:'Countries Filled',  value:s.countries?.withTraders??'—',delta:'of 32 available',                  color:'var(--neon)', href:'/admin/traders'},
    {label:'Disqualified',      value:traders.disqualified??'—',    delta:'View violations',                  color:'var(--red)',  href:'/admin/tournament'},
    {label:'Revenue Collected', value:s.payments?.count?`$${Number(s.payments.revenue).toFixed(0)}`:'$0', delta:`${s.payments?.count??0} payments`, color:'var(--gold)', href:'/admin/payment'},
    {label:'Emails Sent Today', value:s.email?.today??'—',          delta:'All campaigns',                    color:'var(--gold)', href:'/admin/crm'},
    {label:'Active Accounts',   value:s.accounts?.active??'—',      delta:`of ${s.accounts?.total??0} total`, color:'var(--neon)', href:'/admin/accounts'},
  ]

  const QUICK_ACTIONS = [
    {label:'Review KYC Queue',  icon:'🪪', color:'var(--green)', href:'/admin/kyc',         desc:`${traders.kycPending??0} pending`},
    {label:'Send Bulk Email',   icon:'✉',  color:'var(--neon)',  href:'/admin/crm',          desc:`${traders.active??0} active traders`},
    {label:'Manage Brackets',   icon:'◈',  color:'var(--gold)', href:'/admin/bracket',      desc:'After qualifier ends'},
    {label:'Tournament Config', icon:'⚙',  color:'var(--gray2)',href:'/admin/config',        desc:'Rules & dates'},
    {label:'View Violations',   icon:'✕',  color:'var(--red)',  href:'/admin/tournament',   desc:`${traders.disqualified??0} disqualified`},
    {label:'Audit Logs',        icon:'◎',  color:'var(--gray2)',href:'/admin/logs',          desc:'Full activity trail'},
  ]

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>Operations</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'var(--white)', lineHeight:1, margin:0 }}>Admin Dashboard</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10 }}>
          <span className="live-dot" />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--neon)' }}>{time.toLocaleTimeString('en-GB')}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)' }}>{time.toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:28 }}>
        {STAT_CARDS.map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration:'none' }}>
            <div className="card" style={{ padding:'18px 20px', transition:'border-color 0.2s', cursor:'pointer' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor='rgba(0,212,255,0.3)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}
            >
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color:s.color, lineHeight:1 }}>
                {loading ? '…' : s.value.toLocaleString?.() ?? s.value}
              </div>
              <div style={{ fontSize:12, color:'var(--gray3)', marginTop:6 }}>{s.delta}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
        {/* Registrations chart */}
        <div className="card">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:16 }}>Registrations — Last 7 Days</div>
          {loading ? (
            <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray3)',fontSize:12}}>Loading…</div>
          ) : (
            <MiniBarChart data={s.regByDay || []} />
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:14 }}>Quick Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {QUICK_ACTIONS.map(a => (
              <Link key={a.label} href={a.href} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:8, textDecoration:'none', transition:'all 0.15s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
              >
                <span style={{ fontSize:16 }}>{a.icon}</span>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:a.color, letterSpacing:'0.04em' }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'var(--gray3)' }}>{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gray3)' }}>Recent Activity</div>
          <Link href="/admin/logs" style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--neon)', textDecoration:'none', letterSpacing:'0.08em' }}>View All →</Link>
        </div>
        {loading ? (
          <div style={{padding:24,textAlign:'center',color:'var(--gray3)',fontSize:12}}>Loading…</div>
        ) : s.recentActivity?.length ? (
          s.recentActivity.slice(0,8).map((log:any) => (
            <div key={log.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', whiteSpace:'nowrap', minWidth:90 }}>
                {new Date(log.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
              </div>
              <div style={{ flex:1 }}>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--neon)', letterSpacing:'0.06em' }}>{log.action}</span>
                {log.details && <span style={{ fontSize:12, color:'var(--gray2)', marginLeft:8 }}>— {log.details}</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--gray3)' }}>{log.email}</div>
            </div>
          ))
        ) : (
          <div style={{padding:24,textAlign:'center',color:'var(--gray3)',fontSize:12}}>No activity yet</div>
        )}
      </div>
    </AdminLayout>
  )
}
