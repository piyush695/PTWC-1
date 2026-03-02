// src/app/api/admin/draw/route.ts
// Creates the seeded H2H bracket from qualifier results.
// POST /api/admin/draw  { phase: "ROUND_OF_32" }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const PHASE_MAP: Record<string, string> = {
  ROUND_OF_32:  'ROUND_OF_32',
  ROUND_OF_16:  'ROUND_OF_16',
  QUARTERFINAL: 'QUARTERFINAL',
  SEMIFINAL:    'SEMIFINAL',
  GRAND_FINAL:  'GRAND_FINAL',
}

export async function POST(req: NextRequest) {
  try {
    const { phase = 'ROUND_OF_32', dryRun = false } = await req.json()

    if (!PHASE_MAP[phase]) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
    }

    // ── Get top qualifier per country ──────────────────────────────────────
    // For R32: pick best returnPct per country, rank them globally
    const qualifiers = await db.qualifierEntry.findMany({
      where:   { qualified: true },
      orderBy: [{ returnPct: 'desc' }, { maxDrawdown: 'asc' }],
      include: {
        trader: {
          select: {
            id: true, displayName: true,
            country: { select: { code: true, name: true } },
          },
        },
      },
    })

    // If no qualified flag set yet, take top 1 per country by returnPct
    let seeds = qualifiers

    if (seeds.length === 0) {
      // Auto-pick: best trader per country
      const allEntries = await db.qualifierEntry.findMany({
        orderBy: [{ returnPct: 'desc' }],
        include: {
          trader: {
            select: {
              id: true, displayName: true, countryId: true,
              country: { select: { code: true, name: true } },
            },
          },
        },
      })
      const seen = new Set<string>()
      seeds = allEntries.filter(e => {
        const cid = e.trader.countryId
        if (seen.has(cid)) return false
        seen.add(cid)
        return true
      })
    }

    if (seeds.length < 2) {
      return NextResponse.json({
        error: 'Not enough qualified traders to create a draw. Need at least 2.',
        found: seeds.length,
      }, { status: 422 })
    }

    // ── Standard seeding: 1 vs N, 2 vs N-1, ... ───────────────────────────
    const n = seeds.length
    const matchups: Array<{ seed1: number; seed2: number; t1: typeof seeds[0]; t2: typeof seeds[0] }> = []

    for (let i = 0; i < Math.floor(n / 2); i++) {
      matchups.push({
        seed1: i + 1,
        seed2: n - i,
        t1:    seeds[i],
        t2:    seeds[n - 1 - i],
      })
    }
    // If odd number: last seed gets a bye (no opponent), auto-advances
    const bye = n % 2 === 1 ? seeds[Math.floor(n / 2)] : null

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        phase,
        totalSeeds: seeds.length,
        matchCount: matchups.length,
        byeTrader:  bye ? { displayName: bye.trader.displayName, seed: Math.ceil(n / 2) } : null,
        matchups: matchups.map(m => ({
          matchNumber: m.seed1,
          trader1: { seed: m.seed1, name: m.t1.trader.displayName, country: m.t1.trader.country?.name, returnPct: parseFloat(m.t1.returnPct.toString()) },
          trader2: { seed: m.seed2, name: m.t2.trader.displayName, country: m.t2.trader.country?.name, returnPct: parseFloat(m.t2.returnPct.toString()) },
        })),
      })
    }

    // ── Check if matches already exist for this phase ─────────────────────
    const existing = await db.match.count({ where: { phase: phase as any } })
    if (existing > 0) {
      return NextResponse.json({
        error: `${phase} matches already exist (${existing} matches). Delete them first or use force=true.`,
      }, { status: 409 })
    }

    // ── Create match records ──────────────────────────────────────────────
    const created = await db.$transaction(
      matchups.map((m, i) =>
        db.match.create({
          data: {
            phase:        phase as any,
            matchNumber:  i + 1,
            trader1Id:    m.t1.traderId,
            trader2Id:    m.t2.traderId,
            status:       'SCHEDULED',
          },
        })
      )
    )

    // Handle bye: create a WALKOVER match record if needed
    let byeMatch = null
    if (bye) {
      byeMatch = await db.match.create({
        data: {
          phase:       phase as any,
          matchNumber: matchups.length + 1,
          trader1Id:   bye.traderId,
          trader2Id:   null,
          winnerId:    bye.traderId,
          status:      'WALKOVER',
        },
      })
    }

    return NextResponse.json({
      success: true,
      phase,
      matchesCreated: created.length,
      byeMatch:       bye ? { trader: bye.trader.displayName, matchId: byeMatch?.id } : null,
      matches: created.map((m, i) => ({
        id:         m.id,
        matchNumber: m.matchNumber,
        trader1:    { seed: matchups[i].seed1, name: matchups[i].t1.trader.displayName },
        trader2:    { seed: matchups[i].seed2, name: matchups[i].t2.trader.displayName },
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Draw creation error:', error)
    return NextResponse.json({ error: 'Internal error', detail: error.message }, { status: 500 })
  }
}

// GET: return existing matches for a phase
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phase = searchParams.get('phase') || 'ROUND_OF_32'

  const matches = await db.match.findMany({
    where:   { phase: phase as any },
    orderBy: { matchNumber: 'asc' },
    include: {
      trader1: { select: { id: true, displayName: true, country: { select: { code: true, name: true } } } },
      trader2: { select: { id: true, displayName: true, country: { select: { code: true, name: true } } } },
      winner:  { select: { id: true, displayName: true } },
    },
  })

  return NextResponse.json({
    phase, matches: matches.map(m => ({
      id:           m.id,
      matchNumber:  m.matchNumber,
      status:       m.status,
      trader1:      m.trader1 ? {
        id: m.trader1.id, name: m.trader1.displayName,
        countryCode: m.trader1.country?.code, countryName: m.trader1.country?.name,
        flagUrl: m.trader1.country?.code ? `https://flagcdn.com/w40/${m.trader1.country.code.toLowerCase()}.png` : null,
        returnPct: m.trader1ReturnPct ? parseFloat(m.trader1ReturnPct.toString()) : null,
      } : null,
      trader2: m.trader2 ? {
        id: m.trader2.id, name: m.trader2.displayName,
        countryCode: m.trader2.country?.code, countryName: m.trader2.country?.name,
        flagUrl: m.trader2.country?.code ? `https://flagcdn.com/w40/${m.trader2.country.code.toLowerCase()}.png` : null,
        returnPct: m.trader2ReturnPct ? parseFloat(m.trader2ReturnPct.toString()) : null,
      } : null,
      winner:     m.winner ? { id: m.winner.id, name: m.winner.displayName } : null,
      startTime:  m.startTime, endTime: m.endTime,
    })),
    timestamp: new Date().toISOString(),
  })
}

// PATCH: record match result  { matchId, winnerId }
export async function PATCH(req: NextRequest) {
  try {
    const { matchId, winnerId, notes } = await req.json()
    if (!matchId || !winnerId) return NextResponse.json({ error: 'matchId and winnerId required' }, { status: 400 })

    const match = await db.match.findUnique({
      where: { id: matchId },
      select: { id: true, trader1Id: true, trader2Id: true, phase: true },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (winnerId !== match.trader1Id && winnerId !== match.trader2Id) {
      return NextResponse.json({ error: 'Winner must be one of the match traders' }, { status: 400 })
    }

    const updated = await db.match.update({
      where: { id: matchId },
      data: { winnerId, status: 'COMPLETED', notes, verifiedAt: new Date() },
    })

    return NextResponse.json({ success: true, matchId: updated.id, winnerId, status: 'COMPLETED' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
