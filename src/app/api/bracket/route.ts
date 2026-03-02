// src/app/api/bracket/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildBracketDisplay } from '@/lib/bracket'
import { TournamentPhase } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const config = await db.tournamentConfig.findFirst()

    // Get all qualified traders with their seedings
    const bracketEntries = await db.bracketEntry.findMany({
      where: { phase: 'ROUND_OF_32' },
      orderBy: { seed: 'asc' },
      include: {
        trader: {
          select: { id: true, displayName: true },
        },
        country: {
          select: { code: true, flag: true },
        },
      },
    })

    // Get all knockout matches
    const matches = await db.match.findMany({
      where: {
        phase: {
          in: [
            TournamentPhase.ROUND_OF_32,
            TournamentPhase.ROUND_OF_16,
            TournamentPhase.QUARTERFINAL,
            TournamentPhase.SEMIFINAL,
            TournamentPhase.GRAND_FINAL,
          ],
        },
      },
      orderBy: [{ phase: 'asc' }, { matchNumber: 'asc' }],
      include: {
        trader1: { select: { id: true, displayName: true } },
        trader2: { select: { id: true, displayName: true } },
        winner: { select: { id: true, displayName: true } },
      },
    })

    const qualifiedTraders = bracketEntries.map(e => ({
      seed: e.seed!,
      traderId: e.trader.id,
      traderName: e.trader.displayName,
      countryCode: e.country.code,
      countryFlag: e.country.flag,
    }))

    const bracket = buildBracketDisplay(qualifiedTraders, matches.map(m => ({
      matchNumber: m.matchNumber,
      phase: m.phase,
      trader1Id: m.trader1Id,
      trader2Id: m.trader2Id,
      winnerId: m.winnerId,
      status: m.status,
      trader1ReturnPct: m.trader1ReturnPct ? parseFloat(m.trader1ReturnPct.toString()) : null,
      trader2ReturnPct: m.trader2ReturnPct ? parseFloat(m.trader2ReturnPct.toString()) : null,
      startTime: m.startTime,
      endTime: m.endTime,
    })))

    // Get active H2H matches with live scores
    const activeMatches = await db.match.findMany({
      where: { status: 'ACTIVE' },
      include: {
        trader1: {
          select: {
            displayName: true,
            country: { select: { code: true, flag: true } },
            accounts: {
              where: { status: 'ACTIVE' },
              select: { currentBalance: true, openingBalance: true, maxDrawdown: true, totalTrades: true },
              take: 1,
            },
          },
        },
        trader2: {
          select: {
            displayName: true,
            country: { select: { code: true, flag: true } },
            accounts: {
              where: { status: 'ACTIVE' },
              select: { currentBalance: true, openingBalance: true, maxDrawdown: true, totalTrades: true },
              take: 1,
            },
          },
        },
      },
    })

    const liveMatches = activeMatches.map(m => {
      const t1Account = m.trader1?.accounts[0]
      const t2Account = m.trader2?.accounts[0]
      const t1Return = t1Account
        ? ((t1Account.currentBalance.toNumber() - t1Account.openingBalance.toNumber()) / t1Account.openingBalance.toNumber()) * 100
        : 0
      const t2Return = t2Account
        ? ((t2Account.currentBalance.toNumber() - t2Account.openingBalance.toNumber()) / t2Account.openingBalance.toNumber()) * 100
        : 0

      return {
        matchId: m.id,
        phase: m.phase,
        matchNumber: m.matchNumber,
        endTime: m.endTime,
        trader1: {
          id: m.trader1Id,
          displayName: m.trader1?.displayName,
          country: m.trader1?.country,
          returnPct: parseFloat(t1Return.toFixed(4)),
          maxDrawdown: t1Account?.maxDrawdown ? parseFloat(t1Account.maxDrawdown.toString()) : 0,
          trades: t1Account?.totalTrades ?? 0,
        },
        trader2: {
          id: m.trader2Id,
          displayName: m.trader2?.displayName,
          country: m.trader2?.country,
          returnPct: parseFloat(t2Return.toFixed(4)),
          maxDrawdown: t2Account?.maxDrawdown ? parseFloat(t2Account.maxDrawdown.toString()) : 0,
          trades: t2Account?.totalTrades ?? 0,
        },
        leader: t1Return >= t2Return ? m.trader1Id : m.trader2Id,
      }
    })

    return NextResponse.json({
      bracket,
      liveMatches,
      currentPhase: config?.currentPhase,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bracket error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
