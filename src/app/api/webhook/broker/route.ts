// src/app/api/webhook/broker/route.ts
// Handles real-time trade events from broker (MT5 webhooks)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncAccount } from '@/lib/broker'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Validate webhook signature
  const signature = req.headers.get('x-broker-signature')
  const expectedSig = process.env.MT5_WEBHOOK_SECRET

  if (expectedSig && signature !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = await req.json()

  // Log webhook
  await db.webhookLog.create({
    data: {
      source: 'broker',
      event: payload.event || 'unknown',
      payload: JSON.stringify(payload),
    },
  })

  const { event, accountId: brokerAccountId, data } = payload

  // Find our account
  const account = await db.tradingAccount.findFirst({
    where: { brokerAccountId },
  })

  if (!account) {
    return NextResponse.json({ received: true, matched: false })
  }

  switch (event) {
    case 'trade.opened':
    case 'trade.closed':
    case 'account.updated':
      await syncAccount(account.id)
      break

    case 'drawdown.breach.daily':
      await handleDrawdownBreach(account.id, 'DAILY', data)
      break

    case 'drawdown.breach.total':
      await handleDrawdownBreach(account.id, 'TOTAL', data)
      break
  }

  // Mark webhook as processed
  await db.webhookLog.updateMany({
    where: { source: 'broker', processed: false },
    data: { processed: true },
  })

  return NextResponse.json({ received: true })
}

async function handleDrawdownBreach(accountId: string, type: 'DAILY' | 'TOTAL', data: any) {
  const account = await db.tradingAccount.findUnique({
    where: { id: accountId },
    include: { trader: true },
  })

  if (!account) return

  // Freeze account
  await db.tradingAccount.update({
    where: { id: accountId },
    data: { status: 'FROZEN' },
  })

  // Get tournament config for current phase
  const config = await db.tournamentConfig.findFirst()

  // Create disqualification record
  await db.disqualification.create({
    data: {
      traderId: account.traderId,
      reason: type === 'DAILY' ? 'DAILY_DRAWDOWN_BREACH' : 'MAX_DRAWDOWN_BREACH',
      details: `${type} drawdown limit breached. Current drawdown: ${data?.currentDrawdown?.toFixed(2)}%`,
      phase: config?.currentPhase || 'QUALIFIER',
      issuedBy: 'SYSTEM',
    },
  })

  // Update trader status
  await db.trader.update({
    where: { id: account.traderId },
    data: { status: 'DISQUALIFIED' },
  })
}
