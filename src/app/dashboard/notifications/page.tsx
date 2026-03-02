'use client'
export const dynamic = 'force-dynamic'
// src/app/dashboard/notifications/page.tsx — real API
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const iconMap: Record<string,string> = { WARNING:'⚠', SUCCESS:'✓', INFO:'ℹ', ERROR:'✕' }
const colorMap: Record<string,string> = { WARNING:'var(--gold)', SUCCESS:'var(--green)', INFO:'var(--neon)', ERROR:'var(--red)' }

export default function NotificationsPage() {
  const [trader, setTrader]   = useState<any>(null)
  const [notifs, setNotifs]   = useState<any[]>([])
  const [unread, setUnread]   = useState(0)
  const [filter, setFilter]   = useState('ALL')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [meR, notifR] = await Promise.all([
      fetch('/api/auth/me').then(r=>r.json()).catch(()=>({})),
      fetch('/api/notifications').then(r=>r.json()).catch(()=>({notifications:[],unreadCount:0})),
    ])
    if (meR.user) setTrader(meR.user.trader || meR.user)
    setNotifs(notifR.notifications || [])
    setUnread(notifR.unreadCount || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) })
    setNotifs(p => p.map(n => n.id===id ? {...n,isRead:true} : n))
    setUnread(u => Math.max(0,u-1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({markAllRead:true}) })
    setNotifs(p => p.map(n=>({...n,isRead:true})))
    setUnread(0)
  }

  const categories = ['ALL', ...Array.from(new Set(notifs.map(n=>n.category)))]
  const filtered = notifs.filter(n => filter==='ALL' || n.category===filter)

  if (loading) return <DashboardLayout trader={{}}><div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>Loading…</div></DashboardLayout>

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Inbox</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>
            Notifications
            {unread>0&&<span style={{background:'var(--red)',color:'var(--white)',fontFamily:'var(--font-display)',fontWeight:900,fontSize:14,borderRadius:100,padding:'2px 10px',marginLeft:12,verticalAlign:'middle'}}>{unread}</span>}
          </h1>
        </div>
        <div style={{display:'flex',gap:10}}>
          {unread>0&&<button onClick={markAllRead} style={{padding:'9px 18px',borderRadius:8,border:'1px solid rgba(0,212,255,0.3)',background:'rgba(0,212,255,0.06)',color:'var(--neon)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,letterSpacing:'0.08em',cursor:'pointer'}}>Mark All Read</button>}
          <button onClick={load} style={{padding:'9px 18px',borderRadius:8,border:'1px solid var(--border2)',background:'transparent',color:'var(--gray2)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,cursor:'pointer'}}>↻ Refresh</button>
        </div>
      </div>

      {/* Category filters */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {categories.map(cat=>(
          <button key={cat} onClick={()=>setFilter(cat)} style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',padding:'7px 14px',borderRadius:8,border:`1px solid ${filter===cat?'rgba(0,212,255,0.4)':'var(--border2)'}`,background:filter===cat?'rgba(0,212,255,0.08)':'transparent',color:filter===cat?'var(--neon)':'var(--gray2)',cursor:'pointer'}}>
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>📭</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--gray3)'}}>No notifications</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(n=>(
            <div key={n.id} onClick={()=>!n.isRead&&markRead(n.id)} className="card" style={{display:'flex',alignItems:'flex-start',gap:16,padding:'18px 20px',cursor:n.isRead?'default':'pointer',background:n.isRead?'transparent':'rgba(0,212,255,0.03)',borderColor:n.isRead?'var(--border)':'rgba(0,212,255,0.15)',transition:'all 0.15s'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:`rgba(${n.type==='WARNING'?'240,192,64':n.type==='SUCCESS'?'0,230,118':n.type==='ERROR'?'255,56,96':'0,212,255'},0.1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,color:colorMap[n.type]||'var(--neon)'}}>
                {iconMap[n.type]||'ℹ'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                  <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:n.isRead?'var(--gray1)':'var(--white)'}}>{n.title}</div>
                  {!n.isRead&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--neon)',flexShrink:0}}/>}
                </div>
                <div style={{fontSize:13,color:'var(--gray2)',lineHeight:1.6}}>{n.body}</div>
                <div style={{fontSize:11,color:'var(--gray3)',marginTop:6}}>{new Date(n.createdAt).toLocaleDateString('en-GB',{dateStyle:'medium'})} · {n.category}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
