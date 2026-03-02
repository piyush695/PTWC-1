'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const flagUrl = (code:string) => `https://flagcdn.com/w40/${code?.toLowerCase()}.png`
const PHASE_LABEL: Record<string,string> = { QUALIFIER:'Open Qualifier', ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16', QUARTERFINAL:'Quarterfinals', SEMIFINAL:'Semifinals', GRAND_FINAL:'Grand Final' }

export default function BracketPage() {
  const [trader, setTrader]   = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [traderId, setTraderId] = useState<string|null>(null)
  const [config, setConfig]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/trader-me').then(r=>r.json()).catch(()=>({})),
      fetch('/api/trader/bracket').then(r=>r.json()).catch(()=>({})),
    ]).then(([me, br]) => {
      if (me.user) setTrader(me.user.trader||me.user)
      if (br.matches) setMatches(br.matches)
      if (br.traderId) setTraderId(br.traderId)
      if (br.config)  setConfig(br.config)
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [])

  const statusCfg: Record<string,{color:string;bg:string;label:string}> = {
    SCHEDULED: {color:'var(--gold)',  bg:'rgba(240,192,64,0.1)',  label:'UPCOMING'},
    ACTIVE:    {color:'var(--neon)',  bg:'rgba(0,212,255,0.1)',   label:'ACTIVE'},
    COMPLETED: {color:'var(--green)', bg:'rgba(0,230,118,0.1)',   label:'COMPLETED'},
    WALKOVER:  {color:'var(--gray3)', bg:'rgba(74,85,128,0.15)',  label:'WALKOVER'},
    DISPUTED:  {color:'var(--red)',   bg:'rgba(255,56,96,0.1)',   label:'DISPUTED'},
  }

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Tournament</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>My Bracket</h1>
      </div>

      {loading ? (
        <div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>Loading…</div>
      ) : matches.length === 0 ? (
        <div className="card" style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>🏆</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,color:'var(--white)',marginBottom:8}}>No Bracket Matches Yet</div>
          <div style={{fontSize:14,color:'var(--gray3)',lineHeight:1.7}}>
            Head-to-head bracket matches are drawn after the Qualifier phase ends.<br/>
            Keep trading to secure your qualifying rank.
          </div>
          {config && (
            <div style={{marginTop:20,padding:'14px 20px',background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:10,display:'inline-block'}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--neon)'}}>Current Phase: {PHASE_LABEL[config.currentPhase]||config.currentPhase}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {matches.map((match:any) => {
            const isT1   = match.trader1Id === traderId
            const me     = isT1 ? match.trader1 : match.trader2
            const opp    = isT1 ? match.trader2 : match.trader1
            const myRet  = isT1 ? match.trader1ReturnPct : match.trader2ReturnPct
            const oppRet = isT1 ? match.trader2ReturnPct : match.trader1ReturnPct
            const won    = match.winnerId === traderId
            const lost   = match.winnerId && match.winnerId !== traderId
            const cfg    = statusCfg[match.status] || statusCfg.SCHEDULED
            return (
              <div key={match.id} className="card" style={{border:match.status==='ACTIVE'?'1px solid rgba(0,212,255,0.3)':'1px solid var(--border)',position:'relative',overflow:'hidden'}}>
                {match.status==='ACTIVE'&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,var(--neon),transparent)'}}/>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {match.status==='ACTIVE'&&<span className="live-dot"/>}
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{PHASE_LABEL[match.phase]||match.phase}</span>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>
                      {match.startTime?new Date(match.startTime).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'TBD'}
                      {match.endTime?' – '+new Date(match.endTime).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}
                    </span>
                  </div>
                  <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.08em',color:cfg.color,background:cfg.bg,borderRadius:4,padding:'4px 10px'}}>{cfg.label}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center'}}>
                  {/* Me */}
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:'var(--neon)',marginBottom:6}}>{me?.displayName||'You'}</div>
                    {me?.country?.code&&<img src={flagUrl(me.country.code)} alt="" style={{width:32,height:22,objectFit:'cover',borderRadius:3,marginBottom:8}}/>}
                    {myRet!=null&&<div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:22,color:Number(myRet)>=0?'var(--green)':'var(--red)'}}>{Number(myRet)>=0?'+':''}{Number(myRet).toFixed(2)}%</div>}
                    {won&&<div style={{marginTop:8,fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--gold)'}}>🏆 WINNER</div>}
                  </div>
                  {/* VS */}
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:28,color:'var(--gray3)',letterSpacing:'0.1em'}}>VS</div>
                  </div>
                  {/* Opponent */}
                  <div style={{textAlign:'center'}}>
                    {opp ? (
                      <>
                        <div style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:20,color:lost?'var(--gold)':'var(--white)',marginBottom:6}}>{opp.displayName}</div>
                        {opp.country?.code&&<img src={flagUrl(opp.country.code)} alt="" style={{width:32,height:22,objectFit:'cover',borderRadius:3,marginBottom:8}}/>}
                        {oppRet!=null&&<div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:22,color:Number(oppRet)>=0?'var(--green)':'var(--red)'}}>{Number(oppRet)>=0?'+':''}{Number(oppRet).toFixed(2)}%</div>}
                        {lost&&<div style={{marginTop:8,fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--gold)'}}>🏆 WINNER</div>}
                      </>
                    ) : (
                      <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,color:'var(--gray3)'}}>TBD</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
