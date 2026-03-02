// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hola Prime World Cup 2026 | Prop Trading Championship',
  description: 'The world\'s largest prop trading championship. Compete for your country. Win the World Cup.',
  keywords: 'prop trading, world cup, trading competition, hola prime, forex',
  openGraph: {
    title: 'Hola Prime World Cup 2026',
    description: 'The world\'s largest prop trading championship.',
    type: 'website',
    url: 'https://worldcup.holaprime.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-white">
        {children}
      </body>
    </html>
  )
}
