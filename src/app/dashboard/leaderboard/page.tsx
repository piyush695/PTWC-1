'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const flagUrl = (code:string) => `https://flagcdn.com/w40/${code?.toLowerCase()}.png`

export default function LeaderboardPage() {
  const [trader, setTrader]       = useState<any>(null)
  const [entries, setEntries]     = useState<any[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [country, setCountry]     = useState('')
  const [countries, setCountries] = useState<any[]>([])
  const [myTraderId, setMyTraderId] = useState<string|null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/auth/trader-me').then(r=>r.json()).then(d => {
      if (d.user) { setTrader(d.user.trader||d.user); setMyTraderId(d.user.trader?.id||null) }
    }).catch(()=>{})
  }, [])

  const load = async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'50' })
    if (country) params.set('country', country)
    const r = await fetch(`/api/leaderboard?${params}`).then(r=>r.json()).catch(()=>({}))
    setEntries(r.entries||[])
    setTotal(r.total||0)
    if (r.countries) setCountries(r.countries)
    setLoading(false)
  }

  useEffect(() => { setPage(1); load(1) }, [country])

  const medalColor = (rank:number) => rank===1?'#FFD700':rank===2?'#C0C0C0':rank===3?'#CD7F32':'var(--gray3)'

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Tournament</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>Qualifier Leaderboard</h1>
        </div>
        <select value={country} onChange={e=>{setCountry(e.target.value)}} className="input-field" style={{padding:'9px 14px',fontSize:13,minWidth:180}}>
          <option value="">All Countries</option>
          {countries.map((c:any)=><option key={c.code} value={c.code}>{c.flag||''} {c.name}</option>)}
        </select>
      </div>

      {entries.length===0&&!loading ? (
        <div className="card" style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>📊</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--gray3)'}}>No rankings yet — qualifier hasn't started</div>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {!country && page===1 && entries.length>=3 && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:24}}>
              {[entries[1],entries[0],entries[2]].map((e:any,i:number)=>{
                if(!e) return <div key={i}/>
                const pos = i===1?1:i===0?2:3
                const isMe = e.traderId===myTraderId
                return (
                  <div key={e.traderId} className="card" style={{textAlign:'center',padding:'24px 16px',border:`1px solid ${isMe?'rgba(0,212,255,0.3)':'var(--border)'}`,transform:pos===1?'translateY(-8px)':'none',background:isMe?'rgba(0,212,255,0.04)':'var(--surface)'}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:32,color:medalColor(pos),marginBottom:8}}>#{pos}</div>
                    <img src={flagUrl(e.countryCode)} alt="" style={{width:40,height:28,objectFit:'cover',borderRadius:3,marginBottom:10}} onError={ev=>{(ev.target as HTMLElement).style.display='none'}}/>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:isMe?'var(--neon)':'var(--white)',marginBottom:6}}>{e.displayName}{isMe?' (you)':''}</div>
                    <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:20,color:'var(--green)'}}>+{Number(e?.returnPct||0).toFixed(2)}%</div>
                    <div style={{fontSize:11,color:'var(--gray3)',marginTop:4}}>{e.totalTrades} trades · {Number(e?.maxDrawdown||0).toFixed(1)}% DD</div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading ? <div style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</div> : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    {['Rank','Trader','Country','Return %','Max DD','Trades','Status'].map(h=>(
                      <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e:any,i:number)=>{
                    const isMe = e.traderId===myTraderId
                    return (
                      <tr key={e.traderId} style={{borderBottom:'1px solid var(--border)',background:isMe?'rgba(0,212,255,0.06)':i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                        <td style={{padding:'11px 14px',fontFamily:'var(--font-display)',fontWeight:900,fontSize:18,color:medalColor(e.rank),width:56,textAlign:'center'}}>#{e.rank}</td>
                        <td style={{padding:'11px 14px',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:isMe?'var(--neon)':'var(--white)'}}>{e.displayName}{isMe?' ← you':''}</td>
                        <td style={{padding:'11px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <img src={flagUrl(e.countryCode)} alt="" style={{width:20,height:14,objectFit:'cover',borderRadius:2}} onError={ev=>{(ev.target as HTMLElement).style.display='none'}}/>
                            <span style={{fontSize:12,color:'var(--gray2)'}}>{e.countryName||e.countryCode}</span>
                          </div>
                        </td>
                        <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontWeight:700,fontSize:13,color:Number(e.returnPct)>=0?'var(--green)':'var(--red)'}}>+{Number(e?.returnPct||0).toFixed(2)}%</td>
                        <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:13,color:'var(--gray2)'}}>{Number(e?.maxDrawdown||0).toFixed(2)}%</td>
                        <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:13,color:'var(--gray2)'}}>{e.totalTrades}</td>
                        <td style={{padding:'11px 14px'}}>
                          {e.qualified?<span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,color:'var(--green)',background:'rgba(0,230,118,0.08)',border:'1px solid rgba(0,230,118,0.2)',borderRadius:4,padding:'3px 8px'}}>✓ QUALIFIED</span>:<span style={{fontSize:12,color:'var(--gray3)'}}>In Progress</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {total>50&&(
              <div style={{display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--border)'}}>
                <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page<=1?0.4:1}}>← Prev</button>
                <span style={{padding:'7px 14px',fontSize:12,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>Page {page} of {Math.ceil(total/50)}</span>
                <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*50>=total} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page*50>=total?0.4:1}}>Next →</button>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
