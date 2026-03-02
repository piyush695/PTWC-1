'use client'
export const dynamic = 'force-dynamic'
// src/app/rules/page.tsx
import Navbar from '@/components/layout/Navbar'
import { useTournamentConfig, fmtMoneyFull, fmtDate, fmtDateRange, TournamentConfig } from '@/lib/useTournamentConfig'

function buildSections(c: TournamentConfig) {
  const accountSize = fmtMoneyFull(c.qualifierAccountSize)
  const qRange      = fmtDateRange(c.qualifierStart, c.qualifierEnd)
  const gfDate      = fmtDate(c.grandFinalDate, 'long')

  return [
    {
      id: 'eligibility', title: '1. Eligibility', rules: [
        'Participants must be 18 years of age or older at the time of registration.',
        'One participant per country — only the first approved registration per nation will be accepted.',
        'Participants must complete full KYC verification before trading begins.',
        'Employees of Hola Prime, its affiliates, and their immediate family members are not eligible.',
        'Participants must reside in an eligible country as listed on the registration page.',
      ],
    },
    {
      id: 'account', title: '2. Trading Account', rules: [
        `All participants receive a standardized ${accountSize} USD funded demo-performance account.`,
        'Account credentials (MT5 login, server, and password) are provided upon KYC approval.',
        'Accounts must be traded exclusively through MetaTrader 5 on the HolaPrime-Live server.',
        'Account sharing, copying, or third-party trading is strictly prohibited and will result in disqualification.',
        'A new account is provisioned for each round — qualifier and bracket rounds use separate accounts.',
      ],
    },
    {
      id: 'scoring', title: '3. Scoring & Advancement', rules: [
        `Qualifier scoring: Net Return % on the ${accountSize} account over the qualifier period (${qRange}).`,
        'The trader with the highest net return % per country advances to the H2H bracket.',
        `A minimum of ${c.minTradesPerRound} completed trades is required to be eligible for advancement.`,
        'Bracket rounds (R32 onward) are scored on net return % over the weekly head-to-head period.',
        'In case of a tie, the trader with the lower maximum drawdown advances.',
        'The bracket follows standard seeding: 1st seed vs 32nd seed, 2nd vs 31st, and so on.',
      ],
    },
    {
      id: 'drawdown', title: '4. Drawdown Limits', rules: [
        `Daily Drawdown Limit: ${c.dailyDrawdownPct}% of the starting account balance for that day.`,
        `Total Drawdown Limit: ${c.totalDrawdownPct}% of the initial account balance (${accountSize}).`,
        'Breaching either drawdown limit results in immediate and automatic disqualification.',
        'Drawdown is calculated on equity, not balance — open positions are included in the calculation.',
        'Daily drawdown resets at midnight server time (GMT+2).',
      ],
    },
    {
      id: 'trading', title: '5. Trading Rules', rules: [
        `Maximum leverage: 1:${c.maxLeverage} across all rounds and instruments.`,
        `Maximum position size: ${c.maxPositionSizePct}% of account balance per individual position.`,
        `Eligible instruments: ${c.allowedInstruments.join(', ')}.`,
        "Holding positions over the weekend is permitted but carries market gap risk at the trader's own responsibility.",
        'Scalping (trades under 30 seconds) and latency arbitrage are prohibited.',
        'Minimum trade duration: 30 seconds from open to close.',
        'Trades must be opened and closed by the same participant — no copy trading.',
      ],
    },
    {
      id: 'integrity', title: '6. Fair Play & Anti-Cheat', rules: [
        'All trades are audited in real-time by our automated anti-cheat system.',
        'Any detected use of automated bots, EAs, or algorithmic trading tools is prohibited and will result in disqualification.',
        'Trading patterns identified as martingale, toxic flow, or high-frequency exploitation are grounds for review and potential disqualification.',
        "Hola Prime reserves the right to review any trader's activity and disqualify at its sole discretion if fair play violations are found.",
        'Disqualified traders forfeit all prize entitlements.',
      ],
    },
    {
      id: 'prizes', title: '7. Prizes', rules: [
        `Grand Champion (1st Place): ${fmtMoneyFull(c.firstPrize)} USD, paid within 14 business days of the Grand Final.`,
        `Runner-Up (2nd Place): ${fmtMoneyFull(c.secondPrize)} USD.`,
        'Semi-Finalists (3rd-4th Place): Retain profits earned on their bracket account.',
        'Quarter-Finalists (5th-8th Place): Retain profits earned on their bracket account.',
        'Round of 16 (9th-16th Place): Retain profits earned on their bracket account.',
        'Prizes are paid via bank wire transfer to the account details provided during registration.',
        'All taxes and levies on prize winnings are the sole responsibility of the recipient.',
      ],
    },
    {
      id: 'general', title: '8. General', rules: [
        'Hola Prime reserves the right to modify these rules at any time with reasonable notice.',
        'All disputes will be handled by the Hola Prime Tournament Committee whose decision is final.',
        'Participation constitutes full acceptance of these rules and the Terms & Conditions.',
        "Hola Prime is not responsible for technical issues on participants' internet or device connections.",
        `The Grand Final is scheduled for ${gfDate} and may be rescheduled at Hola Prime's discretion.`,
      ],
    },
  ]
}

export default function RulesPage() {
  const { config } = useTournamentConfig()
  const SECTIONS = buildSections(config)

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '120px 32px 80px' }}>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--neon)', marginBottom: 12 }}>Official</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(40px,6vw,72px)', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 0.95, margin: '0 0 20px' }}>
            Tournament<br /><span className="text-gold-shimmer">Rulebook</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--gray2)', lineHeight: 1.7 }}>Rules reflect current tournament configuration. Last updated by admin.</p>
          <div style={{ marginTop: 20, background: 'rgba(240,192,64,0.06)', border: '1px solid rgba(240,192,64,0.2)', borderRadius: 10, padding: '14px 20px' }}>
            <span style={{ fontSize: 14, color: 'var(--gray2)', lineHeight: 1.6 }}>
              By registering for the Hola Prime World Cup, you confirm that you have read, understood, and agreed to all rules listed below.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 48 }}>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--gray2)', textDecoration: 'none', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--neon)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gray2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >{s.id}</a>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {SECTIONS.map(section => (
            <div key={section.id} id={section.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', scrollMarginTop: 90 }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', background: 'var(--deep)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 4, height: 24, background: 'var(--neon)', borderRadius: 2, boxShadow: '0 0 8px rgba(0,212,255,0.5)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--white)', margin: 0 }}>{section.title}</h2>
              </div>
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {section.rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--neon)', flexShrink: 0, marginTop: 2, minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 15, color: 'var(--gray1)', lineHeight: 1.7 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: 'center', fontSize: 13, color: 'var(--gray3)', lineHeight: 1.8 }}>
          Questions about the rules? Contact us at{' '}
          <a href="mailto:rules@holaprime.com" style={{ color: 'var(--neon)', textDecoration: 'none' }}>rules@holaprime.com</a>
        </div>
      </div>
    </div>
  )
}
