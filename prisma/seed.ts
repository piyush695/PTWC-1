// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Asia Pacific' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'Latin America' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia Pacific' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia Pacific' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', region: 'Middle East' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia Pacific' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'Latin America' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia Pacific' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', region: 'Asia Pacific' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia Pacific' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia Pacific' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Europe' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia Pacific' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'Latin America' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', region: 'Europe' },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Countries
  for (const c of COUNTRIES) {
    await db.country.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    })
  }
  console.log(`✅ ${COUNTRIES.length} countries seeded`)

  // Admin user
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@holaprime.com'
  const adminPass = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!'
  await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPass, 12),
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    update: { role: 'SUPER_ADMIN' },
  })
  console.log(`✅ Admin user: ${adminEmail}`)

  // Tournament config
  await db.tournamentConfig.upsert({
    where: { id: 'main' },
    create: {
      id: 'main',
      currentPhase: 'REGISTRATION',
      registrationOpen: true,
      registrationDeadline: new Date('2026-05-30'),
      qualifierStart: new Date('2026-06-01'),
      qualifierEnd: new Date('2026-06-12'),
      grandFinalDate: new Date('2026-07-18'),
      totalPrizePool: 100000,
      firstPrize: 60000,
      secondPrize: 25000,
      qualifierAccountSize: 10000,
      knockoutAccountSize: 10000,
      maxLeverage: 30,
      dailyDrawdownPct: 8.0,
      totalDrawdownPct: 12.0,
      minTradesPerRound: 10,
      maxPositionSizePct: 5.0,
      tradingStartHour: 0,
      tradingEndHour: 23,
      allowedInstruments: ['EURUSD','GBPUSD','USDJPY','XAUUSD','USOIL','US30','NAS100','GER40'],
    },
    update: { id: 'main' },
  })
  console.log('✅ Tournament config seeded')

  // Email templates
  const templates = [
    { slug: 'registration_confirm', name: 'Registration Confirmation', subject: '🏆 Welcome to Hola Prime World Cup!', body: '', variables: ['firstName', 'displayName', 'countryName'] },
    { slug: 'kyc_approved', name: 'KYC Approved', subject: '✅ KYC Approved — Your Account is Ready', body: '', variables: ['firstName', 'accountNumber', 'accountSize'] },
    { slug: 'kyc_rejected', name: 'KYC Rejected', subject: '❌ KYC Verification Failed', body: '', variables: ['firstName', 'reason'] },
    { slug: 'match_announcement', name: 'Match Announcement', subject: '⚔️ Your Match Has Been Drawn!', body: '', variables: ['firstName', 'opponentName', 'opponentCountry', 'phase', 'startDate', 'endDate'] },
    { slug: 'qualifier_reminder', name: 'Qualifier Reminder', subject: '⏰ Qualifier Ends in 48 Hours!', body: '', variables: ['firstName', 'currentRank', 'returnPct'] },
    { slug: 'disqualification', name: 'Disqualification Notice', subject: '🚫 Important: Account Notice', body: '', variables: ['firstName', 'reason'] },
  ]

  for (const t of templates) {
    await db.emailTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: t,
    })
  }
  console.log(`✅ ${templates.length} email templates seeded`)

  console.log('\n🎉 Seed complete!')
  console.log(`\n   Admin login: ${adminEmail} / ${adminPass}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
