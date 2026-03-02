// src/app/api/config/route.ts
// Public endpoint — no auth required — used by all public pages
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const revalidate = 0 // always fresh

// ── Default config used when no DB record exists yet ─────────────────────
export const DEFAULT_CONFIG = {
  name:                  'Hola Prime World Cup 2026',
  currentPhase:          'REGISTRATION',
  registrationOpen:      true,
  registrationDeadline:  '2026-05-30',
  qualifierStart:        '2026-06-01',
  qualifierEnd:          '2026-06-12',
  grandFinalDate:        '2026-07-18',
  totalPrizePool:        100000,
  firstPrize:            60000,
  secondPrize:           25000,
  qualifierAccountSize:  10000,
  knockoutAccountSize:   10000,
  maxLeverage:           30,
  dailyDrawdownPct:      8,
  totalDrawdownPct:      12,
  minTradesPerRound:     10,
  maxPositionSizePct:    5,
  allowedInstruments:    ['EURUSD','GBPUSD','USDJPY','XAUUSD','USOIL','US30','NAS100','GER40'],
}

export async function GET() {
  try {
    const raw = await db.tournamentConfig.findFirst()

    if (!raw) {
      return NextResponse.json({ config: DEFAULT_CONFIG })
    }

    // Normalise Decimal / DateTime fields to plain JS types
    const config = {
      name:                 raw.name,
      currentPhase:         raw.currentPhase,
      registrationOpen:     raw.registrationOpen,
      registrationDeadline: raw.registrationDeadline?.toISOString().split('T')[0] ?? DEFAULT_CONFIG.registrationDeadline,
      qualifierStart:       raw.qualifierStart?.toISOString().split('T')[0]       ?? DEFAULT_CONFIG.qualifierStart,
      qualifierEnd:         raw.qualifierEnd?.toISOString().split('T')[0]         ?? DEFAULT_CONFIG.qualifierEnd,
      grandFinalDate:       raw.grandFinalDate?.toISOString().split('T')[0]       ?? DEFAULT_CONFIG.grandFinalDate,
      totalPrizePool:       Number(raw.totalPrizePool),
      firstPrize:           Number(raw.firstPrize),
      secondPrize:          Number(raw.secondPrize),
      qualifierAccountSize: Number(raw.qualifierAccountSize),
      knockoutAccountSize:  Number(raw.knockoutAccountSize),
      maxLeverage:          raw.maxLeverage,
      dailyDrawdownPct:     Number(raw.dailyDrawdownPct),
      totalDrawdownPct:     Number(raw.totalDrawdownPct),
      minTradesPerRound:    raw.minTradesPerRound,
      maxPositionSizePct:   Number(raw.maxPositionSizePct),
      allowedInstruments:   raw.allowedInstruments,
    }

    return NextResponse.json({ config })
  } catch {
    // DB not ready yet — return defaults so the site still renders
    return NextResponse.json({ config: DEFAULT_CONFIG })
  }
}
