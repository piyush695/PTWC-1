// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function flagImageUrl(code: string | null | undefined): string | null {
  if (!code) return null
  return `https://flagcdn.com/w80/${(code||'').toLowerCase()}.png`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phase   = searchParams.get('phase') || 'QUALIFIER'
    const country = searchParams.get('country')
    const page    = parseInt(searchParams.get('page') || '1')
    const limit   = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const skip    = (page - 1) * limit

    // Shared account select — only fields that actually exist in TradingAccount schema
    const accountSelect = {
      currentBalance: true,
      openingBalance: true,
      totalTrades:    true,
      winningTrades:  true,
      maxDrawdown:    true,
      lastSyncAt:     true,
    }

    // 1. Try qualifier entries (only once trading has started)
    if (phase === 'QUALIFIER') {
      try {
        const entryWhere: any = {}
        if (country) {
          const cr = await db.country.findUnique({ where: { code: country } })
          if (cr) entryWhere.trader = { countryId: cr.id }
        }
        const entryCount = await db.qualifierEntry.count({ where: entryWhere })
        if (entryCount > 0) {
          const [entries, total] = await Promise.all([
            db.qualifierEntry.findMany({
              where: entryWhere, skip, take: limit,
              orderBy: [{ returnPct: 'desc' }, { maxDrawdown: 'asc' }],
              include: {
                trader: {
                  select: {
                    id: true, displayName: true, status: true,
                    country: { select: { code: true, name: true } },
                    accounts: { orderBy: { createdAt: 'desc' }, select: accountSelect, take: 1 },
                  },
                },
              },
            }),
            db.qualifierEntry.count({ where: entryWhere }),
          ])
          const leaderboard = entries.map((entry, idx) => {
            const acct    = entry.trader.accounts[0]
            const code    = entry.trader.country?.code ?? ''
            const opening = acct ? parseFloat(acct.openingBalance.toString()) : 10000
            const balance = acct ? parseFloat(acct.currentBalance.toString()) : opening
            return {
              rank:           skip + idx + 1,
              traderId:       entry.traderId,
              displayName:    entry.trader.displayName,
              countryCode:    code,
              countryName:    entry.trader.country?.name ?? '',
              flagImageUrl:   flagImageUrl(code),
              returnPct:      parseFloat(entry.returnPct.toString()),
              pnlUsd:         parseFloat((balance - opening).toFixed(2)),
              maxDrawdown:    parseFloat(entry.maxDrawdown.toString()),
              totalTrades:    entry.totalTrades,
              winRate:        acct && acct.totalTrades > 0 ? Math.round((acct.winningTrades / acct.totalTrades) * 100) : 0,
              sharpeRatio:    entry.sharpeRatio ? parseFloat(entry.sharpeRatio.toString()) : null,
              qualified:      entry.qualified,
              currentBalance: balance,
              openingBalance: opening,
              lastUpdated:    acct?.lastSyncAt ?? null,
              status:         entry.trader.status,
            }
          })
          return NextResponse.json({ leaderboard, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, phase, source: 'qualifier_entries', timestamp: new Date().toISOString() })
        }
      } catch (_e) {
        // QualifierEntry not ready — fall through
      }
    }

    // 2. Fallback: all registered traders
    const traderWhere: any = { status: { in: ['ACTIVE', 'KYC_APPROVED', 'REGISTERED', 'KYC_PENDING'] } }
    if (country) {
      const cr = await db.country.findUnique({ where: { code: country } })
      if (cr) traderWhere.countryId = cr.id
    }
    const [traders, total] = await Promise.all([
      db.trader.findMany({
        where: traderWhere, skip, take: limit,
        orderBy: [{ displayName: 'asc' }],
        select: {
          id: true, displayName: true, status: true,
          country: { select: { code: true, name: true } },
          accounts: { orderBy: { createdAt: 'desc' }, select: accountSelect, take: 1 },
        },
      }),
      db.trader.count({ where: traderWhere }),
    ])
    const leaderboard = traders.map((trader, idx) => {
      const acct    = trader.accounts[0]
      const code    = trader.country?.code ?? ''
      const opening = acct ? parseFloat(acct.openingBalance.toString()) : 10000
      const balance = acct ? parseFloat(acct.currentBalance.toString()) : opening
      const retPct  = opening > 0 ? ((balance - opening) / opening) * 100 : 0
      return {
        rank:           skip + idx + 1,
        traderId:       trader.id,
        displayName:    trader.displayName,
        countryCode:    code,
        countryName:    trader.country?.name ?? '',
        flagImageUrl:   flagImageUrl(code),
        returnPct:      parseFloat(retPct.toFixed(4)),
        pnlUsd:         parseFloat((balance - opening).toFixed(2)),
        maxDrawdown:    acct?.maxDrawdown ? parseFloat(acct.maxDrawdown.toString()) : 0,
        totalTrades:    acct?.totalTrades ?? 0,
        winRate:        acct && acct.totalTrades > 0 ? Math.round((acct.winningTrades / acct.totalTrades) * 100) : 0,
        qualified:      false,
        currentBalance: balance,
        openingBalance: opening,
        lastUpdated:    acct?.lastSyncAt ?? null,
        status:         trader.status,
      }
    })
    return NextResponse.json({ leaderboard, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, phase, source: 'registered_traders', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
