// src/lib/useTournamentConfig.ts
// Shared hook — fetches live config from /api/config
// Falls back to defaults instantly so pages never flash blank

'use client'
import { useState, useEffect } from 'react'

export interface TournamentConfig {
  name:                 string
  currentPhase:         string
  registrationOpen:     boolean
  registrationDeadline: string
  qualifierStart:       string
  qualifierEnd:         string
  grandFinalDate:       string
  totalPrizePool:       number
  firstPrize:           number
  secondPrize:          number
  qualifierAccountSize: number
  knockoutAccountSize:  number
  maxLeverage:          number
  dailyDrawdownPct:     number
  totalDrawdownPct:     number
  minTradesPerRound:    number
  maxPositionSizePct:   number
  allowedInstruments:   string[]
}

export const DEFAULT_CONFIG: TournamentConfig = {
  name:                  'Hola Prime World Cup 2026',
  currentPhase:          'REGISTRATION',
  registrationOpen:      true,
  registrationDeadline:  '2026-05-30',
  qualifierStart:        '2026-06-01',
  qualifierEnd:          '2026-06-12',
  grandFinalDate:        '2026-07-18',
  totalPrizePool:        100000,
  firstPrize:            60000,
  secondPrize:           25000,
  qualifierAccountSize:  10000,
  knockoutAccountSize:   10000,
  maxLeverage:           30,
  dailyDrawdownPct:      8,
  totalDrawdownPct:      12,
  minTradesPerRound:     10,
  maxPositionSizePct:    5,
  allowedInstruments:    ['EURUSD','GBPUSD','USDJPY','XAUUSD','USOIL','US30','NAS100','GER40'],
}

// ── Formatting helpers ────────────────────────────────────────────────────────
export function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(n%1_000_000===0?0:1)}M`
  if (n >= 1_000)     return `$${(n/1_000).toFixed(n%1_000===0?0:1)}K`
  return `$${n.toLocaleString()}`
}

export function fmtMoneyFull(n: number): string {
  return `$${n.toLocaleString('en-US')}`
}

export function fmtDate(iso: string, fmt: 'short' | 'long' | 'monthday' = 'short'): string {
  try {
    const d = new Date(iso + 'T12:00:00Z')
    if (fmt === 'long')      return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric', timeZone:'UTC' })
    if (fmt === 'monthday')  return d.toLocaleDateString('en-US', { month:'short',  day:'numeric', timeZone:'UTC' })
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'UTC' })
  } catch { return iso }
}

export function fmtDateRange(start: string, end: string): string {
  try {
    const s = new Date(start + 'T12:00:00Z')
    const e = new Date(end   + 'T12:00:00Z')
    const sm = s.toLocaleDateString('en-US', { month:'short', timeZone:'UTC' })
    const em = e.toLocaleDateString('en-US', { month:'short', timeZone:'UTC' })
    const sd = s.getUTCDate(), ed = e.getUTCDate()
    if (sm === em) return `${sm} ${sd}–${ed}`
    return `${sm} ${sd} – ${em} ${ed}`
  } catch { return `${start} – ${end}` }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTournamentConfig() {
  const [config, setConfig] = useState<TournamentConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => { if (d.config) setConfig(d.config) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { config, loading }
}
