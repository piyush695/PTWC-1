// src/app/api/admin/bracket/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, logAdminAction } from '@/lib/auth'
import { getNextMatchSlot, validateMatchResult } from '@/lib/bracket'
import { selectBracketTraders, rankQualifierTraders } from '@/lib/scoring'
import { sendEmail, templateMatchAnnouncement } from '@/lib/email'
import { TournamentPhase } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Seed the bracket from qualifier results
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'seed') {
    return seedBracket(req, user.userId)
  }
  if (action === 'advance') {
    return advanceMatch(req, user.userId)
  }
  if (action === 'create-match') {
    return createMatch(req, user.userId)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function seedBracket(req: NextRequest, adminUserId: string) {
  try {
    // Get all qualifier entries
    const qualifierEntries = await db.qualifierEntry.findMany({
      where: { qualified: true },
      include: {
        trader: {
          include: { country: true },
        },
      },
    })

    // Rank and select top 1 per country
    const ranked = rankQualifierTraders(
      qualifierEntries.map(e => ({
        traderId: e.traderId,
        countryId: e.trader.countryId,
        scorecard: {
          returnPct: parseFloat(e.returnPct.toString()),
          maxDrawdownPct: parseFloat(e.maxDrawdown.toString()),
          sharpeRatio: e.sharpeRatio ? parseFloat(e.sharpeRatio.toString()) : null,
          winRate: 0,
          totalTrades: e.totalTrades,
          isEligible: true,
        },
      }))
    )

    const bracketTraders = selectBracketTraders(ranked, 32)

    // Create bracket entries and R32 matches in transaction
    await db.$transaction(async (tx) => {
      // Clear existing
      await tx.bracketEntry.deleteMany({ where: { phase: 'ROUND_OF_32' } })
      await tx.match.deleteMany({ where: { phase: 'ROUND_OF_32' } })

      // Create bracket entries
      await tx.bracketEntry.createMany({
        data: bracketTraders.map(t => ({
          traderId: t.traderId,
          countryId: qualifierEntries.find(e => e.traderId === t.traderId)!.trader.countryId,
          phase: TournamentPhase.ROUND_OF_32,
          seed: t.seed,
        })),
      })

      // Create R32 matches (1v32, 16v17, etc.)
      const sorted = bracketTraders.sort((a, b) => a.seed - b.seed)
      for (let i = 0; i < sorted.length / 2; i++) {
        const t1 = sorted[i]
        const t2 = sorted[sorted.length - 1 - i]
        await tx.match.create({
          data: {
            phase: TournamentPhase.ROUND_OF_32,
            matchNumber: i + 1,
            trader1Id: t1.traderId,
            trader2Id: t2.traderId,
            status: 'SCHEDULED',
          },
        })
      }

      // Update tournament phase
      await tx.tournamentConfig.updateMany({
        data: { currentPhase: TournamentPhase.ROUND_OF_32 },
      })

      await logAdminAction({
        userId: adminUserId,
        action: 'BRACKET_SEEDED',
        details: `${bracketTraders.length} traders seeded into R32`,
      })
    })

    return NextResponse.json({
      success: true,
      message: `${bracketTraders.length} traders seeded into Round of 32`,
    })
  } catch (error) {
    console.error('Seed bracket error:', error)
    return NextResponse.json({ error: 'Failed to seed bracket' }, { status: 500 })
  }
}

const advanceSchema = z.object({
  matchId: z.string(),
  winnerId: z.string(),
  trader1ReturnPct: z.number(),
  trader2ReturnPct: z.number(),
  trader1Trades: z.number().int(),
  trader2Trades: z.number().int(),
  trader1MaxDD: z.number().optional(),
  trader2MaxDD: z.number().optional(),
  notes: z.string().optional(),
})

async function advanceMatch(req: NextRequest, adminUserId: string) {
  const body = await req.json()
  const data = advanceSchema.parse(body)

  const match = await db.match.findUnique({
    where: { id: data.matchId },
    include: {
      trader1: { include: { country: true } },
      trader2: { include: { country: true } },
    },
  })

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status === 'COMPLETED') return NextResponse.json({ error: 'Match already completed' }, { status: 400 })

  const config = await db.tournamentConfig.findFirst()
  const validation = validateMatchResult({
    trader1Id: match.trader1Id!,
    trader2Id: match.trader2Id!,
    winnerId: data.winnerId,
    trader1Trades: data.trader1Trades,
    trader2Trades: data.trader2Trades,
    trader1ReturnPct: data.trader1ReturnPct,
    trader2ReturnPct: data.trader2ReturnPct,
    minTrades: config?.minTradesPerRound || 10,
  })

  if (!validation.valid) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 })
  }

  const loserId = data.winnerId === match.trader1Id ? match.trader2Id : match.trader1Id

  await db.$transaction(async (tx) => {
    // Update match as completed
    await tx.match.update({
      where: { id: data.matchId },
      data: {
        status: 'COMPLETED',
        winnerId: data.winnerId,
        trader1ReturnPct: data.trader1ReturnPct,
        trader2ReturnPct: data.trader2ReturnPct,
        trader1Trades: data.trader1Trades,
        trader2Trades: data.trader2Trades,
        trader1MaxDD: data.trader1MaxDD,
        trader2MaxDD: data.trader2MaxDD,
        notes: data.notes,
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
      },
    })

    // Update loser status
    await tx.trader.update({
      where: { id: loserId! },
      data: { status: 'ELIMINATED' },
    })

    // Advance winner to next round
    const nextSlot = getNextMatchSlot(match.phase, match.matchNumber)
    if (nextSlot) {
      // Find or create next match
      const existingNext = await tx.match.findFirst({
        where: { phase: nextSlot.nextPhase, matchNumber: nextSlot.nextMatchNumber },
      })

      if (existingNext) {
        await tx.match.update({
          where: { id: existingNext.id },
          data: {
            [nextSlot.slotNumber === 1 ? 'trader1Id' : 'trader2Id']: data.winnerId,
          },
        })
      } else {
        await tx.match.create({
          data: {
            phase: nextSlot.nextPhase,
            matchNumber: nextSlot.nextMatchNumber,
            [nextSlot.slotNumber === 1 ? 'trader1Id' : 'trader2Id']: data.winnerId,
            status: 'SCHEDULED',
          },
        })
      }
    } else {
      // Grand Final winner — they're the champion!
      await tx.trader.update({
        where: { id: data.winnerId },
        data: { status: 'CHAMPION' },
      })
      await tx.tournamentConfig.updateMany({
        data: { currentPhase: TournamentPhase.COMPLETED },
      })
    }

    await logAdminAction({
      userId: adminUserId,
      action: 'MATCH_ADVANCED',
      entityType: 'match',
      entityId: data.matchId,
      details: `Winner: ${data.winnerId}, Phase: ${match.phase}`,
    })
  })

  // Notify traders
  const winner = match.trader1Id === data.winnerId ? match.trader1 : match.trader2
  const loser = match.trader1Id === loserId ? match.trader1 : match.trader2

  return NextResponse.json({ success: true, winnerId: data.winnerId })
}

const createMatchSchema = z.object({
  phase: z.nativeEnum(TournamentPhase),
  matchNumber: z.number().int(),
  trader1Id: z.string(),
  trader2Id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
})

async function createMatch(req: NextRequest, adminUserId: string) {
  const body = await req.json()
  const data = createMatchSchema.parse(body)

  const match = await db.match.create({
    data: {
      phase: data.phase,
      matchNumber: data.matchNumber,
      trader1Id: data.trader1Id,
      trader2Id: data.trader2Id,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      status: 'SCHEDULED',
    },
    include: {
      trader1: { include: { country: true } },
      trader2: { include: { country: true } },
    },
  })

  // Provision accounts for both traders
  const config = await db.tournamentConfig.findFirst()
  for (const traderId of [data.trader1Id, data.trader2Id]) {
    const accountNumber = `HP-WC-${data.phase}-${Date.now().toString(36).toUpperCase()}`
    await db.tradingAccount.create({
      data: {
        traderId,
        accountNumber,
        phase: data.phase,
        status: 'PENDING',
        openingBalance: config?.knockoutAccountSize || 10000,
        currentBalance: config?.knockoutAccountSize || 10000,
        currentEquity: config?.knockoutAccountSize || 10000,
        peakBalance: config?.knockoutAccountSize || 10000,
      },
    })
  }

  // Send match announcement emails
  if (match.trader1 && match.trader2) {
    const phaseLabel = data.phase.replace(/_/g, ' ')
    await sendEmail({
      to: match.trader1.email,
      subject: `⚔️ Your ${phaseLabel} match has been drawn!`,
      html: templateMatchAnnouncement({
        firstName: match.trader1.firstName,
        opponentName: match.trader2.displayName,
        opponentCountry: match.trader2.country.name,
        phase: phaseLabel,
        startDate: new Date(data.startTime).toLocaleDateString(),
        endDate: new Date(data.endTime).toLocaleDateString(),
      }),
      traderId: match.trader1.id,
      template: 'match_announcement',
    })
    await sendEmail({
      to: match.trader2.email,
      subject: `⚔️ Your ${phaseLabel} match has been drawn!`,
      html: templateMatchAnnouncement({
        firstName: match.trader2.firstName,
        opponentName: match.trader1.displayName,
        opponentCountry: match.trader1.country.name,
        phase: phaseLabel,
        startDate: new Date(data.startTime).toLocaleDateString(),
        endDate: new Date(data.endTime).toLocaleDateString(),
      }),
      traderId: match.trader2.id,
      template: 'match_announcement',
    })
  }

  return NextResponse.json({ success: true, match })
}
