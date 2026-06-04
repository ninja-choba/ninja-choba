import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: '忍者帳場 — 小さな商いの番頭AI',
  description: '個人事業主・小規模事業者のためのAI経費管理アプリ。レシート撮影・AI自動分類・資金繰り予測・不動産管理まで1つのアプリで。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '忍者帳場' },
  openGraph: {
    title:       '忍者帳場',
    description: '小さな商いの番頭AI',
    url:         'https://ninja-chouba.vercel.app',
    siteName:    '忍者帳場',
    locale:      'ja_JP',
    type:        'website',
  },
  twitter: {
    card:        'summary',
    title:       '忍者帳場',
    description: '小さな商いの番頭AI',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon:  '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  userScalable: false, themeColor: '#FFFFFF',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
