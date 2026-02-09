import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Your Company - Coming Soon',
  description: 'We\'re working on something exciting. Check back soon!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 
