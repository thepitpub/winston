import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import '@/styles/globals.css'

/*
 * Duas famílias open source (SIL OFL), auto-hospedadas — as mesmas do Wine
 * Garden, a serviço de outra casa:
 *  - Instrument Serif: a voz. Títulos, nomes, números grandes; o itálico é
 *    a inflexão (a segunda linha do título, em ouro).
 *  - JetBrains Mono: o balcão. Interface, rótulos, códigos, a ficha.
 */
const instrument = localFont({
  src: [
    { path: '../fonts/InstrumentSerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  adjustFontFallback: 'Times New Roman',
})
const jetbrains = localFont({
  src: '../fonts/JetBrainsMono-Variable.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-jetbrains',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: { default: 'Continental Heritage', template: '%s · Continental Heritage' },
  description: 'Plataforma privada de membros.',
  applicationName: 'Continental Heritage',
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Continental' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0b0d0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-atmosfera="lobby" className={`${instrument.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
