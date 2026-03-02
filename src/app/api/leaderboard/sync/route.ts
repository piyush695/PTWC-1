// src/app/api/leaderboard/sync/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Trading Platform Webhook / Sync Endpoint
//
// Your MT5/cTrader broker integration calls POST /api/leaderboard/sync
// to push live account data. This updates TradingAccount stats in the DB
// which the leaderboard reads automatically.
//
// Authentication: Bearer token via SYNC_SECRET env var
//
// Payload (single account):
//   { "accountNumber": "HP-WC-A1B2", "balance": 11482.40, "equity": 11620.18,
//     "openPnL": 137.78, "totalTrades": 34, "winningTrades": 25,
//     "maxDrawdown": 2.14, "dailyDrawdown": 0.44 }
//
// Payload (batch):
//   { "accounts": [ { ...single }, { ...single }, ... ] }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const SYNC_SECRET = process.env.SYNC_SECRET || 'dev-sync-secret-change-in-prod'

interface AccountPayload {
  accountNumber:   string
  balance:         number
  equity?:         number
  openPnL?:        number
  totalTrades:     number
  winningTrades?:  number
  maxDrawdown:     number
  dailyDrawdown?:  number
  openPositions?:  number
  lastTradeAt?:    string
}

async function processAccount(p: AccountPayload) {
  const account = await db.tradingAccount.findUnique({
    where: { accountNumber: p.accountNumber },
    select: { id: true, traderId: true, phase: true, openingBalance: true },
  })

  if (!account) {
    return { accountNumber: p.accountNumber, status: 'not_found' }
  }

  const opening    = parseFloat(account.openingBalance.toString())
  const balance    = p.balance
  const returnPct  = opening > 0 ? ((balance - opening) / opening) * 100 : 0

  // Update account
  await db.tradingAccount.update({
    where: { id: account.id },
    data: {
      currentBalance:  balance,
      equity:          p.equity ?? balance,
      openPnL:         p.openPnL ?? 0,
      totalTrades:     p.totalTrades,
      winningTrades:   p.winningTrades ?? 0,
      maxDrawdown:     p.maxDrawdown,
      dailyDrawdown:   p.dailyDrawdown ?? 0,
      openPositions:   p.openPositions ?? 0,
      lastSyncAt:      new Date(),
    },
  })

  // Upsert qualifier entry (keeps leaderboard rank fresh)
  if (account.phase === 'QUALIFIER') {
    await db.qualifierEntry.upsert({
      where: { traderId: account.traderId },
      create: {
        traderId:     account.traderId,
        accountId:    account.id,
        returnPct,
        maxDrawdown:  p.maxDrawdown,
        totalTrades:  p.totalTrades,
        qualified:    false,
      },
      update: {
        returnPct,
        maxDrawdown:  p.maxDrawdown,
        totalTrades:  p.totalTrades,
      },
    })
  }

  return { accountNumber: p.accountNumber, status: 'updated', returnPct: returnPct.toFixed(4) }
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    // Batch mode
    if (Array.isArray(body.accounts)) {
      const results = await Promise.allSettled(
        body.accounts.map((a: AccountPayload) => processAccount(a))
      )
      const summary = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { index: i, error: (r as any).reason?.message }
      )
      return NextResponse.json({
        success: true,
        processed: summary.filter((s: any) => s.status === 'updated').length,
        skipped:   summary.filter((s: any) => s.status === 'not_found').length,
        errors:    summary.filter((s: any) => s.error).length,
        results: summary,
        timestamp: new Date().toISOString(),
      })
    }

    // Single account mode
    const result = await processAccount(body as AccountPayload)
    return NextResponse.json({ success: true, result, timestamp: new Date().toISOString() })

  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Internal error', detail: error.message }, { status: 500 })
  }
}

// GET: returns sync status and last sync timestamps (for admin health checks)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const accounts = await db.tradingAccount.findMany({
    select: { accountNumber: true, lastSyncAt: true, phase: true, status: true },
    orderBy: { lastSyncAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ accounts, timestamp: new Date().toISOString() })
}
