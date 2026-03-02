'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

const CAT_COLORS: Record<string,string> = { announcement:'var(--neon)', 'trader-spotlight':'var(--gold)', technical:'var(--gray2)', news:'var(--green)', results:'var(--red)' }

export default function AdminCMSPage() {
  const [posts, setPosts]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editPost, setEditPost] = useState<any>(null)
  const [form, setForm]         = useState({ title:'', slug:'', category:'news', content:'', status:'DRAFT', featured:false })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/cms').then(r=>r.json()).catch(()=>({}))
    setPosts(r.posts||[])
    setTotal(r.total||0)
    setLoading(false)
  }
  useEffect(()=>load(),[])

  const genSlug = (t:string) => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

  const openNew = () => { setEditPost(null); setForm({title:'',slug:'',category:'news',content:'',status:'DRAFT',featured:false}); setShowEditor(true) }
  const openEdit = (p:any) => { setEditPost(p); setForm({title:p.title,slug:p.slug,category:p.category,content:p.content||'',status:p.status,featured:p.featured||false}); setShowEditor(true) }

  const save = async () => {
    if (!form.title) return
    setSaving(true); setMsg('')
    const url = editPost ? `/api/admin/cms/${editPost.id}` : '/api/admin/cms'
    const method = editPost ? 'PATCH' : 'POST'
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) }).then(r=>r.json()).catch(()=>({}))
    if (r.post||r.success) { setMsg('Saved!'); load(); setTimeout(()=>{setMsg('');setShowEditor(false)},1200) }
    else { setMsg('Error: '+(r.error||'Failed')) }
    setSaving(false)
  }

  const deletePost = async (id:string) => {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/admin/cms/${id}`, { method:'DELETE' })
    load()
  }

  const togglePublish = async (p:any) => {
    const newStatus = p.status==='PUBLISHED'?'DRAFT':'PUBLISHED'
    await fetch(`/api/admin/cms/${p.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:newStatus}) })
    load()
  }

  return (
    <AdminLayout>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Content</div>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>CMS / News</h1>
        </div>
        <button onClick={openNew} className="btn-neon" style={{padding:'10px 20px',fontSize:13}}>+ New Post</button>
      </div>

      {loading ? <div style={{padding:48,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:12}}>Loading…</div>
      : posts.length===0 ? (
        <div className="card" style={{padding:60,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>✎</div>
          <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--gray3)'}}>No posts yet — create your first announcement!</div>
        </div>
      ) : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Title','Category','Status','Featured','Date','Actions'].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontFamily:'var(--font-display)',fontWeight:700,fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray3)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p:any,i:number)=>(
                <tr key={p.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                  <td style={{padding:'11px 14px'}}>
                    <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,color:'var(--white)'}}>{p.title}</div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--gray3)',marginTop:2}}>/news/{p.slug}</div>
                  </td>
                  <td style={{padding:'11px 14px'}}>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,color:CAT_COLORS[p.category]||'var(--gray2)',background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'3px 8px'}}>{p.category}</span>
                  </td>
                  <td style={{padding:'11px 14px'}}>
                    <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,letterSpacing:'0.08em',color:p.status==='PUBLISHED'?'var(--green)':'var(--gold)',background:p.status==='PUBLISHED'?'rgba(0,230,118,0.08)':'rgba(240,192,64,0.08)',border:`1px solid ${p.status==='PUBLISHED'?'rgba(0,230,118,0.2)':'rgba(240,192,64,0.2)'}`,borderRadius:4,padding:'3px 8px'}}>{p.status}</span>
                  </td>
                  <td style={{padding:'11px 14px',textAlign:'center',color:p.featured?'var(--gold)':'var(--gray3)',fontSize:16}}>{p.featured?'★':'☆'}</td>
                  <td style={{padding:'11px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--gray3)'}}>{new Date(p.createdAt||p.date).toLocaleDateString('en-GB',{dateStyle:'medium'})}</td>
                  <td style={{padding:'11px 14px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>openEdit(p)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border2)',background:'transparent',color:'var(--neon)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer'}}>Edit</button>
                      <button onClick={()=>togglePublish(p)} style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${p.status==='PUBLISHED'?'rgba(240,192,64,0.3)':'rgba(0,230,118,0.3)'}`,background:'transparent',color:p.status==='PUBLISHED'?'var(--gold)':'var(--green)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer'}}>{p.status==='PUBLISHED'?'Unpublish':'Publish'}</button>
                      <button onClick={()=>deletePost(p.id)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid rgba(255,56,96,0.3)',background:'transparent',color:'var(--red)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer'}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor modal */}
      {showEditor&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)',padding:20}}>
          <div style={{background:'var(--deep)',border:'1px solid var(--border)',borderRadius:16,padding:32,width:640,maxWidth:'100%',maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:22,color:'var(--white)',marginBottom:20}}>{editPost?'Edit Post':'New Post'}</h2>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Title</label>
                <input className="input-field" value={form.title} onChange={e=>{setForm(f=>({...f,title:e.target.value,slug:genSlug(e.target.value)}))}} style={{width:'100%',boxSizing:'border-box'}} placeholder="Post title…"/>
              </div>
              <div>
                <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Slug</label>
                <input className="input-field" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={{width:'100%',boxSizing:'border-box'}} placeholder="url-slug"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div>
                  <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Category</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="input-field" style={{width:'100%'}}>
                    {['announcement','news','technical','trader-spotlight','results'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="input-field" style={{width:'100%'}}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',paddingBottom:2}}>
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'var(--gold)'}}>
                    <input type="checkbox" checked={form.featured} onChange={e=>setForm(f=>({...f,featured:e.target.checked}))}/>
                    ★ Featured
                  </label>
                </div>
              </div>
              <div>
                <label style={{display:'block',fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray2)',marginBottom:7}}>Content</label>
                <textarea className="input-field" value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={12} style={{width:'100%',boxSizing:'border-box',resize:'vertical'}} placeholder="Post content (HTML supported)…"/>
              </div>
            </div>
            {msg&&<div style={{marginTop:12,fontSize:13,color:msg.startsWith('Error')?'var(--red)':'var(--green)'}}>{msg}</div>}
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={()=>setShowEditor(false)} className="btn-outline" style={{flex:1}}>Cancel</button>
              <button onClick={save} disabled={saving||!form.title} className="btn-neon" style={{flex:1,opacity:saving||!form.title?0.6:1}}>{saving?'Saving…':'Save Post'}</button>
            </div>
            <button onClick={()=>setShowEditor(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'var(--gray3)',fontSize:18,cursor:'pointer'}}>✕</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
