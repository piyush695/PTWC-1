'use client'
export const dynamic = 'force-dynamic'
// src/app/terms/page.tsx
import Navbar from '@/components/layout/Navbar'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Hola Prime World Cup platform ("Platform"), registering an account, or participating in any tournament, you ("Participant") agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must not use the Platform or participate in any tournament.`,
  },
  {
    title: '2. Eligibility',
    body: `The Platform and tournaments are open to individuals who are 18 years of age or older. By registering, you represent and warrant that you meet this age requirement and that all information provided during registration is accurate, current, and complete. Hola Prime reserves the right to request verification of eligibility at any time and to disqualify any Participant found to have misrepresented their eligibility.`,
  },
  {
    title: '3. Account Registration & KYC',
    body: `Registration requires completion of identity verification ("KYC") in compliance with applicable anti-money laundering (AML) regulations. Participants must provide valid government-issued photo identification and proof of address. Hola Prime may reject or suspend any account that fails to meet KYC requirements. Each individual may hold only one account; duplicate accounts will be permanently banned.`,
  },
  {
    title: '4. Tournament Rules & Conduct',
    body: `All tournament participation is governed by the Official Rulebook, which is incorporated into these Terms by reference. Hola Prime reserves the right to disqualify any Participant who, in its sole discretion, violates any tournament rule, engages in misconduct, or acts in a manner harmful to the integrity of the competition. Decisions by the Tournament Committee are final and binding.`,
  },
  {
    title: '5. Funded Accounts & Trading',
    body: `Funded accounts provided for tournament purposes are performance evaluation accounts only. They do not represent real capital invested by or on behalf of the Participant. Trading on these accounts is subject to the rules and limits specified in the Rulebook. Any profits generated are subject to the prize distribution rules and are not automatically withdrawable until prizes are formally awarded.`,
  },
  {
    title: '6. Prize Payments',
    body: `Prize payments will be processed within 14 business days of the Grand Final. Winners are responsible for providing accurate bank details and for any taxes, levies, or fees applicable in their jurisdiction. Hola Prime will not be liable for any payment delays caused by incorrect information provided by the Participant or by third-party banking processes.`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content on the Platform — including but not limited to branding, graphics, data, software, and tournament structure — is the intellectual property of Hola Prime Ltd or its licensors. Participants may not reproduce, distribute, or create derivative works from any Platform content without prior written consent from Hola Prime.`,
  },
  {
    title: '8. Privacy',
    body: `Your use of the Platform is also governed by our Privacy Policy, which is incorporated into these Terms. By participating, you consent to the collection, processing, and use of your personal data as described in the Privacy Policy, including for KYC purposes, prize disbursement, and marketing communications (where opted in).`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Hola Prime shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your participation in any tournament or use of the Platform. Hola Prime's total liability for any claim arising from these Terms shall not exceed the value of any prize you are entitled to receive.`,
  },
  {
    title: '10. Modifications',
    body: `Hola Prime reserves the right to modify these Terms at any time. Significant changes will be communicated via email or a notice on the Platform. Continued participation after changes take effect constitutes acceptance of the revised Terms.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.`,
  },
]

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '120px 32px 80px' }}>
        <div style={{ marginBottom: 52 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px,5vw,64px)', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 0.95, margin: '0 0 16px' }}>
            Terms &<br /><span className="text-shimmer">Conditions</span>
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
          Questions? Email <a href="mailto:legal@holaprime.com" style={{ color: 'var(--neon)', textDecoration: 'none' }}>legal@holaprime.com</a>
        </div>
      </div>
    </div>
  )
}
