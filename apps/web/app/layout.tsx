import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'cpm - The Package Manager for Claude Code',
  description: 'Discover, install, and share skills, MCP servers, agents, and more for Claude Code. Extend your AI coding assistant with a single command.',
  keywords: ['Claude Code', 'package manager', 'skills', 'MCP servers', 'agents', 'rules', 'hooks', 'AI', 'Anthropic', 'CLI'],
  authors: [{ name: 'cpm Community' }],
  openGraph: {
    title: 'cpm - The Package Manager for Claude Code',
    description: 'Discover, install, and share skills, MCP servers, agents, and more for Claude Code.',
    type: 'website',
    locale: 'en_US',
    siteName: 'cpm',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'cpm - The Package Manager for Claude Code',
    description: 'Extend Claude Code with skills, MCP servers, agents, and more.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
