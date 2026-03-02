'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function TradesPage() {
  const [trader, setTrader]   = useState<any>(null)
  const [trades, setTrades]   = useState<any[]>([])
  const [stats, setStats]     = useState<any>(null)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [filter, setFilter]   = useState('ALL')
  const [symbol, setSymbol]   = useState('ALL')
  const [symbols, setSymbols] = useState<string[]>(['ALL'])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p=1) => {
    setLoading(true)
    const params = new URLSearchParams({ page:String(p), limit:'20' })
    if (filter === 'OPEN')   params.set('status','OPEN')
    if (filter === 'CLOSED') params.set('status','CLOSED')
    if (symbol !== 'ALL')    params.set('symbol',symbol)
    const [meR, trR] = await Promise.all([
      fetch('/api/auth/trader-me').then(r=>r.json()).catch(()=>({})),
      fetch(`/api/trader/trades?${params}`).then(r=>r.json()).catch(()=>({})),
    ])
    if (meR.user) setTrader(meR.user.trader||meR.user)
    if (trR.trades) {
      setTrades(trR.trades)
      setTotal(trR.total||0)
      setStats(trR.stats)
      const syms = Array.from(new Set(trR.trades.map((t:any)=>t.symbol))) as string[]
      setSymbols(prev => Array.from(new Set(['ALL',...prev,...syms])))
    }
    setLoading(false)
  }, [filter, symbol])

  useEffect(() => { setPage(1); load(1) }, [filter, symbol])

  const s = stats || {}

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>My Trading</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>Trade History</h1>
      </div>

      {/* Stats strip */}
      {s.totalClosed > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'Closed Trades', value:s.totalClosed,  color:'var(--white)'},
            {label:'Win Rate',      value:`${s.winRate}%`, color:'var(--neon)'},
            {label:'Total P&L',     value:`${s.totalPnl>=0?'+':''}$${Number(s.totalPnl).toFixed(2)}`, color:s.totalPnl>=0?'var(--green)':'var(--red)'},
            {label:'Wins / Losses', value:`${s.wins} / ${s.losses}`, color:'var(--gray1)'},
          ].map(st=>(
            <div key={st.label} className="card" style={{padding:'16px 18px'}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:8}}>{st.label}</div>
              <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:24,color:st.color,lineHeight:1}}>{st.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {['ALL','OPEN','CLOSED','WIN','LOSS'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',padding:'7px 14px',borderRadius:8,border:`1px solid ${filter===f?'rgba(0,212,255,0.4)':'var(--border2)'}`,background:filter===f?'rgba(0,212,255,0.08)':'transparent',color:filter===f?'var(--neon)':'var(--gray2)',cursor:'pointer'}}>
            {f}
          </button>
        ))}
        <select value={symbol} onChange={e=>setSymbol(e.target.value)} className="input-field" style={{padding:'7px 12px',fontSize:12,marginLeft:'auto'}}>
          {symbols.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading trades…</div>
        ) : trades.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>
            <div style={{fontSize:32,marginBottom:12}}>📊</div>
            No trades found{filter!=='ALL'?` for filter "${filter}"`:''}. Trades will appear here once your account is active.
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Symbol','Dir','Lots','Open Price','Close Price','Open Time','Close Time','P&L'].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((tr:any,i:number)=>{
                const pnl = tr.profit != null ? Number(tr.profit) : null
                return (
                  <tr key={tr.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{tr.symbol}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,color:tr.direction==='BUY'?'var(--green)':'var(--red)',background:tr.direction==='BUY'?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)',borderRadius:4,padding:'2px 8px'}}>{tr.direction}</span>
                    </td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray2)'}}>{tr.lots}</td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray3)'}}>{Number(tr.openPrice).toFixed(5)}</td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray3)'}}>{tr.closePrice?Number(tr.closePrice).toFixed(5):<span style={{color:'var(--neon)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11}}>OPEN</span>}</td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)',whiteSpace:'nowrap'}}>{new Date(tr.openTime).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}</td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)',whiteSpace:'nowrap'}}>{tr.closeTime?new Date(tr.closeTime).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'}):'—'}</td>
                    <td style={{padding:'10px 14px',fontFamily:'var(--font-mono)',fontWeight:700,fontSize:13,color:pnl==null?'var(--gray3)':pnl>=0?'var(--green)':'var(--red)'}}>
                      {pnl==null?'—':`${pnl>=0?'+':''}$${Math.abs(pnl).toFixed(2)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {total > 20 && (
          <div style={{display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--border)'}}>
            <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);load(p)}} disabled={page<=1} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page<=1?0.4:1}}>← Prev</button>
            <span style={{padding:'7px 14px',fontSize:12,color:'var(--gray3)',fontFamily:'var(--font-display)'}}>Page {page} of {Math.ceil(total/20)}</span>
            <button onClick={()=>{const p=page+1;setPage(p);load(p)}} disabled={page*20>=total} className="btn-outline" style={{padding:'7px 14px',fontSize:12,opacity:page*20>=total?0.4:1}}>Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
