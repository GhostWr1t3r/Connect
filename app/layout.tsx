import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Connect',
  description: 'Say what you want. No names. No filters.',
  generator: 'Powered by NET3LIX',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
