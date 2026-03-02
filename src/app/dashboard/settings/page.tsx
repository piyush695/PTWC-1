'use client'
export const dynamic = 'force-dynamic'
// src/app/dashboard/settings/page.tsx — connected to real API
import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function SettingsPage() {
  const [trader, setTrader]           = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('profile')
  const [saved, setSaved]             = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError]             = useState('')

  // Profile form
  const [profile, setProfile]         = useState({ firstName:'', lastName:'', displayName:'', phone:'', dateOfBirth:'' })
  // Notification settings
  const [notifs, setNotifs]           = useState({ emailTrades:true, emailRankChange:true, emailMatchStart:true, emailDrawdown:true })
  // Security
  const [security, setSecurity]       = useState({ currentPw:'', newPw:'', confirmPw:'' })
  const [showPw, setShowPw]           = useState(false)
  const [pwStrength, setPwStrength]   = useState(0)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d => {
      if (d.user) {
        setTrader(d.user.trader || d.user)
        setProfile({
          firstName:   d.user.trader?.firstName || d.user.firstName || '',
          lastName:    d.user.trader?.lastName  || d.user.lastName  || '',
          displayName: d.user.trader?.displayName || '',
          phone:       d.user.trader?.phone || d.user.phone || '',
          dateOfBirth: d.user.trader?.dateOfBirth ? d.user.trader.dateOfBirth.split('T')[0] : '',
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const calcStrength = (pw: string) => {
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }

  const saveProfile = async () => {
    setSaveLoading(true); setError('')
    const r = await fetch('/api/auth/me', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(profile)
    }).catch(()=>null)
    if (r?.ok) {
      setSaved('Profile saved!'); setTimeout(() => setSaved(''), 3000)
    } else {
      const d = await r?.json().catch(()=>({}))
      setError(d?.error || 'Failed to save profile')
    }
    setSaveLoading(false)
  }

  const changePassword = async () => {
    if (!security.currentPw || !security.newPw) return setError('Fill in all password fields')
    if (security.newPw.length < 8) return setError('New password must be at least 8 characters')
    if (!/[A-Z]/.test(security.newPw)) return setError('New password must contain an uppercase letter')
    if (!/[0-9]/.test(security.newPw)) return setError('New password must contain a number')
    if (security.newPw !== security.confirmPw) return setError('Passwords do not match')
    setSaveLoading(true); setError('')
    const r = await fetch('/api/auth/change-password', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ currentPassword: security.currentPw, newPassword: security.newPw })
    }).catch(()=>null)
    if (r?.ok) {
      setSaved('Password changed!'); setSecurity({currentPw:'',newPw:'',confirmPw:''})
      setTimeout(() => setSaved(''), 3000)
    } else {
      const d = await r?.json().catch(()=>({}))
      setError(d?.error || 'Failed to change password. Check your current password.')
    }
    setSaveLoading(false)
  }

  const pf = (k:string, v:string) => setProfile(p=>({...p,[k]:v}))
  const sf = (k:string, v:string) => { setSecurity(p=>({...p,[k]:v})); if(k==='newPw') setPwStrength(calcStrength(v)) }

  const strengthColor = ['','var(--red)','var(--gold)','var(--neon)','var(--green)'][pwStrength]
  const strengthLabel = ['','Weak','Fair','Good','Strong'][pwStrength]

  const TABS = [{id:'profile',label:'Profile'},{id:'security',label:'Security'},{id:'notifs',label:'Notifications'},{id:'danger',label:'Danger Zone'}]

  const Label = ({children}:any) => <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:8}}>{children}</label>

  const Toggle = ({on,onChange,label}:{on:boolean;onChange:(v:boolean)=>void;label:string}) => (
    <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:14,color:'var(--gray1)'}}>{label}</span>
      <div onClick={()=>onChange(!on)} style={{width:44,height:24,borderRadius:12,background:on?'var(--neon)':'var(--surface2)',border:`1px solid ${on?'var(--neon)':'var(--border2)'}`,position:'relative',transition:'all 0.2s',cursor:'pointer',flexShrink:0,boxShadow:on?'0 0 10px rgba(0,212,255,0.4)':'none'}}>
        <div style={{position:'absolute',top:2,left:on?22:2,width:18,height:18,borderRadius:'50%',background:'var(--white)',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.4)'}}/>
      </div>
    </label>
  )

  if (loading) return (
    <DashboardLayout trader={{}}>
      <div style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>Loading…</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout trader={trader||{}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Account</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1}}>Settings</h1>
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          {saved && <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,230,118,0.1)',border:'1px solid rgba(0,230,118,0.25)',borderRadius:8,padding:'10px 16px'}}><span style={{color:'var(--green)'}}>✓</span><span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--green)'}}>{saved}</span></div>}
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:24,borderBottom:'1px solid var(--border)'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setError('')}} style={{padding:'10px 20px',borderRadius:'8px 8px 0 0',border:'none',cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',background:activeTab===tab.id?'var(--surface)':'transparent',color:activeTab===tab.id?'var(--white)':'var(--gray3)',borderBottom:activeTab===tab.id?`2px solid ${tab.id==='danger'?'var(--red)':'var(--neon)'}`:'2px solid transparent',transition:'all 0.15s'}}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{marginBottom:16,padding:'11px 14px',background:'rgba(255,56,96,0.08)',border:'1px solid rgba(255,56,96,0.25)',borderRadius:8,color:'var(--red)',fontSize:13}}>⚠ {error}</div>}

      <div style={{maxWidth:560}}>
        {activeTab === 'profile' && (
          <div className="card">
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:20}}>Personal Information</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><Label>First Name</Label><input className="input-field" value={profile.firstName} onChange={e=>pf('firstName',e.target.value)} /></div>
                <div><Label>Last Name</Label><input className="input-field" value={profile.lastName} onChange={e=>pf('lastName',e.target.value)} /></div>
              </div>
              <div><Label>Display Name <span style={{color:'var(--gray3)',fontWeight:400,fontSize:10,textTransform:'none',letterSpacing:0}}>— shown on leaderboard</span></Label><input className="input-field" value={profile.displayName} onChange={e=>pf('displayName',e.target.value)} /></div>
              <div><Label>Phone</Label><input className="input-field" type="tel" placeholder="+1 234 567 8900" value={profile.phone} onChange={e=>pf('phone',e.target.value)} /></div>
              <div><Label>Date of Birth</Label><input className="input-field" type="date" value={profile.dateOfBirth} onChange={e=>pf('dateOfBirth',e.target.value)} /></div>
            </div>
            <button onClick={saveProfile} disabled={saveLoading} className="btn-neon" style={{marginTop:20,width:'100%',opacity:saveLoading?0.6:1}}>{saveLoading?'Saving…':'Save Profile'}</button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:20}}>Change Password</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><Label>Current Password</Label><input className="input-field" type="password" placeholder="Your current password" value={security.currentPw} onChange={e=>sf('currentPw',e.target.value)} /></div>
              <div>
                <Label>New Password</Label>
                <div style={{position:'relative'}}>
                  <input className="input-field" type={showPw?'text':'password'} placeholder="Min 8 chars · 1 uppercase · 1 number" value={security.newPw} onChange={e=>sf('newPw',e.target.value)} style={{paddingRight:44}} />
                  <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--gray3)',fontSize:15}}>{showPw?'🙈':'👁'}</button>
                </div>
                {security.newPw && (
                  <div style={{marginTop:6}}>
                    <div style={{display:'flex',gap:4,marginBottom:3}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=pwStrength?strengthColor:'var(--border2)',transition:'background 0.2s'}}/>)}</div>
                    <div style={{fontSize:11,color:strengthColor,fontFamily:'var(--font-display)',fontWeight:700}}>{strengthLabel}</div>
                  </div>
                )}
              </div>
              <div><Label>Confirm New Password</Label><input className="input-field" type="password" placeholder="Repeat new password" value={security.confirmPw} onChange={e=>sf('confirmPw',e.target.value)} />
                {security.confirmPw && security.newPw !== security.confirmPw && <div style={{fontSize:12,color:'var(--red)',marginTop:5}}>Passwords don't match</div>}
              </div>
            </div>
            <button onClick={changePassword} disabled={saveLoading||!security.currentPw||!security.newPw} className="btn-neon" style={{marginTop:20,width:'100%',opacity:saveLoading||!security.currentPw||!security.newPw?0.5:1}}>{saveLoading?'Changing…':'Change Password'}</button>
          </div>
        )}

        {activeTab === 'notifs' && (
          <div className="card">
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--gray3)',marginBottom:4}}>Email Notifications</div>
            <Toggle on={notifs.emailTrades}      onChange={v=>setNotifs(p=>({...p,emailTrades:v}))}      label="Trade confirmations" />
            <Toggle on={notifs.emailRankChange}  onChange={v=>setNotifs(p=>({...p,emailRankChange:v}))}  label="Rank change alerts" />
            <Toggle on={notifs.emailMatchStart}  onChange={v=>setNotifs(p=>({...p,emailMatchStart:v}))}  label="Match starting notifications" />
            <Toggle on={notifs.emailDrawdown}    onChange={v=>setNotifs(p=>({...p,emailDrawdown:v}))}    label="Drawdown warning alerts" />
            <p style={{fontSize:12,color:'var(--gray3)',marginTop:16,lineHeight:1.6}}>SMS alerts are coming soon. These preferences are saved locally for now — full persistence coming in next release.</p>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="card" style={{border:'1px solid rgba(255,56,96,0.25)'}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--red)',marginBottom:16}}>⚠ Danger Zone</div>
            <div style={{padding:'16px',background:'rgba(255,56,96,0.04)',border:'1px solid rgba(255,56,96,0.15)',borderRadius:8,marginBottom:12}}>
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)',marginBottom:4}}>Withdraw from Tournament</div>
              <div style={{fontSize:13,color:'var(--gray3)',lineHeight:1.6,marginBottom:12}}>Withdrawing will remove your country slot permanently. This cannot be undone and any registration fee paid is non-refundable.</div>
              <button style={{padding:'10px 20px',borderRadius:8,border:'1px solid rgba(255,56,96,0.4)',background:'transparent',color:'var(--red)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,letterSpacing:'0.08em',cursor:'pointer'}} onClick={()=>alert('Please email support@holaprime.com to withdraw from the tournament.')}>
                Contact Support to Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
