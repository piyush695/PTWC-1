// src/lib/broker.ts
// Broker API abstraction layer (MT5 / cTrader)
// Swap out the implementation for your actual broker's API

import { db } from './db'
import { detectSuspiciousActivity } from './scoring'

interface BrokerTrade {
  brokerTradeId: string
  symbol: string
  direction: 'BUY' | 'SELL'
  openTime: Date
  closeTime: Date | null
  openPrice: number
  closePrice: number | null
  lots: number
  profit: number | null
  commission: number
  swap: number
  isOpen: boolean
}

interface BrokerAccountInfo {
  brokerAccountId: string
  balance: number
  equity: number
  margin: number
  freeMargin: number
  trades: BrokerTrade[]
}

// ─── MOCK BROKER — Replace with real MT5 API ──────────────────────────────
async function fetchBrokerAccount(brokerAccountId: string): Promise<BrokerAccountInfo | null> {
  // TODO: Replace with actual MT5/cTrader API call
  // Example MT5 REST API:
  // const res = await fetch(`${process.env.MT5_API_URL}/accounts/${brokerAccountId}`, {
  //   headers: { 'X-API-Key': process.env.MT5_API_KEY! }
  // })

  // Returning mock data for development
  return {
    brokerAccountId,
    balance: 10000 + Math.random() * 2000 - 500,
    equity: 10000 + Math.random() * 1800 - 400,
    margin: Math.random() * 500,
    freeMargin: 9000 + Math.random() * 1000,
    trades: generateMockTrades(brokerAccountId),
  }
}

function generateMockTrades(accountId: string): BrokerTrade[] {
  const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'US30', 'NAS100']
  const count = Math.floor(Math.random() * 20) + 5
  const now = Date.now()

  return Array.from({ length: count }, (_, i) => {
    const openTime = new Date(now - Math.random() * 86400000 * 10)
    const isClosed = Math.random() > 0.3
    const closeTime = isClosed ? new Date(openTime.getTime() + Math.random() * 3600000 * 8) : null
    const profit = isClosed ? (Math.random() - 0.4) * 200 : null

    return {
      brokerTradeId: `${accountId}-T${i + 1}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
      openTime,
      closeTime,
      openPrice: 1.08 + Math.random() * 0.01,
      closePrice: isClosed ? 1.08 + Math.random() * 0.01 : null,
      lots: parseFloat((Math.random() * 0.5 + 0.01).toFixed(2)),
      profit,
      commission: -1.5,
      swap: Math.random() > 0.5 ? -0.5 : 0,
      isOpen: !isClosed,
    }
  })
}

// ─── SYNC FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Sync a single trading account from broker
 */
export async function syncAccount(accountId: string): Promise<void> {
  const account = await db.tradingAccount.findUnique({
    where: { id: accountId },
    include: { trader: true },
  })

  if (!account || !account.brokerAccountId) return

  const brokerData = await fetchBrokerAccount(account.brokerAccountId)
  if (!brokerData) return

  const winningTrades = brokerData.trades.filter(t => !t.isOpen && (t.profit ?? 0) > 0).length
  const losingTrades = brokerData.trades.filter(t => !t.isOpen && (t.profit ?? 0) < 0).length
  const totalVolume = brokerData.trades.reduce((sum, t) => sum + t.lots, 0)

  const peakBalance = Math.max(account.peakBalance.toNumber(), brokerData.balance, brokerData.equity)
  const maxDrawdown = peakBalance > 0
    ? ((peakBalance - Math.min(brokerData.balance, brokerData.equity)) / peakBalance) * 100
    : 0

  // Update account
  await db.tradingAccount.update({
    where: { id: accountId },
    data: {
      currentBalance: brokerData.balance,
      currentEquity: brokerData.equity,
      peakBalance,
      maxDrawdown,
      totalTrades: brokerData.trades.filter(t => !t.isOpen).length,
      winningTrades,
      losingTrades,
      totalVolumeLots: totalVolume,
      lastSyncAt: new Date(),
    },
  })

  // Upsert trades
  for (const trade of brokerData.trades) {
    await db.trade.upsert({
      where: { brokerTradeId: trade.brokerTradeId },
      create: {
        accountId,
        brokerTradeId: trade.brokerTradeId,
        symbol: trade.symbol,
        direction: trade.direction,
        openTime: trade.openTime,
        closeTime: trade.closeTime,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        lots: trade.lots,
        profit: trade.profit,
        commission: trade.commission,
        swap: trade.swap,
        isOpen: trade.isOpen,
      },
      update: {
        closeTime: trade.closeTime,
        closePrice: trade.closePrice,
        profit: trade.profit,
        isOpen: trade.isOpen,
      },
    })
  }

  // Balance snapshot
  const returnPct = ((brokerData.balance - account.openingBalance.toNumber()) / account.openingBalance.toNumber()) * 100
  await db.balanceSnapshot.create({
    data: {
      accountId,
      balance: brokerData.balance,
      equity: brokerData.equity,
      drawdown: maxDrawdown,
      returnPct,
    },
  })

  // Run anti-cheat check
  const config = await db.tournamentConfig.findFirst()
  if (config) {
    const flags = detectSuspiciousActivity(
      brokerData.trades.map(t => ({
        openTime: t.openTime,
        closeTime: t.closeTime,
        lots: t.lots,
        profit: t.profit,
        symbol: t.symbol,
        direction: t.direction,
      })),
      {
        minTradeDurationSeconds: parseInt(process.env.MIN_TRADE_DURATION_SECONDS || '1'),
        maxTradesPerHour: parseInt(process.env.HFT_THRESHOLD_TRADES_PER_HOUR || '100'),
        maxPositionSizePct: config.maxPositionSizePct.toNumber(),
        accountBalance: brokerData.balance,
      }
    )

    if (flags.length > 0) {
      // Flag trades
      for (const flag of flags) {
        const trade = brokerData.trades[flag.tradeIndex]
        if (trade) {
          await db.trade.updateMany({
            where: { brokerTradeId: trade.brokerTradeId },
            data: { isFlaggedCheat: true, flagReason: flag.reason },
          })
        }
      }
    }
  }
}

/**
 * Sync all active accounts (called by cron job)
 */
export async function syncAllActiveAccounts(): Promise<void> {
  const accounts = await db.tradingAccount.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  })

  await Promise.allSettled(accounts.map(a => syncAccount(a.id)))
}

/**
 * Create a new broker account for a trader
 */
export async function provisionBrokerAccount(params: {
  traderId: string
  accountId: string
  openingBalance: number
  phase: string
}): Promise<string | null> {
  // TODO: Call broker API to create account
  // const res = await fetch(`${process.env.MT5_API_URL}/accounts`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.MT5_API_KEY! },
  //   body: JSON.stringify({ balance: params.openingBalance, leverage: 30, ... })
  // })

  // Mock: return a fake broker account ID
  const brokerAccountId = `MT5-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  await db.tradingAccount.update({
    where: { id: params.accountId },
    data: { brokerAccountId, status: 'ACTIVE' },
  })

  return brokerAccountId
}
