// src/lib/scoring.ts
// Core Tournament Scoring Engine

import { Decimal } from '@prisma/client/runtime/library'

export interface AccountSnapshot {
  openingBalance: number
  currentBalance: number
  currentEquity: number
  peakBalance: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  dailyReturns?: number[]  // for Sharpe calculation
}

export interface ScorecardResult {
  returnPct: number
  maxDrawdownPct: number
  sharpeRatio: number | null
  winRate: number
  totalTrades: number
  isEligible: boolean
  disqualificationReason?: string
}

export interface MatchResult {
  winnerId: string
  trader1ReturnPct: number
  trader2ReturnPct: number
  tiebreaker?: string
}

/**
 * Calculate a trader's scorecard for a given round
 */
export function calculateScorecard(
  snapshot: AccountSnapshot,
  minTrades: number,
  maxDailyDrawdownPct: number,
  maxTotalDrawdownPct: number
): ScorecardResult {
  const returnPct = ((snapshot.currentBalance - snapshot.openingBalance) / snapshot.openingBalance) * 100

  // Max drawdown: (peak - current) / peak
  const maxDrawdownPct = snapshot.peakBalance > 0
    ? ((snapshot.peakBalance - Math.min(snapshot.currentBalance, snapshot.currentEquity)) / snapshot.peakBalance) * 100
    : 0

  const winRate = snapshot.totalTrades > 0
    ? (snapshot.winningTrades / snapshot.totalTrades) * 100
    : 0

  // Sharpe ratio (annualized, simplified)
  let sharpeRatio: number | null = null
  if (snapshot.dailyReturns && snapshot.dailyReturns.length >= 2) {
    const mean = snapshot.dailyReturns.reduce((a, b) => a + b, 0) / snapshot.dailyReturns.length
    const variance = snapshot.dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / snapshot.dailyReturns.length
    const stdDev = Math.sqrt(variance)
    // Annualize: multiply by sqrt(252) for daily data
    sharpeRatio = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : null
  }

  // Eligibility checks
  let isEligible = true
  let disqualificationReason: string | undefined

  if (snapshot.totalTrades < minTrades) {
    isEligible = false
    disqualificationReason = `Minimum trades not met: ${snapshot.totalTrades}/${minTrades}`
  }

  if (maxDrawdownPct > maxTotalDrawdownPct) {
    isEligible = false
    disqualificationReason = `Max drawdown exceeded: ${maxDrawdownPct.toFixed(2)}% > ${maxTotalDrawdownPct}%`
  }

  return {
    returnPct: parseFloat(returnPct.toFixed(4)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(4)),
    sharpeRatio: sharpeRatio ? parseFloat(sharpeRatio.toFixed(4)) : null,
    winRate: parseFloat(winRate.toFixed(2)),
    totalTrades: snapshot.totalTrades,
    isEligible,
    disqualificationReason,
  }
}

/**
 * Determine the winner of an H2H match
 */
export function determineMatchWinner(
  trader1Id: string,
  trader2Id: string,
  trader1Score: ScorecardResult,
  trader2Score: ScorecardResult
): MatchResult {
  // Primary: net % return
  if (trader1Score.returnPct !== trader2Score.returnPct) {
    return {
      winnerId: trader1Score.returnPct > trader2Score.returnPct ? trader1Id : trader2Id,
      trader1ReturnPct: trader1Score.returnPct,
      trader2ReturnPct: trader2Score.returnPct,
    }
  }

  // Tiebreaker 1: lower max drawdown
  if (trader1Score.maxDrawdownPct !== trader2Score.maxDrawdownPct) {
    return {
      winnerId: trader1Score.maxDrawdownPct < trader2Score.maxDrawdownPct ? trader1Id : trader2Id,
      trader1ReturnPct: trader1Score.returnPct,
      trader2ReturnPct: trader2Score.returnPct,
      tiebreaker: 'Lower Max Drawdown',
    }
  }

  // Tiebreaker 2: more trades
  return {
    winnerId: trader1Score.totalTrades >= trader2Score.totalTrades ? trader1Id : trader2Id,
    trader1ReturnPct: trader1Score.returnPct,
    trader2ReturnPct: trader2Score.returnPct,
    tiebreaker: 'More Trades',
  }
}

/**
 * Rank traders for the qualifier leaderboard
 * Primary: return%, Secondary: max drawdown (lower = better), Tertiary: sharpe
 */
export function rankQualifierTraders(traders: Array<{
  traderId: string
  countryId: string
  scorecard: ScorecardResult
}>) {
  const eligible = traders.filter(t => t.scorecard.isEligible)

  return eligible.sort((a, b) => {
    if (b.scorecard.returnPct !== a.scorecard.returnPct)
      return b.scorecard.returnPct - a.scorecard.returnPct

    if (a.scorecard.maxDrawdownPct !== b.scorecard.maxDrawdownPct)
      return a.scorecard.maxDrawdownPct - b.scorecard.maxDrawdownPct

    const sharpeA = a.scorecard.sharpeRatio ?? -Infinity
    const sharpeB = b.scorecard.sharpeRatio ?? -Infinity
    return sharpeB - sharpeA
  }).map((t, i) => ({ ...t, rank: i + 1 }))
}

/**
 * Select top 1 trader per country from ranked list
 * Returns the bracket seeding (32 positions)
 */
export function selectBracketTraders(
  rankedTraders: Array<{
    traderId: string
    countryId: string
    rank: number
    scorecard: ScorecardResult
  }>,
  maxBracketSize: number = 32
) {
  const selectedByCountry = new Map<string, typeof rankedTraders[0]>()

  for (const trader of rankedTraders) {
    if (!selectedByCountry.has(trader.countryId)) {
      selectedByCountry.set(trader.countryId, trader)
    }
  }

  // Sort selected traders by their global rank to determine bracket seed
  const selected = Array.from(selectedByCountry.values())
    .sort((a, b) => a.rank - b.rank)
    .slice(0, maxBracketSize)

  return selected.map((t, i) => ({ ...t, seed: i + 1 }))
}

/**
 * Anti-cheat: detect suspicious trading patterns
 */
export function detectSuspiciousActivity(trades: Array<{
  openTime: Date
  closeTime: Date | null
  lots: number
  profit: number | null
  symbol: string
  direction: string
}>, config: {
  minTradeDurationSeconds: number
  maxTradesPerHour: number
  maxPositionSizePct: number
  accountBalance: number
}): Array<{ tradeIndex: number; reason: string }> {
  const flags: Array<{ tradeIndex: number; reason: string }> = []

  trades.forEach((trade, i) => {
    if (!trade.closeTime) return

    const durationSeconds = (trade.closeTime.getTime() - trade.openTime.getTime()) / 1000

    // Too fast — possible HFT/arbitrage
    if (durationSeconds < config.minTradeDurationSeconds) {
      flags.push({ tradeIndex: i, reason: `Trade duration ${durationSeconds.toFixed(1)}s below minimum ${config.minTradeDurationSeconds}s` })
    }

    // Max position size check (lots * 100,000 standard lot / balance)
    const notionalValue = trade.lots * 100000
    const positionSizePct = (notionalValue / config.accountBalance) * 100
    if (positionSizePct > config.maxPositionSizePct) {
      flags.push({ tradeIndex: i, reason: `Position size ${positionSizePct.toFixed(1)}% exceeds max ${config.maxPositionSizePct}%` })
    }
  })

  // Check trades per hour in any 60-minute window
  const sortedTimes = trades.map(t => t.openTime.getTime()).sort((a, b) => a - b)
  for (let i = 0; i < sortedTimes.length; i++) {
    const windowEnd = sortedTimes[i] + 3600000
    const inWindow = sortedTimes.filter(t => t >= sortedTimes[i] && t <= windowEnd).length
    if (inWindow > config.maxTradesPerHour) {
      flags.push({ tradeIndex: i, reason: `${inWindow} trades in 1-hour window — possible HFT` })
      break
    }
  }

  return flags
}
