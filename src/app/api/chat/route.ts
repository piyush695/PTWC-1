// src/app/api/chat/route.ts
// Plug-and-play chatbot endpoint.
// Set CHAT_PROVIDER in .env to switch between providers:
//   'claude'    — Anthropic Claude API (default, recommended)
//   'openai'    — OpenAI GPT
//   'crisp'     — Crisp.chat live agent handoff
//   'intercom'  — Intercom widget token
//   'none'      — Disable AI, return "offline" message
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are the official support assistant for Hola Prime World Cup 2026, a global trading tournament with a $60,000 prize pool.

Key facts:
- Registration fee: configured in admin panel (default $10)
- Each country gets one spot (first come, first served)
- Qualifier phase: Jun 1 – Jun 12, 2026
- H2H bracket: Jun 15, 2026
- Grand Final: Jul 18, 2026
- Funded trading account: $10,000 per trader
- Rules: max 8% daily drawdown, max 10% total drawdown, min 5 trades per week
- Disqualification: automatic on drawdown breach or manual for rule violations

Answer questions about registration, KYC, trading rules, prize structure, and technical support. Be concise and professional. For account-specific issues, ask users to email support@holaprime.com.

NEVER make up account credentials, balances, or specific trader data. If you don't know, say so.`

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json()
    const provider = process.env.CHAT_PROVIDER || 'claude'

    if (provider === 'none') {
      return NextResponse.json({
        reply: 'Live chat is currently offline. Please email support@holaprime.com and we\'ll respond within 24 hours.',
        offline: true,
      })
    }

    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return NextResponse.json({ reply: offline_message(), offline: true })

      const messages = [
        ...(history || []).slice(-10),
        { role: 'user', content: message },
      ]

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system:     SYSTEM_PROMPT,
          messages,
        }),
      })
      const data = await res.json()
      return NextResponse.json({ reply: data.content?.[0]?.text || 'Sorry, I couldn\'t process that.' })
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return NextResponse.json({ reply: offline_message(), offline: true })

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(history || []).slice(-10),
        { role: 'user', content: message },
      ]

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 512 }),
      })
      const data = await res.json()
      return NextResponse.json({ reply: data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t process that.' })
    }

    // Intercom or Crisp — return widget config only, frontend handles it
    if (provider === 'intercom') {
      return NextResponse.json({
        provider: 'intercom',
        appId: process.env.INTERCOM_APP_ID,
      })
    }
    if (provider === 'crisp') {
      return NextResponse.json({
        provider: 'crisp',
        websiteId: process.env.CRISP_WEBSITE_ID,
      })
    }

    return NextResponse.json({ reply: offline_message(), offline: true })
  } catch (err) {
    console.error('chat error:', err)
    return NextResponse.json({ reply: 'Something went wrong. Please try again or email support@holaprime.com.', offline: true })
  }
}

function offline_message() {
  return 'Our support team is currently offline. Please email support@holaprime.com and we\'ll get back to you within 24 hours. For urgent issues, use the contact form at /contact.'
}

// GET returns provider info for frontend widget initialization
export async function GET() {
  const provider = process.env.CHAT_PROVIDER || 'claude'
  return NextResponse.json({
    provider,
    available: provider !== 'none',
    intercomAppId:   provider === 'intercom' ? process.env.INTERCOM_APP_ID   : undefined,
    crispWebsiteId:  provider === 'crisp'    ? process.env.CRISP_WEBSITE_ID  : undefined,
  })
}
