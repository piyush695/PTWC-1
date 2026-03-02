// src/lib/bracket.ts
// H2H Tournament Bracket Engine

import { TournamentPhase, MatchStatus } from '@prisma/client'

export interface BracketSlot {
  seed: number
  traderId: string | null
  traderName: string | null
  countryCode: string | null
  countryFlag: string | null
  isBye: boolean
}

export interface BracketMatch {
  matchNumber: number
  phase: TournamentPhase
  slot1: BracketSlot | null
  slot2: BracketSlot | null
  winnerId: string | null
  status: MatchStatus
  trader1ReturnPct?: number | null
  trader2ReturnPct?: number | null
  startTime?: Date | null
  endTime?: Date | null
}

export interface BracketRound {
  phase: TournamentPhase
  label: string
  matches: BracketMatch[]
}

/**
 * Standard tournament seeding - top seed vs lowest seed
 * 1 vs 32, 16 vs 17, 8 vs 25, etc.
 */
export function generateInitialMatchups(
  seeds: BracketSlot[],
  bracketSize: number = 32
): Array<[BracketSlot | null, BracketSlot | null]> {
  // Pad with byes if fewer than bracket size
  const padded: Array<BracketSlot | null> = [...seeds]
  while (padded.length < bracketSize) {
    padded.push(null) // bye
  }

  const matchups: Array<[BracketSlot | null, BracketSlot | null]> = []

  // Standard bracket pairing
  function buildMatchups(slots: Array<BracketSlot | null>): void {
    if (slots.length === 2) {
      matchups.push([slots[0], slots[1]])
      return
    }
    const half = slots.length / 2
    for (let i = 0; i < half; i++) {
      matchups.push([slots[i], slots[slots.length - 1 - i]])
    }
  }

  // Top half
  const topHalf = padded.slice(0, bracketSize / 2)
  const bottomHalf = padded.slice(bracketSize / 2)

  for (let i = 0; i < topHalf.length; i++) {
    matchups.push([topHalf[i], bottomHalf[topHalf.length - 1 - i]])
  }

  return matchups
}

/**
 * Build the full bracket structure for display
 */
export function buildBracketDisplay(
  qualifiedTraders: Array<{
    seed: number
    traderId: string
    traderName: string
    countryCode: string
    countryFlag: string
  }>,
  existingMatches: Array<{
    matchNumber: number
    phase: TournamentPhase
    trader1Id: string | null
    trader2Id: string | null
    winnerId: string | null
    status: MatchStatus
    trader1ReturnPct: number | null
    trader2ReturnPct: number | null
    startTime: Date | null
    endTime: Date | null
  }>,
  bracketSize: number = 32
): BracketRound[] {
  const phases: Array<{ phase: TournamentPhase; label: string; matchCount: number }> = [
    { phase: TournamentPhase.ROUND_OF_32,   label: 'Round of 32',    matchCount: 16 },
    { phase: TournamentPhase.ROUND_OF_16,   label: 'Round of 16',    matchCount: 8  },
    { phase: TournamentPhase.QUARTERFINAL,  label: 'Quarterfinals',  matchCount: 4  },
    { phase: TournamentPhase.SEMIFINAL,     label: 'Semifinals',     matchCount: 2  },
    { phase: TournamentPhase.GRAND_FINAL,   label: 'Grand Final',    matchCount: 1  },
  ]

  const traderMap = new Map(qualifiedTraders.map(t => [t.traderId, t]))

  return phases.map(({ phase, label, matchCount }) => {
    const phaseMatches = existingMatches
      .filter(m => m.phase === phase)
      .sort((a, b) => a.matchNumber - b.matchNumber)

    // Fill empty matches for bracket display
    const matches: BracketMatch[] = Array.from({ length: matchCount }, (_, i) => {
      const existing = phaseMatches.find(m => m.matchNumber === i + 1)

      if (existing) {
        const t1 = existing.trader1Id ? traderMap.get(existing.trader1Id) : null
        const t2 = existing.trader2Id ? traderMap.get(existing.trader2Id) : null

        return {
          matchNumber: i + 1,
          phase,
          slot1: t1 ? { seed: t1.seed, traderId: t1.traderId, traderName: t1.traderName, countryCode: t1.countryCode, countryFlag: t1.countryFlag, isBye: false } : null,
          slot2: t2 ? { seed: t2.seed, traderId: t2.traderId, traderName: t2.traderName, countryCode: t2.countryCode, countryFlag: t2.countryFlag, isBye: false } : null,
          winnerId: existing.winnerId,
          status: existing.status,
          trader1ReturnPct: existing.trader1ReturnPct,
          trader2ReturnPct: existing.trader2ReturnPct,
          startTime: existing.startTime,
          endTime: existing.endTime,
        }
      }

      return {
        matchNumber: i + 1,
        phase,
        slot1: null,
        slot2: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      }
    })

    return { phase, label, matches }
  })
}

/**
 * Advance winner to next round
 * Returns the next round's match number and slot (1 or 2)
 */
export function getNextMatchSlot(currentPhase: TournamentPhase, currentMatchNumber: number): {
  nextPhase: TournamentPhase
  nextMatchNumber: number
  slotNumber: 1 | 2
} | null {
  const phaseOrder = [
    TournamentPhase.ROUND_OF_32,
    TournamentPhase.ROUND_OF_16,
    TournamentPhase.QUARTERFINAL,
    TournamentPhase.SEMIFINAL,
    TournamentPhase.GRAND_FINAL,
  ]

  const currentIndex = phaseOrder.indexOf(currentPhase)
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) return null

  const nextPhase = phaseOrder[currentIndex + 1]
  const nextMatchNumber = Math.ceil(currentMatchNumber / 2)
  const slotNumber = currentMatchNumber % 2 === 1 ? 1 : 2

  return { nextPhase, nextMatchNumber, slotNumber }
}

/**
 * Get phase dates based on tournament config
 */
export function getPhaseDates(qualifierEnd: Date): Record<TournamentPhase, { start: Date; end: Date }> {
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000)

  const r32Start = addDays(qualifierEnd, 3) // 3 days prep after qualifier
  return {
    [TournamentPhase.REGISTRATION]: { start: addDays(qualifierEnd, -60), end: qualifierEnd },
    [TournamentPhase.QUALIFIER]: { start: addDays(qualifierEnd, -12), end: qualifierEnd },
    [TournamentPhase.ROUND_OF_32]:  { start: r32Start,           end: addDays(r32Start, 6)  },
    [TournamentPhase.ROUND_OF_16]:  { start: addDays(r32Start, 7),  end: addDays(r32Start, 13) },
    [TournamentPhase.QUARTERFINAL]: { start: addDays(r32Start, 14), end: addDays(r32Start, 20) },
    [TournamentPhase.SEMIFINAL]:    { start: addDays(r32Start, 21), end: addDays(r32Start, 25) },
    [TournamentPhase.GRAND_FINAL]:  { start: addDays(r32Start, 33), end: addDays(r32Start, 33) },
    [TournamentPhase.COMPLETED]:    { start: addDays(r32Start, 33), end: addDays(r32Start, 33) },
  }
}

/**
 * Validate a match result before recording
 */
export function validateMatchResult(params: {
  trader1Id: string
  trader2Id: string
  winnerId: string
  trader1Trades: number
  trader2Trades: number
  trader1ReturnPct: number
  trader2ReturnPct: number
  minTrades: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (params.winnerId !== params.trader1Id && params.winnerId !== params.trader2Id) {
    errors.push('Winner must be one of the two traders in the match')
  }

  if (params.trader1Trades < params.minTrades) {
    errors.push(`Trader 1 has ${params.trader1Trades} trades, minimum is ${params.minTrades}`)
  }

  if (params.trader2Trades < params.minTrades) {
    errors.push(`Trader 2 has ${params.trader2Trades} trades, minimum is ${params.minTrades}`)
  }

  return { valid: errors.length === 0, errors }
}
