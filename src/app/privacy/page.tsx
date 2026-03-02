'use client'
export const dynamic = 'force-dynamic'
// src/app/privacy/page.tsx
import Navbar from '@/components/layout/Navbar'

const SECTIONS = [
  { title: '1. Information We Collect', body: `We collect information you provide during registration (name, email, phone, date of birth, country of residence), identity verification documents submitted for KYC (passport, national ID, proof of address, selfies), trading activity data generated through your use of funded accounts on our platform, device and browser information, IP address, and usage logs when you access the Platform.` },
  { title: '2. How We Use Your Information', body: `We use your information to verify your identity and comply with AML/KYC obligations, operate and administer tournament participation, communicate with you about your account, trading activity, and tournament updates, process and disburse prize payments, detect and prevent fraud or abuse, and improve our Platform and services. We will only send marketing communications where you have opted in.` },
  { title: '3. Data Sharing', body: `We do not sell your personal data. We may share data with KYC verification providers and identity verification partners, payment processors for prize disbursement, regulatory authorities where required by law, and technology service providers who operate under strict data processing agreements. All third parties are contractually required to protect your data and use it only for specified purposes.` },
  { title: '4. Data Retention', body: `We retain your personal data for as long as your account is active and for seven years thereafter to comply with regulatory and legal obligations. KYC documents are retained for the minimum period required by applicable AML regulations. Trading data may be retained for longer periods for audit and dispute resolution purposes.` },
  { title: '5. Your Rights', body: `Subject to applicable law, you have the right to access the personal data we hold about you, request correction of inaccurate data, request deletion of your data (subject to legal retention requirements), object to processing for marketing purposes at any time, and request a copy of your data in a portable format. To exercise any of these rights, contact us at privacy@holaprime.com.` },
  { title: '6. Cookies', body: `Our Platform uses essential cookies for session management and authentication, and analytics cookies to understand Platform usage. You can control non-essential cookies through your browser settings. Disabling essential cookies will affect your ability to log in and use the Platform.` },
  { title: '7. Security', body: `We implement industry-standard security measures including TLS encryption for data in transit, encrypted storage of sensitive personal information, access controls limiting data access to authorised personnel only, and regular security audits. No system is completely secure, and we cannot guarantee absolute security.` },
  { title: '8. Contact', body: `For any privacy-related questions, requests, or complaints, please contact our Data Protection Officer at privacy@holaprime.com. We will respond to all legitimate requests within 30 days.` },
]

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '120px 32px 80px' }}>
        <div style={{ marginBottom: 52 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px,5vw,64px)', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 0.95, margin: '0 0 16px' }}>
            Privacy<br /><span className="text-shimmer">Policy</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gray3)' }}>Effective Date: May 1, 2026 · Last Updated: April 28, 2026</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {SECTIONS.map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)', marginBottom: 14 }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: 'var(--gray2)', lineHeight: 1.8, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 13, color: 'var(--gray3)' }}>
          Contact: <a href="mailto:privacy@holaprime.com" style={{ color: 'var(--neon)', textDecoration: 'none' }}>privacy@holaprime.com</a>
        </div>
      </div>
    </div>
  )
}
