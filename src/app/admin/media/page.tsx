'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch('/api/admin/media').then(r=>r.json()).then(d=>setAssets(d.assets||[])).catch(()=>{})
  }
  useEffect(()=>load(),[])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    setUploading(true); setMsg('')
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/admin/media', { method:'POST', body:fd }).catch(()=>null)
    if (r?.ok) { setMsg('Uploaded!'); load() } else { setMsg('Upload failed') }
    setUploading(false)
    setTimeout(()=>setMsg(''),3000)
  }

  return (
    <AdminLayout>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--neon)',marginBottom:8}}>Content</div>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:36,color:'var(--white)',lineHeight:1,margin:0}}>Media Library</h1>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center'}}>
        <label style={{padding:'10px 20px',borderRadius:9,background:'var(--neon)',color:'var(--black)',fontFamily:'var(--font-display)',fontWeight:900,fontSize:13,letterSpacing:'0.08em',cursor:'pointer'}}>
          {uploading?'Uploading…':'+ Upload File'}
          <input type="file" onChange={handleFile} style={{display:'none'}} accept="image/*,video/*,.pdf" disabled={uploading}/>
        </label>
        {msg&&<span style={{fontSize:13,color:'var(--green)'}}>{msg}</span>}
      </div>

      {assets.length === 0 ? (
        <div className="card" style={{padding:60,textAlign:'center',color:'var(--gray3)',fontFamily:'var(--font-display)',fontSize:13}}>
          <div style={{fontSize:40,marginBottom:12}}>🖼</div>
          No media files yet. Upload images, banners, or documents for use in CMS posts.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14}}>
          {assets.map(a=>(
            <div key={a.id} className="card" style={{padding:12}}>
              {a.mimeType?.startsWith('image/')?
                <img src={a.url} alt={a.filename} style={{width:'100%',height:120,objectFit:'cover',borderRadius:6,marginBottom:8}}/>
              : <div style={{width:'100%',height:120,background:'var(--surface2)',borderRadius:6,marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>📄</div>}
              <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:11,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.filename}</div>
              <div style={{fontSize:10,color:'var(--gray3)',marginTop:3}}>{(a.size/1024).toFixed(1)} KB</div>
              <button onClick={()=>navigator.clipboard.writeText(a.url)} style={{marginTop:8,width:'100%',padding:'6px',borderRadius:6,border:'1px solid var(--border2)',background:'transparent',color:'var(--neon)',fontFamily:'var(--font-display)',fontWeight:700,fontSize:10,cursor:'pointer',letterSpacing:'0.08em'}}>COPY URL</button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
