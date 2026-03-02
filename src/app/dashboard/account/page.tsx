'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

function Bar({ value, max, color }: { value:number; max:number; color:string }) {
  const pct = Math.min(100, (value/max)*100)
  return (
    <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden', marginTop:6 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:pct>75?'var(--red)':color, borderRadius:3, transition:'width 0.6s ease' }} />
    </div>
  )
}

export default function AccountPage() {
  const [trader, setTrader]   = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/trader-me').then(r=>r.json()),
      fetch('/api/trader/account').then(r=>r.json()),
    ]).then(([me, acc]) => {
      if (me.user) setTrader(me.user.trader || me.user)
      if (acc.account) setAccount(acc.account)
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [])

  if (loading) return <DashboardLayout trader={{}}><div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>Loading…</div></DashboardLayout>

  const a = account || {}
  const returnPct  = a.currentBalance && a.openingBalance ? (((a.currentBalance - a.openingBalance) / a.openingBalance)*100) : 0
  const profit     = a.currentBalance && a.openingBalance ? (a.currentBalance - a.openingBalance) : 0
  const maxDD      = parseFloat(a.maxDrawdown||'0')
  const winRate    = a.totalTrades ? ((a.winningTrades/a.totalTrades)*100).toFixed(1) : '0'
  const avgWin     = a.winningTrades ? (profit / a.winningTrades).toFixed(2) : '0'
  const avgLoss    = a.losingTrades  ? (Math.abs(profit) / a.losingTrades).toFixed(2) : '0'

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Trading Account</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>Account Overview</h1>
      </div>

      {!a.accountNumber ? (
        <div className="card" style={{padding:40,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>⏳</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--gold)',marginBottom:8}}>Account Being Provisioned</div>
          <div style={{fontSize:13,color:'var(--gray3)'}}>Your trading account will be ready within 24 hours after KYC approval. You'll receive an email with your login credentials.</div>
        </div>
      ) : (
        <>
          {/* Account bar */}
          <div style={{background:'var(--surface)',border:'1px solid rgba(0,212,255,0.2)',borderRadius:14,padding:'24px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,var(--neon),transparent)'}}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:0}}>
              {[
                {label:'Account Number', value:a.accountNumber,     mono:true},
                {label:'Server',         value:a.platform?.serverName||a.platform?.name||'—', mono:true},
                {label:'Currency',       value:'USD',               mono:false},
                {label:'Leverage',       value:`1:${a.platform?.defaultLeverage||30}`, mono:true},
                {label:'Status',         value:a.status||'ACTIVE',  color:a.status==='ACTIVE'?'var(--green)':'var(--gold)'},
              ].map((item,i)=>(
                <div key={item.label} style={{flex:1,minWidth:120,padding:'0 20px',borderRight:i<4?'1px solid var(--border)':'none',marginBottom:8}}>
                  <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:6}}>{item.label}</div>
                  <div style={{fontFamily:item.mono?'var(--font-mono)':'var(--font-display)',fontWeight:item.color?800:700,fontSize:14,color:item.color||'var(--gray1)'}}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Balance',     value:`$${Number(a.currentBalance).toLocaleString('en',{minimumFractionDigits:2})}`, color:'var(--white)',  top:'var(--neon)'},
              {label:'Equity',      value:`$${Number(a.currentEquity||a.currentBalance).toLocaleString('en',{minimumFractionDigits:2})}`, color:'var(--white)', top:'var(--gray3)'},
              {label:'Net Profit',  value:`${profit>=0?'+':''}$${Math.abs(profit).toFixed(2)}`, color:profit>=0?'var(--green)':'var(--red)', top:profit>=0?'var(--green)':'var(--red)'},
              {label:'Net Return',  value:`${returnPct>=0?'+':''}${returnPct.toFixed(2)}%`, color:returnPct>=0?'var(--green)':'var(--red)', top:returnPct>=0?'var(--green)':'var(--red)'},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.top}}/>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:10}}>{s.label}</div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:s.color,lineHeight:1}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Risk + Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            <div className="card">
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:14}}>Drawdown Limits</div>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--gray1)',marginBottom:4}}>
                  <span>Max Drawdown</span><span style={{fontFamily:'var(--font-mono)',color:maxDD>8?'var(--red)':'var(--green)'}}>{maxDD.toFixed(2)}% / 12%</span>
                </div>
                <Bar value={maxDD} max={12} color="var(--neon)" />
              </div>
              <div style={{fontSize:12,color:'var(--gray3)',lineHeight:1.6}}>
                Daily limit: 8% · Total limit: 12%<br/>
                Exceeding either triggers automatic disqualification.
              </div>
            </div>
            <div className="card">
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:14}}>Trade Statistics</div>
              {[
                ['Total Trades',   a.totalTrades ?? '—'],
                ['Win Rate',       `${winRate}%`],
                ['Winning Trades', a.winningTrades ?? '—'],
                ['Losing Trades',  a.losingTrades  ?? '—'],
                ['Total Volume',   a.totalVolumeLots ? `${Number(a.totalVolumeLots).toFixed(2)} lots` : '—'],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:13,color:'var(--gray3)'}}>{l}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--gray1)',fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
