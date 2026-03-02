'use client'
// src/components/kyc/KycOnboardingModal.tsx
// Full-screen KYC onboarding modal triggered immediately after user signup.
// Shows: intro → Sumsub SDK → success/failure state
// Sumsub WebSDK is dynamically imported to avoid SSR issues.

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const SumsubWidget = dynamic(() => import('./SumsubWidget'), { ssr: false })

interface KycOnboardingModalProps {
  /** traderId from the newly-created account */
  traderId: string
  /** trader's display name */
  displayName: string
  /** called when user completes or explicitly skips */
  onClose: (result: 'submitted' | 'skipped' | 'approved') => void
}

const STEPS = [
  { icon: '🪪', title: 'Identity Document',   desc: 'Passport, national ID, or driving licence' },
  { icon: '🤳', title: 'Selfie Check',         desc: 'Quick live selfie matched to your document' },
  { icon: '🏠', title: 'Address Proof',        desc: 'Bank statement or utility bill (< 3 months)' },
  { icon: '🔐', title: 'Compliance Review',    desc: 'Automated background check (1–24 hours)' },
]

type Screen = 'intro' | 'sdk' | 'submitted' | 'approved' | 'rejected' | 'error'

export default function KycOnboardingModal({ traderId, displayName, onClose }: KycOnboardingModalProps) {
  const [screen,     setScreen]     = useState<Screen>('intro')
  const [sdkToken,   setSdkToken]   = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [skipConfirm, setSkipConfirm] = useState(false)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    setMounted(true)
    // Prevent background scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const fetchToken = useCallback(async () => {
    try {
      const r = await fetch('/api/kyc/token', { method: 'POST' })
      if (!r.ok) throw new Error(await r.text())
      const d = await r.json()
      setSdkToken(d.token)
      setScreen('sdk')
    } catch (e: any) {
      setTokenError(e.message || 'Failed to start verification')
    }
  }, [])

  const handleStartKyc = () => {
    setTokenError(null)
    fetchToken()
  }

  if (!mounted) return null

  // ── Gradient shimmer bar ─────────────────────────────────────────────────
  const TopBar = ({ color }: { color: string }) => (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: `linear-gradient(90deg, transparent, ${color} 30%, ${color} 70%, transparent)`,
      animation: 'shimmerBar 2s ease infinite',
    }} />
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(3,5,15,0.96)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease',
    }}>

      {/* ── INTRO SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'intro' && (
        <div style={{
          width: '100%', maxWidth: 580,
          background: 'linear-gradient(145deg, #0c1022 0%, #080d1c 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          boxShadow: '0 0 80px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <TopBar color="var(--neon, #00d4ff)" />

          {/* Header glow */}
          <div style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,212,255,0.12) 0%, transparent 70%)',
            padding: '44px 40px 0',
            textAlign: 'center',
          }}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
              boxShadow: '0 0 30px rgba(0,212,255,0.15)',
            }}>🪪</div>

            <div style={{
              fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700,
              fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'var(--neon, #00d4ff)', marginBottom: 10,
            }}>One Last Step</div>

            <h2 style={{
              fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
              fontSize: 30, lineHeight: 1.1, color: '#fff', margin: '0 0 12px',
            }}>
              Identity Verification<br />
              <span style={{ color: 'var(--gold, #f0c040)' }}>Required</span>
            </h2>

            <p style={{
              fontSize: 14, color: 'rgba(180,200,235,0.75)', lineHeight: 1.7,
              margin: '0 auto 28px', maxWidth: 420,
            }}>
              Hi <strong style={{ color: '#fff' }}>{displayName}</strong>! To comply with financial regulations
              and protect all participants, we must verify your identity before you can trade.
              The process takes just <strong style={{ color: 'var(--neon, #00d4ff)' }}>3–5 minutes</strong>.
            </p>
          </div>

          {/* Steps */}
          <div style={{ padding: '0 40px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{s.icon}</div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 800,
                    fontSize: 13, color: '#fff', marginBottom: 2,
                  }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(180,200,235,0.6)' }}>{s.desc}</div>
                </div>
                <div style={{
                  marginLeft: 'auto',
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 800,
                  fontSize: 11, color: 'rgba(0,212,255,0.6)',
                }}>{i + 1}</div>
              </div>
            ))}
          </div>

          {/* Security note */}
          <div style={{
            margin: '0 40px 24px',
            background: 'rgba(240,192,64,0.06)', border: '1px solid rgba(240,192,64,0.2)',
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <span style={{ fontSize: 12, color: 'rgba(240,192,64,0.9)', lineHeight: 1.5 }}>
              Powered by <strong>Sumsub</strong> — your data is encrypted and never stored
              without your consent. We comply with GDPR & AML regulations.
            </span>
          </div>

          {tokenError && (
            <div style={{
              margin: '0 40px 16px', padding: '10px 14px', borderRadius: 9,
              background: 'rgba(255,56,96,0.1)', border: '1px solid rgba(255,56,96,0.3)',
              color: 'var(--red, #ff3860)', fontSize: 13, fontWeight: 600,
            }}>{tokenError}</div>
          )}

          {/* CTAs */}
          <div style={{ padding: '0 40px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleStartKyc} style={{
              padding: '15px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--neon,#00d4ff) 0%, #0099ff 100%)',
              color: '#000', fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
              fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase',
              boxShadow: '0 0 30px rgba(0,212,255,0.4)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
            >
              🚀 Start Identity Verification
            </button>

            {!skipConfirm ? (
              <button onClick={() => setSkipConfirm(true)} style={{
                padding: '12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'rgba(180,200,235,0.5)', cursor: 'pointer',
                fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 600,
                fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Skip for now (limited access)
              </button>
            ) : (
              <div style={{
                background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)',
                borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 13, color: 'rgba(255,152,0,0.9)', lineHeight: 1.6 }}>
                  ⚠ Without verification you can't trade in the tournament. You can complete KYC
                  anytime from your dashboard.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setSkipConfirm(false)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: '#fff', cursor: 'pointer',
                    fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700, fontSize: 12,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>Cancel</button>
                  <button onClick={() => onClose('skipped')} style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    background: 'rgba(255,152,0,0.2)', color: '#ff9800', cursor: 'pointer',
                    fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700, fontSize: 12,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>Skip → Go to Dashboard</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SDK SCREEN ────────────────────────────────────────────────────── */}
      {screen === 'sdk' && sdkToken && (
        <div style={{
          width: '100%', maxWidth: 720,
          background: 'linear-gradient(145deg, #0c1022 0%, #080d1c 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          boxShadow: '0 0 80px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
          <TopBar color="var(--neon, #00d4ff)" />

          {/* Header */}
          <div style={{
            padding: '20px 28px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700,
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--neon, #00d4ff)', marginBottom: 4,
              }}>Secure Verification</div>
              <div style={{
                fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
                fontSize: 20, color: '#fff',
              }}>Identity Check</div>
            </div>

            {/* Progress steps */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  title: s.title,
                }}>{s.icon}</div>
              ))}
            </div>
          </div>

          {/* SDK container */}
          <div style={{ padding: '20px 28px', overflowY: 'auto', flexGrow: 1 }}>
            <SumsubWidget
              token={sdkToken}
              userId={traderId}
              height={480}
              onApproved={() => setScreen('approved')}
              onRejected={() => setScreen('rejected')}
              onMessage={(type, payload) => {
                if (type === 'stepCompleted' || type === 'statusChanged') {
                  // If all steps are done, move to submitted screen
                  if (payload?.step === 4 || payload?.applicantStatus === 'pending') {
                    setScreen('submitted')
                  }
                }
                if (type === 'applicantStatus' && payload?.reviewStatus === 'completedInitially') {
                  setScreen('submitted')
                }
              }}
            />
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 28px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--neon, #00d4ff)',
                boxShadow: '0 0 8px var(--neon, #00d4ff)',
                animation: 'pulse 1.5s ease infinite',
              }} />
              <span style={{ fontSize: 12, color: 'rgba(0,212,255,0.7)' }}>Live secure connection to Sumsub</span>
            </div>
            <button onClick={() => { setScreen('intro'); setSdkToken(null) }} style={{
              padding: '7px 14px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: 'rgba(180,200,235,0.4)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-display, Rajdhani)',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>← Back</button>
          </div>
        </div>
      )}

      {/* ── SUBMITTED SCREEN ──────────────────────────────────────────────── */}
      {screen === 'submitted' && (
        <div style={{
          width: '100%', maxWidth: 520, textAlign: 'center',
          background: 'linear-gradient(145deg, #0c1022 0%, #080d1c 100%)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 20, padding: '52px 48px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 80px rgba(0,212,255,0.08)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <TopBar color="var(--neon, #00d4ff)" />

          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 38,
            boxShadow: '0 0 40px rgba(0,212,255,0.2)',
          }}>🔎</div>

          <h2 style={{
            fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900, fontSize: 28,
            color: '#fff', margin: '0 0 12px', lineHeight: 1.1,
          }}>Documents Received!</h2>

          <p style={{ fontSize: 15, color: 'rgba(180,200,235,0.75)', lineHeight: 1.7, margin: '0 0 28px' }}>
            Our compliance team is reviewing your documents. This typically takes
            <strong style={{ color: 'var(--neon, #00d4ff)' }}> 1–24 hours</strong>.
            You'll receive an email once your verification is complete.
          </p>

          {/* Timeline */}
          <div style={{
            background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 12, padding: '18px 20px', marginBottom: 28, textAlign: 'left',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {[
              { label: 'Documents uploaded', done: true,  color: 'var(--green, #00e676)' },
              { label: 'Under review',        done: true,  color: 'var(--neon, #00d4ff)' },
              { label: 'Decision pending',    done: false, color: 'rgba(240,192,64,0.8)' },
              { label: 'Account activated',   done: false, color: 'rgba(180,200,235,0.4)' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: s.done ? `${s.color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${s.done ? s.color : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: s.done ? s.color : 'rgba(255,255,255,0.2)',
                }}>{s.done ? '✓' : '○'}</div>
                <span style={{ fontSize: 13, color: s.done ? '#fff' : 'rgba(180,200,235,0.4)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <button onClick={() => onClose('submitted')} style={{
            width: '100%', padding: '14px', borderRadius: 11, border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--neon,#00d4ff) 0%, #0099ff 100%)',
            color: '#000', fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
            fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 24px rgba(0,212,255,0.35)',
          }}>
            Go to Dashboard →
          </button>
        </div>
      )}

      {/* ── APPROVED SCREEN ───────────────────────────────────────────────── */}
      {screen === 'approved' && (
        <div style={{
          width: '100%', maxWidth: 500, textAlign: 'center',
          background: 'linear-gradient(145deg, #061610 0%, #040d0a 100%)',
          border: '1px solid rgba(0,230,118,0.3)',
          borderRadius: 20, padding: '52px 48px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 80px rgba(0,230,118,0.1)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <TopBar color="var(--green, #00e676)" />

          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 42,
            boxShadow: '0 0 50px rgba(0,230,118,0.25)',
          }}>✅</div>

          <h2 style={{
            fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900, fontSize: 30,
            color: 'var(--green, #00e676)', margin: '0 0 12px',
          }}>Verified! 🎉</h2>

          <p style={{ fontSize: 15, color: 'rgba(180,200,235,0.8)', lineHeight: 1.7, margin: '0 0 28px' }}>
            Your identity has been confirmed. Your{' '}
            <strong style={{ color: 'var(--gold, #f0c040)' }}>$10,000 funded trading account</strong>{' '}
            is now active. Welcome to the tournament!
          </p>

          <button onClick={() => onClose('approved')} style={{
            width: '100%', padding: '15px', borderRadius: 11, border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--green,#00e676) 0%, #00c853 100%)',
            color: '#000', fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
            fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 30px rgba(0,230,118,0.4)',
          }}>
            🏆 Enter the Tournament →
          </button>
        </div>
      )}

      {/* ── REJECTED SCREEN ───────────────────────────────────────────────── */}
      {screen === 'rejected' && (
        <div style={{
          width: '100%', maxWidth: 500, textAlign: 'center',
          background: 'linear-gradient(145deg, #150609 0%, #0d0408 100%)',
          border: '1px solid rgba(255,56,96,0.3)',
          borderRadius: 20, padding: '52px 48px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 80px rgba(255,56,96,0.08)',
          animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <TopBar color="var(--red, #ff3860)" />

          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,56,96,0.1)', border: '1px solid rgba(255,56,96,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: 38,
          }}>❌</div>

          <h2 style={{
            fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900, fontSize: 28,
            color: 'var(--red, #ff3860)', margin: '0 0 12px',
          }}>Verification Failed</h2>

          <p style={{ fontSize: 14, color: 'rgba(180,200,235,0.7)', lineHeight: 1.7, margin: '0 0 28px' }}>
            Unfortunately we couldn't verify your identity this time. You can review the
            feedback and try resubmitting from your dashboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setScreen('intro'); setSdkToken(null) }} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              cursor: 'pointer',
              background: 'rgba(255,56,96,0.15)',
              color: 'var(--red, #ff3860)', fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 800,
              fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>↺ Try Again</button>
            <button onClick={() => onClose('skipped')} style={{
              width: '100%', padding: '11px', borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: 'rgba(180,200,235,0.5)',
              cursor: 'pointer', fontFamily: 'var(--font-display, Rajdhani)',
              fontWeight: 600, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Go to Dashboard</button>
          </div>
        </div>
      )}

      {/* ── ERROR STATE ───────────────────────────────────────────────────── */}
      {screen === 'error' && (
        <div style={{
          width: '100%', maxWidth: 420, textAlign: 'center',
          background: '#0c1022', border: '1px solid rgba(255,56,96,0.3)',
          borderRadius: 20, padding: '44px 40px',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
          <h3 style={{ fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 12px' }}>
            Connection Issue
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(180,200,235,0.7)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Failed to connect to the verification service. Please try again.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setScreen('intro')} style={{
              flex: 1, padding: '12px', borderRadius: 8,
              border: '1px solid rgba(0,212,255,0.3)', background: 'transparent',
              color: 'var(--neon, #00d4ff)', cursor: 'pointer',
              fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 700,
              fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>← Back</button>
            <button onClick={handleStartKyc} style={{
              flex: 2, padding: '12px', borderRadius: 8, border: 'none',
              background: 'var(--neon, #00d4ff)', color: '#000', cursor: 'pointer',
              fontFamily: 'var(--font-display, Rajdhani)', fontWeight: 900,
              fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Retry</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp   { from { opacity:0; transform:translateY(40px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes shimmerBar { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes pulse     { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      `}</style>
    </div>
  )
}
