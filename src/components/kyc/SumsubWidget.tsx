'use client'
// src/components/kyc/SumsubWidget.tsx
// Embeds the official Sumsub WebSDK inside a div.
// Dynamically loads the SDK script from Sumsub's CDN so it's never bundled.
//
// Props:
//   token      — SDK access token from /api/kyc/token
//   userId     — your traderId
//   levelName  — Sumsub verification level
//   onApproved — callback when verification is approved
//   onRejected — callback when verification is rejected/errored
//   onMessage  — raw message callback for all SDK events

import { useEffect, useRef } from 'react'

interface SumsubWidgetProps {
  token:      string
  userId:     string
  levelName?: string
  onApproved?: () => void
  onRejected?: (reason?: string) => void
  onMessage?:  (type: string, payload: any) => void
  height?:    string | number
}

declare global {
  interface Window {
    snsWebSdk?: {
      init: (token: string, getNewToken: () => Promise<string>) => {
        withConf:    (conf: object) => any
        withOptions: (opts: object) => any
        on:          (event: string, handler: (payload: any) => void) => any
        onMessage:   (handler: (type: string, payload: any) => void) => any
        build:       () => { launch: (selector: string) => void }
      }
    }
  }
}

export default function SumsubWidget({
  token,
  userId,
  levelName = 'basic-kyc-level',
  onApproved,
  onRejected,
  onMessage,
  height = 600,
}: SumsubWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sdkRef       = useRef<any>(null)
  const mountedRef   = useRef(false)

  async function refreshToken(): Promise<string> {
    const r = await fetch('/api/kyc/token', { method: 'POST' })
    const d = await r.json()
    return d.token
  }

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    if (typeof window === 'undefined') return

    // Load SDK script if not already loaded
    function initSDK() {
      if (!window.snsWebSdk) return

      const sdk = window.snsWebSdk
        .init(token, refreshToken)
        .withConf({
          lang:          'en',
          email:         undefined,
          uiConf:        {
            customCss: `
              body   { font-family: 'Rajdhani', 'DM Sans', sans-serif !important; background: transparent !important; }
              .step  { border-radius: 12px !important; }
              .title { font-family: 'Rajdhani', sans-serif !important; }
            `,
          },
        })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on('idCheck.onStepCompleted', (payload: any) => {
          onMessage?.('stepCompleted', payload)
        })
        .on('idCheck.onApplicantStatusChanged', (payload: any) => {
          onMessage?.('statusChanged', payload)
          if (payload?.reviewResult?.reviewAnswer === 'GREEN') {
            onApproved?.()
          } else if (payload?.reviewResult?.reviewAnswer === 'RED') {
            onRejected?.(payload?.reviewResult?.clientComment)
          }
        })
        .on('idCheck.applicantStatus', (payload: any) => {
          onMessage?.('applicantStatus', payload)
          if (payload?.reviewResult?.reviewAnswer === 'GREEN') {
            onApproved?.()
          }
        })
        .on('idCheck.onError', (error: any) => {
          onMessage?.('error', error)
          onRejected?.(error?.errorMessage)
        })
        .onMessage((type: string, payload: any) => {
          onMessage?.(type, payload)
        })
        .build()

      sdkRef.current = sdk
      sdk.launch('#sumsub-websdk-container')
    }

    if (window.snsWebSdk) {
      initSDK()
      return
    }

    const script    = document.createElement('script')
    script.src      = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js'
    script.async    = true
    script.onload   = initSDK
    script.onerror  = () => console.error('Failed to load Sumsub SDK')
    document.head.appendChild(script)

    return () => {
      // Cleanup
      try { sdkRef.current?.destroy?.() } catch {}
    }
  }, [token]) // eslint-disable-line

  return (
    <div
      id="sumsub-websdk-container"
      ref={containerRef}
      style={{
        width:    '100%',
        minHeight: typeof height === 'number' ? `${height}px` : height,
        background: 'transparent',
        borderRadius: 12,
        overflow:  'hidden',
      }}
    />
  )
}
