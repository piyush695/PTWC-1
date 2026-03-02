'use client'
export const dynamic = 'force-dynamic'
// src/app/news/page.tsx — real data from /api/news (CMS)
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

const CAT_COLORS: Record<string, string> = {
  announcement: 'var(--neon)', tournament: 'var(--gold)',
  guide: 'var(--green)', rules: 'var(--neon)', news: 'var(--green)', results: 'var(--red)',
}

export default function NewsPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')

  useEffect(() => {
    fetch('/api/news?status=PUBLISHED&limit=50')
      .then(r => r.json())
      .then(d => { setArticles(d.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = ['ALL', ...Array.from(new Set(articles.map(a => a.category)))]
  const filtered   = articles.filter(a => filter === 'ALL' || a.category === filter)
  const featured   = filtered.find(a => a.featured)
  const rest       = filtered.filter(a => !a.featured)

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 32px 80px' }}>

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 12 }}>Tournament Hub</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(40px,6vw,72px)', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 0.95, margin: 0 }}>
            News &amp; <span className="text-shimmer">Updates</span>
          </h1>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 40, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 8, border: `1px solid ${filter === cat ? 'rgba(0,212,255,0.4)' : 'var(--border2)'}`, background: filter === cat ? 'rgba(0,212,255,0.08)' : 'transparent', color: filter === cat ? 'var(--neon)' : 'var(--gray2)', cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--gray3)', fontFamily: 'var(--font-display)', fontSize: 13 }}>Loading articles…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--gray3)', fontFamily: 'var(--font-display)', fontSize: 14 }}>No articles published yet.</div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Link href={`/news/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 32 }}>
                <div className="card" style={{ padding: '36px 40px', borderColor: 'rgba(0,212,255,0.2)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--neon), transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 4, background: 'rgba(0,212,255,0.1)', color: CAT_COLORS[featured.category?.toLowerCase()] || 'var(--neon)', border: `1px solid ${CAT_COLORS[featured.category?.toLowerCase()] || 'var(--neon)'}30` }}>{featured.category}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', color: 'var(--neon)', textTransform: 'uppercase' }}>Featured</span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(22px,3vw,36px)', color: 'var(--white)', lineHeight: 1.1, marginBottom: 14 }}>{featured.title}</h2>
                  <p style={{ fontSize: 15, color: 'var(--gray2)', lineHeight: 1.7, marginBottom: 20, maxWidth: 700 }}>{featured.excerpt}</p>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>{new Date(featured.publishedAt || featured.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</span>
                    {featured.readTime && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>{featured.readTime} read</span>}
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--neon)', letterSpacing: '0.08em', marginLeft: 'auto' }}>Read Article →</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {rest.map(a => (
                <Link key={a.id} href={`/news/${a.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: `${CAT_COLORS[a.category?.toLowerCase()] || 'var(--neon)'}15`, color: CAT_COLORS[a.category?.toLowerCase()] || 'var(--neon)', border: `1px solid ${CAT_COLORS[a.category?.toLowerCase()] || 'var(--neon)'}30` }}>{a.category}</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--white)', lineHeight: 1.2, marginBottom: 10, flex: 1 }}>{a.title}</h3>
                    {a.excerpt && <p style={{ fontSize: 13, color: 'var(--gray2)', lineHeight: 1.6, marginBottom: 16 }}>{a.excerpt}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray3)' }}>{new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</span>
                      {a.readTime && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray3)' }}>{a.readTime} read</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
