// src/app/api/prizes/route.ts
// Public endpoint — no auth required
// Returns all prize tiers, seeding defaults if none exist in DB yet
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const revalidate = 0

export const DEFAULT_PRIZES = [
  { key:'place_1',       label:'1st Place',          prize:'$60,000',       position:1  },
  { key:'place_2',       label:'2nd Place',           prize:'$25,000',       position:2  },
  { key:'place_3',       label:'3rd Place',           prize:'$10,000',       position:3  },
  { key:'place_4',       label:'4th Place',           prize:'$5,000',        position:4  },
  { key:'place_5',       label:'5th Place',           prize:'$3,500',        position:5  },
  { key:'place_6',       label:'6th Place',           prize:'$3,000',        position:6  },
  { key:'place_7',       label:'7th Place',           prize:'$2,500',        position:7  },
  { key:'place_8',       label:'8th Place',           prize:'$2,000',        position:8  },
  { key:'place_9',       label:'9th Place',           prize:'$1,500',        position:9  },
  { key:'place_10',      label:'10th Place',          prize:'$1,000',        position:10 },
  { key:'place_11_25',   label:'11th - 25th Place',   prize:'$500 each',     position:11 },
  { key:'place_26_50',   label:'26th - 50th Place',   prize:'$250 each',     position:12 },
  { key:'place_51_100',  label:'51st - 100th Place',  prize:'$100 each',     position:13 },
  { key:'most_lots',     label:'Most Lots Traded',    prize:'$2,000',        position:14 },
  { key:'lowest_dd',     label:'Lowest Drawdown',     prize:'$2,000',        position:15 },
]

export async function GET() {
  try {
    const rows = await db.prizeTier.findMany({
      where:   { isActive: true },
      orderBy: { position: 'asc' },
      select:  { key:true, label:true, prize:true, position:true },
    })

    if (rows.length === 0) {
      return NextResponse.json({ prizes: DEFAULT_PRIZES })
    }

    return NextResponse.json({ prizes: rows })
  } catch {
    return NextResponse.json({ prizes: DEFAULT_PRIZES })
  }
}
