// src/app/api/leaderboard/route.ts
// Returns live qualifier/bracket leaderboard.
// Falls back to all registered ACTIVE traders when no qualifier entries exist yet
// (pre-qualifier phase) so the leaderboard always shows real registered users.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function flagImageUrl(code: string | null | undefined): string | null {
  if (!code) return null
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phase   = searchParams.get('phase') || 'QUALIFIER'
    const country = searchParams.get('country')
    const page    = parseInt(searchParams.get('page')  || '1')
    const limit   = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const skip    = (page - 1) * limit

    // ── 1. Try qualifier entries (filled by trading platform sync) ────────────
    if (phase === 'QUALIFIER') {
      const entryWhere: any = {}
      if (country) {
        const cr = await db.country.findUnique({ where: { code: country } })
        if (cr) entryWhere.trader = { countryId: cr.id }
      }

      const entryCount = await db.qualifierEntry.count({ where: entryWhere })

      // ── 1a. Qualifier entries exist → return them ranked ──────────────────
      if (entryCount > 0) {
        const [entries, total] = await Promise.all([
          db.qualifierEntry.findMany({
            where: entryWhere,
            skip, take: limit,
            orderBy: [{ returnPct: 'desc' }, { maxDrawdown: 'asc' }, { totalTrades: 'desc' }],
            include: {
              trader: {
                select: {
                  id: true, displayName: true, status: true,
                  country: { select: { code: true, name: true } },
                  accounts: {
                    where: { phase: 'QUALIFIER', status: 'ACTIVE' },
                    select: {
                      currentBalance: true, openingBalance: true,
                      totalTrades: true, winningTrades: true,
                      maxDrawdown: true, dailyDrawdown: true, lastSyncAt: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          }),
          db.qualifierEntry.count({ where: entryWhere }),
        ])

        const leaderboard = entries.map((entry, idx) => {
          const acct        = entry.trader.accounts[0]
          const code        = entry.trader.country?.code ?? ''
          const opening     = acct ? parseFloat(acct.openingBalance.toString()) : 10000
          const balance     = acct ? parseFloat(acct.currentBalance.toString()) : opening
          const returnPct   = parseFloat(entry.returnPct.toString())
          const pnlUsd      = balance - opening
          return {
            rank:           skip + idx + 1,
            traderId:       entry.traderId,
            displayName:    entry.trader.displayName,
            countryCode:    code,
            countryName:    entry.trader.country?.name ?? '',
            flagImageUrl:   flagImageUrl(code),
            returnPct,
            pnlUsd,
            maxDrawdown:    parseFloat(entry.maxDrawdown.toString()),
            dailyDrawdown:  acct?.dailyDrawdown ? parseFloat(acct.dailyDrawdown.toString()) : 0,
            totalTrades:    entry.totalTrades,
            winRate:        acct && acct.totalTrades > 0
                              ? Math.round((acct.winningTrades / acct.totalTrades) * 100)
                              : 0,
            sharpeRatio:    entry.sharpeRatio ? parseFloat(entry.sharpeRatio.toString()) : null,
            qualified:      entry.qualified,
            currentBalance: balance,
            openingBalance: opening,
            lastUpdated:    acct?.lastSyncAt ?? null,
            status:         entry.trader.status,
          }
        })

        return NextResponse.json({
          leaderboard,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          phase, source: 'qualifier_entries',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // ── 2. Fallback: return all ACTIVE traders ordered by account balance ─────
    // Used during registration phase or when trading platform hasn't pushed data yet
    const traderWhere: any = { status: { in: ['ACTIVE', 'KYC_APPROVED', 'REGISTERED', 'KYC_PENDING'] } }
    if (country) {
      const cr = await db.country.findUnique({ where: { code: country } })
      if (cr) traderWhere.countryId = cr.id
    }

    const [traders, total] = await Promise.all([
      db.trader.findMany({
        where: traderWhere,
        skip, take: limit,
        orderBy: [{ displayName: 'asc' }],
        select: {
          id: true, displayName: true, status: true,
          country: { select: { code: true, name: true } },
          accounts: {
            orderBy: { createdAt: 'desc' },
            select: {
              currentBalance: true, openingBalance: true,
              totalTrades: true, winningTrades: true,
              maxDrawdown: true, dailyDrawdown: true, lastSyncAt: true,
            },
            take: 1,
          },
        },
      }),
      db.trader.count({ where: traderWhere }),
    ])

    const leaderboard = traders.map((trader, idx) => {
      const acct      = trader.accounts[0]
      const code      = trader.country?.code ?? ''
      const opening   = acct ? parseFloat(acct.openingBalance.toString()) : 10000
      const balance   = acct ? parseFloat(acct.currentBalance.toString()) : opening
      const returnPct = opening > 0 ? ((balance - opening) / opening) * 100 : 0
      const pnlUsd    = balance - opening
      return {
        rank:           skip + idx + 1,
        traderId:       trader.id,
        displayName:    trader.displayName,
        countryCode:    code,
        countryName:    trader.country?.name ?? '',
        flagImageUrl:   flagImageUrl(code),
        returnPct:      parseFloat(returnPct.toFixed(4)),
        pnlUsd:         parseFloat(pnlUsd.toFixed(2)),
        maxDrawdown:    acct?.maxDrawdown ? parseFloat(acct.maxDrawdown.toString()) : 0,
        dailyDrawdown:  acct?.dailyDrawdown ? parseFloat(acct.dailyDrawdown.toString()) : 0,
        totalTrades:    acct?.totalTrades ?? 0,
        winRate:        acct && acct.totalTrades > 0
                          ? Math.round((acct.winningTrades / acct.totalTrades) * 100)
                          : 0,
        qualified:      false,
        currentBalance: balance,
        openingBalance: opening,
        lastUpdated:    acct?.lastSyncAt ?? null,
        status:         trader.status,
      }
    })

    return NextResponse.json({
      leaderboard,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      phase, source: 'registered_traders',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
