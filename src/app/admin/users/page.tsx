'use client'
export const dynamic = 'force-dynamic'
// src/app/admin/users/page.tsx
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TRADER'

interface AdminUser {
  id: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  phone?: string
  department?: string
  notes?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt?: string
}

const ROLE_CFG = {
  SUPER_ADMIN: { label:'Super Admin', color:'var(--gold)',  bg:'rgba(240,192,64,0.1)',  border:'rgba(240,192,64,0.3)',  icon:'👑', desc:'Full access. Can manage roles, config, and all data.' },
  ADMIN:       { label:'Admin',       color:'var(--neon)',  bg:'rgba(0,212,255,0.08)', border:'rgba(0,212,255,0.25)', icon:'🛡', desc:'Can manage traders, KYC, accounts, bracket, and CRM.' },
  TRADER:      { label:'Trader',      color:'var(--gray2)', bg:'rgba(136,152,184,0.08)',border:'rgba(136,152,184,0.2)',icon:'👤', desc:'Standard participant. No admin access.' },
}

const DEPARTMENTS = ['Management','Operations','Compliance','Technology','Marketing','Support','Finance']

const inp: React.CSSProperties = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border2)', background:'rgba(0,0,0,0.3)', color:'var(--white)', fontFamily:'var(--font-body)', fontSize:13, outline:'none', boxSizing:'border-box' }
const lbl: React.CSSProperties = { fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gray3)', display:'block', marginBottom:6 }

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_CFG[role] || ROLE_CFG.TRADER
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', padding:'4px 10px', borderRadius:5, color:c.color, background:c.bg, border:`1px solid ${c.border}` }}>{c.icon} {c.label}</span>
}

function Avatar({ user, size=36 }: { user: Partial<AdminUser>; size?: number }) {
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || user.email?.[0]?.toUpperCase() || '?'
  const c = ROLE_CFG[user.role as UserRole] || ROLE_CFG.TRADER
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:c.bg, border:`2px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:size*0.38, color:c.color, flexShrink:0, letterSpacing:'-0.02em' }}>
      {initials}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([])
  const [me, setMe]           = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingMe, setEditingMe] = useState(false)
  const [meForm, setMeForm]   = useState({ firstName:'', lastName:'', phone:'', department:'', currentPassword:'', newPassword:'', confirmPassword:'' })
  const [meSaving, setMeSaving] = useState(false)
  const [meMsg, setMeMsg]     = useState('')

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inv, setInv] = useState({ firstName:'', lastName:'', email:'', phone:'', department:'', password:'', role:'ADMIN' as 'ADMIN'|'SUPER_ADMIN', notes:'', sendInvite:true })
  const [invSaving, setInvSaving] = useState(false)
  const [invMsg, setInvMsg]   = useState('')
  const [showInvPass, setShowInvPass] = useState(false)
  const [genPass, setGenPass] = useState('')

  // Edit user drawer
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<Partial<AdminUser & { newPassword:string }>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg] = useState('')

  // Role changing inline
  const [changingRole, setChangingRole] = useState<string|null>(null)
  const [roleMsg, setRoleMsg] = useState<Record<string,string>>({})

  // Revoke
  const [confirmRevoke, setConfirmRevoke] = useState<AdminUser|null>(null)
  const [revoking, setRevoking] = useState(false)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    const pw = Array.from({length:14}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
    setInv(p => ({...p, password:pw}))
    setGenPass(pw)
    setTimeout(() => setGenPass(''), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r=>r.json()),
      fetch('/api/admin/users').then(r=>r.json()),
    ]).then(([meData, usersData]) => {
      if (meData.user) {
        setMe(meData.user)
        setMeForm(p => ({ ...p, firstName: meData.user.firstName||'', lastName: meData.user.lastName||'', phone: meData.user.phone||'', department: meData.user.department||'' }))
      }
      if (usersData.users) setUsers(usersData.users)
    }).catch(()=>{}).finally(() => setLoading(false))
  }, [])

  const handleMeSave = async () => {
    setMeSaving(true); setMeMsg('')
    if (meForm.newPassword && meForm.newPassword !== meForm.confirmPassword) {
      setMeMsg('✕ New passwords do not match'); setMeSaving(false); return
    }
    const body: any = { firstName: meForm.firstName, lastName: meForm.lastName, phone: meForm.phone, department: meForm.department }
    if (meForm.newPassword) body.password = meForm.newPassword
    const res = await fetch(`/api/admin/users/${me?.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const d = await res.json()
    if (res.ok) {
      setMe(prev => prev ? { ...prev, ...d.user } : d.user)
      setMeMsg('✓ Profile updated')
      setMeForm(p => ({...p, currentPassword:'', newPassword:'', confirmPassword:''}))
      setTimeout(() => setMeMsg(''), 3000)
    } else { setMeMsg(`✕ ${d.error}`) }
    setMeSaving(false)
  }

  const handleInvite = async () => {
    if (!inv.firstName || !inv.lastName || !inv.email || !inv.password) { setInvMsg('✕ First name, last name, email and password are required'); return }
    setInvSaving(true); setInvMsg('')
    const res = await fetch('/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(inv) })
    const d = await res.json()
    if (res.ok) {
      setUsers(prev => [...prev, d.user])
      setInvMsg(d.emailSent ? '✓ Admin created and invite email sent' : `✓ Admin created (email not sent: ${d.emailError || 'Check Admin → Email → SMTP Config'})`)
      setTimeout(() => { setInvMsg(''); setShowInvite(false); setInv({ firstName:'', lastName:'', email:'', phone:'', department:'', password:'', role:'ADMIN', notes:'', sendInvite:true }) }, 2000)
    } else { setInvMsg(`✕ ${d.error}`) }
    setInvSaving(false)
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setChangingRole(userId)
    const res = await fetch(`/api/admin/users/${userId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ role: newRole }) })
    const d = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id===userId ? {...u, role:newRole} : u))
      setRoleMsg(prev => ({...prev, [userId]:'✓ Role updated — email notification sent'}))
    } else { setRoleMsg(prev => ({...prev, [userId]:`✕ ${d.error}`})) }
    setChangingRole(null)
    setTimeout(() => setRoleMsg(prev => ({...prev, [userId]:''})), 3500)
  }

  const openEdit = (u: AdminUser) => { setEditUser(u); setEditForm({ firstName:u.firstName||'', lastName:u.lastName||'', phone:u.phone||'', department:u.department||'', notes:u.notes||'', role:u.role, isActive:u.isActive, newPassword:'' }); setEditMsg('') }

  const handleEditSave = async () => {
    if (!editUser) return
    setEditSaving(true); setEditMsg('')
    const body: any = { ...editForm }
    if (!body.newPassword) delete body.newPassword
    else { body.password = body.newPassword; delete body.newPassword }
    const res = await fetch(`/api/admin/users/${editUser.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const d = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id===editUser.id ? {...u, ...d.user} : u))
      setEditMsg('✓ Saved')
      setTimeout(() => { setEditMsg(''); setEditUser(null) }, 1200)
    } else { setEditMsg(`✕ ${d.error}`) }
    setEditSaving(false)
  }

  const handleRevoke = async () => {
    if (!confirmRevoke) return
    setRevoking(true)
    const res = await fetch(`/api/admin/users/${confirmRevoke.id}`, { method:'DELETE' })
    if (res.ok) setUsers(prev => prev.filter(u => u.id!==confirmRevoke.id))
    setRevoking(false); setConfirmRevoke(null)
  }

  const isSuperAdmin = me?.role === 'SUPER_ADMIN'

  return (
    <AdminLayout>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--neon)', marginBottom:8 }}>System</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:34, color:'var(--white)', lineHeight:1, margin:0 }}>Admin Users & Roles</h1>
          {isSuperAdmin && (
            <button onClick={()=>setShowInvite(true)} style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px 22px', borderRadius:8, border:'none', cursor:'pointer', background:'var(--neon)', color:'var(--black)', boxShadow:'0 0 16px rgba(0,212,255,0.3)' }}>
              + Add Admin User
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CURRENT USER PROFILE CARD
      ══════════════════════════════════════════════════════════════════ */}
      {me && (
        <div style={{ background:'var(--surface)', border:`1px solid ${me.role==='SUPER_ADMIN'?'rgba(240,192,64,0.25)':'rgba(0,212,255,0.2)'}`, borderRadius:14, overflow:'hidden', marginBottom:24, position:'relative' }}>
          {/* Top accent bar */}
          <div style={{ height:3, background: me.role==='SUPER_ADMIN' ? 'linear-gradient(90deg,transparent,var(--gold),transparent)' : 'linear-gradient(90deg,transparent,var(--neon),transparent)' }} />

          <div style={{ padding:'24px 28px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>

              {/* Left — identity */}
              <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                <Avatar user={me} size={64} />
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color: me.role==='SUPER_ADMIN'?'var(--gold)':'var(--neon)', marginBottom:4 }}>
                    {ROLE_CFG[me.role].icon} {ROLE_CFG[me.role].label} · You
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'var(--white)', lineHeight:1.1 }}>
                    {me.firstName && me.lastName ? `${me.firstName} ${me.lastName}` : <span style={{ color:'var(--gray3)', fontStyle:'italic', fontSize:16 }}>No name set</span>}
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--gray2)', marginTop:4 }}>{me.email}</div>
                  {me.department && <div style={{ fontSize:12, color:'var(--gray3)', marginTop:2 }}>{me.department}</div>}
                  {me.phone && <div style={{ fontSize:12, color:'var(--gray3)' }}>{me.phone}</div>}
                </div>
              </div>

              {/* Right — stats */}
              <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'center' }}>
                {[
                  { label:'Last Login', value: me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'First session' },
                  { label:'Member Since', value: new Date(me.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) },
                  { label:'Total Admins', value: users.length.toString() },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>{s.value}</div>
                  </div>
                ))}
                <button onClick={()=>setEditingMe(p=>!p)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 18px', borderRadius:7, border:`1px solid ${me.role==='SUPER_ADMIN'?'rgba(240,192,64,0.3)':'rgba(0,212,255,0.3)'}`, background:'transparent', color: me.role==='SUPER_ADMIN'?'var(--gold)':'var(--neon)', cursor:'pointer' }}>
                  {editingMe ? '▲ Close' : '✏ Edit Profile'}
                </button>
              </div>
            </div>

            {/* ── Inline profile editor ────────────────────────────── */}
            {editingMe && (
              <div style={{ marginTop:24, paddingTop:24, borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:14 }}>
                  <div><label style={lbl}>First Name</label><input style={inp} value={meForm.firstName} onChange={e=>setMeForm(p=>({...p,firstName:e.target.value}))} placeholder="Your first name" /></div>
                  <div><label style={lbl}>Last Name</label><input style={inp} value={meForm.lastName} onChange={e=>setMeForm(p=>({...p,lastName:e.target.value}))} placeholder="Your last name" /></div>
                  <div><label style={lbl}>Phone</label><input style={inp} value={meForm.phone} onChange={e=>setMeForm(p=>({...p,phone:e.target.value}))} placeholder="+1 234 567 8900" /></div>
                  <div>
                    <label style={lbl}>Department</label>
                    <select style={{...inp, cursor:'pointer'}} value={meForm.department} onChange={e=>setMeForm(p=>({...p,department:e.target.value}))}>
                      <option value="">— Select —</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Password change */}
                <div style={{ marginBottom:14, padding:'16px', background:'rgba(0,0,0,0.2)', borderRadius:9, border:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gray3)', marginBottom:12 }}>Change Password (optional)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                    <div><label style={lbl}>New Password</label><input style={inp} type="password" value={meForm.newPassword} onChange={e=>setMeForm(p=>({...p,newPassword:e.target.value}))} placeholder="Min. 8 characters" /></div>
                    <div><label style={lbl}>Confirm Password</label><input style={inp} type="password" value={meForm.confirmPassword} onChange={e=>setMeForm(p=>({...p,confirmPassword:e.target.value}))} placeholder="Repeat new password" /></div>
                  </div>
                </div>

                {meMsg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:12, background:meMsg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', border:`1px solid ${meMsg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, color:meMsg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{meMsg}</div>}
                <button onClick={handleMeSave} disabled={meSaving} style={{ padding:'11px 28px', borderRadius:8, border:'none', cursor:meSaving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.07em', textTransform:'uppercase', opacity:meSaving?0.7:1 }}>
                  {meSaving ? 'Saving…' : '✓ Save Profile'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ROLE LEGEND
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, marginBottom:22 }}>
        {(['SUPER_ADMIN','ADMIN'] as UserRole[]).map(role => {
          const c = ROLE_CFG[role]
          const count = users.filter(u => u.role===role).length
          return (
            <div key={role} style={{ background:'var(--surface)', border:`1px solid ${c.border}`, borderRadius:10, padding:'14px 16px', display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontSize:22 }}>{c.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:c.color }}>{c.label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:16, color:c.color }}>{count}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--gray3)', lineHeight:1.4 }}>{c.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ADMIN USERS TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:editUser?0:20 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'var(--white)' }}>
            Admin Team
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray3)', marginLeft:10 }}>({users.length} members)</span>
          </div>
          <div style={{ fontSize:11, color:'var(--gray3)' }}>Role changes are instant · Email notifications sent automatically</div>
        </div>

        {loading ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--gray3)', fontFamily:'var(--font-display)', fontSize:13 }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--gray2)', marginBottom:6 }}>No admin users yet</div>
            <div style={{ fontSize:13, color:'var(--gray3)' }}>Click "Add Admin User" to invite your first team member.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Team Member','Role','Department','Contact','Last Login','Joined','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--border)', background: editUser?.id===u.id ? 'rgba(0,212,255,0.04)' : i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>

                    {/* Member */}
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <Avatar user={u} size={36} />
                        <div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--white)' }}>
                            {u.firstName||u.lastName ? `${u.firstName||''} ${u.lastName||''}`.trim() : <span style={{ color:'var(--gray3)', fontStyle:'italic', fontSize:11 }}>No name</span>}
                            {u.id === me?.id && <span style={{ marginLeft:6, fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.08em', padding:'2px 6px', borderRadius:3, background:'rgba(0,212,255,0.1)', color:'var(--neon)', border:'1px solid rgba(0,212,255,0.2)' }}>YOU</span>}
                          </div>
                          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', marginTop:1 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <RoleBadge role={u.role} />
                        {!u.isActive && <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:9, letterSpacing:'0.08em', color:'var(--red)', textTransform:'uppercase' }}>Inactive</span>}
                        {/* Inline role buttons — only for super admins, not self */}
                        {isSuperAdmin && u.id !== me?.id && (
                          <div style={{ display:'flex', gap:5, marginTop:2 }}>
                            {(['SUPER_ADMIN','ADMIN'] as UserRole[]).map(r => {
                              const rc = ROLE_CFG[r]
                              const active = u.role===r
                              return (
                                <button key={r} onClick={()=>!active && handleRoleChange(u.id, r)} disabled={active||changingRole===u.id} title={`Set as ${rc.label}`}
                                  style={{ fontSize:10, padding:'3px 8px', borderRadius:4, border:`1px solid ${active?rc.color:'var(--border2)'}`, background:active?rc.bg:'transparent', color:active?rc.color:'var(--gray3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', cursor:active||changingRole===u.id?'default':'pointer', opacity:changingRole===u.id&&!active?0.4:1, transition:'all 0.12s' }}>
                                  {rc.icon}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {roleMsg[u.id] && <div style={{ fontSize:10, color:roleMsg[u.id].startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, maxWidth:160 }}>{roleMsg[u.id]}</div>}
                      </div>
                    </td>

                    {/* Department */}
                    <td style={{ padding:'13px 16px', fontSize:12, color:'var(--gray2)' }}>{u.department || <span style={{ color:'var(--gray3)' }}>—</span>}</td>

                    {/* Contact */}
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray2)' }}>{u.phone || <span style={{ color:'var(--gray3)' }}>—</span>}</div>
                    </td>

                    {/* Last login */}
                    <td style={{ padding:'13px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray2)', whiteSpace:'nowrap' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : <span style={{ color:'var(--gray3)' }}>Never</span>}
                    </td>

                    {/* Joined */}
                    <td style={{ padding:'13px 16px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--gray3)', whiteSpace:'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>

                    {/* Actions */}
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>openEdit(u)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.07em', textTransform:'uppercase', padding:'6px 12px', borderRadius:6, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', cursor:'pointer' }}>
                          Edit
                        </button>
                        {isSuperAdmin && u.id !== me?.id && (
                          <button onClick={()=>setConfirmRevoke(u)} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, letterSpacing:'0.07em', textTransform:'uppercase', padding:'6px 12px', borderRadius:6, border:'1px solid rgba(255,56,96,0.3)', background:'transparent', color:'var(--red)', cursor:'pointer' }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          EDIT USER DRAWER (inline, below table)
      ══════════════════════════════════════════════════════════════════ */}
      {editUser && (
        <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:12, padding:'24px 28px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar user={editUser} size={40} />
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:15, color:'var(--white)' }}>Edit — {editUser.firstName||editUser.email}</div>
                <div style={{ fontSize:11, color:'var(--gray3)' }}>{editUser.email}</div>
              </div>
            </div>
            <button onClick={()=>setEditUser(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:22 }}>×</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
            <div><label style={lbl}>First Name</label><input style={inp} value={editForm.firstName||''} onChange={e=>setEditForm(p=>({...p,firstName:e.target.value}))} /></div>
            <div><label style={lbl}>Last Name</label><input style={inp} value={editForm.lastName||''} onChange={e=>setEditForm(p=>({...p,lastName:e.target.value}))} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={editForm.phone||''} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} /></div>
            <div>
              <label style={lbl}>Department</label>
              <select style={{...inp,cursor:'pointer'}} value={editForm.department||''} onChange={e=>setEditForm(p=>({...p,department:e.target.value}))}>
                <option value="">— Select —</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {isSuperAdmin && editUser.id !== me?.id && (
              <div>
                <label style={lbl}>Role</label>
                <div style={{ display:'flex', gap:8 }}>
                  {(['SUPER_ADMIN','ADMIN'] as UserRole[]).map(r => {
                    const rc = ROLE_CFG[r]
                    return (
                      <button key={r} onClick={()=>setEditForm(p=>({...p,role:r}))} style={{ flex:1, padding:'9px', borderRadius:7, border:`1px solid ${editForm.role===r?rc.color:'var(--border2)'}`, background:editForm.role===r?rc.bg:'transparent', color:editForm.role===r?rc.color:'var(--gray3)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, cursor:'pointer', textAlign:'center' as const }}>
                        {rc.icon} {rc.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <label style={lbl}>Active Status</label>
              <button onClick={()=>setEditForm(p=>({...p,isActive:!p.isActive}))} style={{ width:'100%', padding:'10px', borderRadius:8, border:`1px solid ${editForm.isActive?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, background:editForm.isActive?'rgba(0,230,118,0.08)':'rgba(255,56,96,0.08)', color:editForm.isActive?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                {editForm.isActive ? '● Active' : '○ Inactive'}
              </button>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <label style={lbl}>Notes (internal only)</label>
            <textarea style={{...inp, minHeight:70, resize:'vertical' as const, lineHeight:1.6}} value={editForm.notes||''} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))} placeholder="Internal notes about this admin…" />
          </div>

          <div style={{ marginTop:14, padding:'14px', background:'rgba(0,0,0,0.2)', borderRadius:8, border:'1px solid var(--border)' }}>
            <label style={lbl}>Reset Password (leave blank to keep current)</label>
            <input style={inp} type="password" value={editForm.newPassword||''} onChange={e=>setEditForm(p=>({...p,newPassword:e.target.value}))} placeholder="New password (min. 8 characters)" />
          </div>

          {editMsg && <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:editMsg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', border:`1px solid ${editMsg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, color:editMsg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{editMsg}</div>}

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={()=>setEditUser(null)} style={{ padding:'11px 20px', borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.07em', textTransform:'uppercase', cursor:'pointer' }}>Cancel</button>
            <button onClick={handleEditSave} disabled={editSaving} style={{ flex:1, padding:'12px', borderRadius:8, border:'none', cursor:editSaving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.07em', textTransform:'uppercase', opacity:editSaving?0.7:1 }}>
              {editSaving ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Security note ───────────────────────────────────────────────── */}
      <div style={{ background:'rgba(240,192,64,0.05)', border:'1px solid rgba(240,192,64,0.15)', borderRadius:10, padding:'14px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
        <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>🔒</span>
        <div style={{ fontSize:12, color:'var(--gray2)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--gold)' }}>Security notes:</strong> Role changes are instant and require no re-login — the new role is read from the database on every request. When you change a role, the affected admin receives an email notification automatically. Only <strong style={{ color:'var(--white)' }}>Super Admins</strong> can invite, edit roles, or revoke access. Revoking access deactivates the account and removes admin privileges immediately.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          INVITE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showInvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>{ if(e.target===e.currentTarget) setShowInvite(false) }}>
          <div style={{ background:'var(--deep)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:16, padding:'28px 32px', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,var(--neon),transparent)', borderRadius:'16px 16px 0 0' }} />
            <button onClick={()=>setShowInvite(false)} style={{ position:'absolute', top:16, right:18, background:'none', border:'none', color:'var(--gray3)', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'var(--white)', marginBottom:4 }}>Add Admin User</div>
              <div style={{ fontSize:13, color:'var(--gray3)' }}>Creates an account and sends login credentials via email.</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Name row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>First Name *</label><input style={inp} value={inv.firstName} onChange={e=>setInv(p=>({...p,firstName:e.target.value}))} placeholder="John" /></div>
                <div><label style={lbl}>Last Name *</label><input style={inp} value={inv.lastName} onChange={e=>setInv(p=>({...p,lastName:e.target.value}))} placeholder="Smith" /></div>
              </div>

              {/* Email */}
              <div><label style={lbl}>Email Address *</label><input style={inp} type="email" value={inv.email} onChange={e=>setInv(p=>({...p,email:e.target.value}))} placeholder="john@holaprime.com" /></div>

              {/* Contact row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label style={lbl}>Phone</label><input style={inp} value={inv.phone} onChange={e=>setInv(p=>({...p,phone:e.target.value}))} placeholder="+1 234 567 8900" /></div>
                <div>
                  <label style={lbl}>Department</label>
                  <select style={{...inp,cursor:'pointer'}} value={inv.department} onChange={e=>setInv(p=>({...p,department:e.target.value}))}>
                    <option value="">— Select —</option>
                    {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Role picker */}
              <div>
                <label style={lbl}>Role *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {(['ADMIN','SUPER_ADMIN'] as const).map(r => {
                    const c = ROLE_CFG[r]
                    return (
                      <button key={r} onClick={()=>setInv(p=>({...p,role:r}))} style={{ padding:'14px', borderRadius:9, border:`2px solid ${inv.role===r?c.color:'var(--border2)'}`, background:inv.role===r?c.bg:'rgba(0,0,0,0.2)', cursor:'pointer', textAlign:'left' as const, transition:'all 0.15s' }}>
                        <div style={{ fontSize:22, marginBottom:6 }}>{c.icon}</div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, color:inv.role===r?c.color:'var(--gray2)', marginBottom:3 }}>{c.label}</div>
                        <div style={{ fontSize:11, color:'var(--gray3)', lineHeight:1.4 }}>{c.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={lbl}>Temporary Password *</label>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1, position:'relative' }}>
                    <input style={inp} type={showInvPass?'text':'password'} value={inv.password} onChange={e=>setInv(p=>({...p,password:e.target.value}))} placeholder="Min. 8 characters" />
                    <button onClick={()=>setShowInvPass(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray3)', fontSize:14 }}>{showInvPass?'🙈':'👁'}</button>
                  </div>
                  <button onClick={generatePassword} style={{ padding:'10px 14px', borderRadius:8, border:'1px solid rgba(0,212,255,0.2)', background:'rgba(0,212,255,0.06)', color:'var(--neon)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, letterSpacing:'0.07em', cursor:'pointer', whiteSpace:'nowrap' }}>
                    ⚡ Generate
                  </button>
                </div>
                {genPass && <div style={{ marginTop:5, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--green)', padding:'5px 10px', background:'rgba(0,230,118,0.08)', borderRadius:5, border:'1px solid rgba(0,230,118,0.2)' }}>Generated: {genPass}</div>}
                <div style={{ marginTop:5, fontSize:11, color:'var(--gray3)' }}>The user will receive this password via email and should change it on first login.</div>
              </div>

              {/* Notes */}
              <div>
                <label style={lbl}>Internal Notes (optional)</label>
                <textarea style={{...inp, minHeight:60, resize:'vertical' as const, lineHeight:1.6}} value={inv.notes} onChange={e=>setInv(p=>({...p,notes:e.target.value}))} placeholder="e.g. Regional manager for APAC operations" />
              </div>

              {/* Send invite toggle */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'12px 14px', borderRadius:8, background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)' }}>
                <input type="checkbox" checked={inv.sendInvite} onChange={e=>setInv(p=>({...p,sendInvite:e.target.checked}))} style={{ width:16, height:16, accentColor:'var(--neon)', cursor:'pointer' }} />
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--neon)' }}>Send invite email</div>
                  <div style={{ fontSize:11, color:'var(--gray3)', marginTop:2 }}>Sends login URL, email, and temporary password to the user via email.</div>
                </div>
              </label>

              {invMsg && <div style={{ padding:'11px 14px', borderRadius:8, background:invMsg.startsWith('✓')?'rgba(0,230,118,0.1)':'rgba(255,56,96,0.1)', border:`1px solid ${invMsg.startsWith('✓')?'rgba(0,230,118,0.3)':'rgba(255,56,96,0.3)'}`, color:invMsg.startsWith('✓')?'var(--green)':'var(--red)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12 }}>{invMsg}</div>}

              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button onClick={()=>setShowInvite(false)} style={{ flex:1, padding:'12px', borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.07em', textTransform:'uppercase', cursor:'pointer' }}>Cancel</button>
                <button onClick={handleInvite} disabled={invSaving} style={{ flex:2, padding:'13px', borderRadius:9, border:'none', cursor:invSaving?'not-allowed':'pointer', background:'var(--neon)', color:'var(--black)', fontFamily:'var(--font-display)', fontWeight:900, fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', opacity:invSaving?0.7:1, boxShadow:'0 0 20px rgba(0,212,255,0.3)' }}>
                  {invSaving ? 'Creating…' : `${inv.sendInvite ? '📧 Create & Send Invite' : '✓ Create Admin'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke confirm ───────────────────────────────────────────────── */}
      {confirmRevoke && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--deep)', border:'1px solid rgba(255,56,96,0.3)', borderRadius:14, padding:'28px 32px', width:'100%', maxWidth:380, textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:17, color:'var(--white)', marginBottom:8 }}>Revoke Admin Access?</div>
            <div style={{ fontSize:13, color:'var(--gray2)', marginBottom:6, lineHeight:1.6 }}>
              <strong style={{ color:'var(--white)' }}>{confirmRevoke.firstName ? `${confirmRevoke.firstName} ${confirmRevoke.lastName||''}`.trim() : confirmRevoke.email}</strong>
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--gray3)', marginBottom:20 }}>{confirmRevoke.email}</div>
            <div style={{ fontSize:12, color:'rgba(255,100,100,0.8)', marginBottom:24, lineHeight:1.6 }}>
              This will immediately remove all admin panel access and deactivate the account.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setConfirmRevoke(null)} style={{ flex:1, padding:'11px', borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--gray2)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, letterSpacing:'0.07em', textTransform:'uppercase', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleRevoke} disabled={revoking} style={{ flex:1, padding:'11px', borderRadius:8, border:'none', background:'var(--red)', color:'var(--white)', fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'0.07em', textTransform:'uppercase', cursor:revoking?'not-allowed':'pointer', opacity:revoking?0.7:1 }}>
                {revoking ? 'Revoking…' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
