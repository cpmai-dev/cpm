'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Check, Copy, Download, Github, ExternalLink, Calendar, Tag, User, Star, FileCode, Terminal } from 'lucide-react'
import { Header } from '@/components/layout/Header'

// Mock package data - in real app this would come from API/database
const packageData = {
  name: '@official/code-review',
  displayName: 'Code Review',
  description: 'Comprehensive code review with security analysis, best practices, and actionable feedback.',
  longDescription: `The official Code Review skill for Claude Code provides thorough, professional-grade code reviews that help you catch bugs, security vulnerabilities, and code quality issues before they reach production.

## Features

- **Security Analysis** - Identifies potential security vulnerabilities including SQL injection, XSS, and authentication issues
- **Best Practices** - Enforces coding standards and suggests improvements based on industry best practices
- **Performance Review** - Spots performance bottlenecks and suggests optimizations
- **Actionable Feedback** - Provides specific, actionable suggestions with code examples
- **Multi-language Support** - Works with JavaScript, TypeScript, Python, Go, Rust, and more

## Usage

After installing, use the \`/code-review\` command in Claude Code:

\`\`\`
/code-review src/components/Button.tsx
\`\`\`

Or review an entire directory:

\`\`\`
/code-review src/
\`\`\`

## Configuration

You can customize the review focus in your \`cpm.yaml\`:

\`\`\`yaml
skills:
  code-review:
    focus:
      - security
      - performance
      - best-practices
    severity: strict
\`\`\``,
  type: 'Skill',
  author: 'cpm',
  authorUrl: 'https://github.com/cpm-ai',
  version: '1.2.0',
  license: 'MIT',
  repository: 'https://github.com/cpm-ai/packages/tree/main/skills/code-review',
  installs: 12500,
  stars: 342,
  verified: true,
  createdAt: '2025-08-15',
  updatedAt: '2026-01-20',
  tags: ['code-review', 'security', 'best-practices', 'linting'],
  dependencies: [],
  changelog: [
    { version: '1.2.0', date: '2026-01-20', changes: 'Added support for Rust and Go, improved security analysis' },
    { version: '1.1.0', date: '2025-11-10', changes: 'Performance improvements, better TypeScript support' },
    { version: '1.0.0', date: '2025-08-15', changes: 'Initial release' },
  ],
}

const typeColors: Record<string, string> = {
  'Skill': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'MCP Server': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Agent': 'text-green-400 bg-green-500/10 border-green-500/20',
  'Rules': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Hook': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Workflow': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Template': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Bundle': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
}

export default function PackageDetailPage() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'dependencies'>('readme')

  const installCommand = `cpm install ${packageData.name}`

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Link */}
        <Link
          href="/packages"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to packages
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${typeColors[packageData.type]}`}>
                  {packageData.type}
                </div>
                {packageData.verified && (
                  <div className="flex items-center gap-1.5 text-sm text-orange-400">
                    <Check className="w-4 h-4" />
                    Official Package
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-bold text-white font-mono mb-2">
                {packageData.name}
              </h1>

              <p className="text-lg text-white/60">
                {packageData.description}
              </p>
            </div>

            {/* Install Command */}
            <div className="mb-8">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-amber-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative flex items-center justify-between p-4 bg-[#0d0d10] border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-white/40" />
                    <code className="text-white font-mono">{installCommand}</code>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 mb-6">
              <nav className="flex gap-6">
                {[
                  { id: 'readme', label: 'Readme' },
                  { id: 'versions', label: 'Versions' },
                  { id: 'dependencies', label: 'Dependencies' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`pb-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'readme' && (
              <div className="prose prose-invert prose-orange max-w-none">
                <div className="text-white/70 whitespace-pre-wrap leading-relaxed">
                  {packageData.longDescription.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-xl font-bold text-white mt-8 mb-4">{line.replace('## ', '')}</h2>
                    }
                    if (line.startsWith('- **')) {
                      const match = line.match(/- \*\*(.+?)\*\* - (.+)/)
                      if (match) {
                        return (
                          <div key={i} className="flex gap-2 mb-2">
                            <span className="text-orange-400">•</span>
                            <span><strong className="text-white">{match[1]}</strong> — {match[2]}</span>
                          </div>
                        )
                      }
                    }
                    if (line.startsWith('```')) {
                      return null // Handle code blocks separately
                    }
                    if (line.trim() === '') {
                      return <div key={i} className="h-4" />
                    }
                    return <p key={i} className="mb-2">{line}</p>
                  })}
                </div>

                {/* Code examples */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Quick Start</h3>
                  <pre className="bg-black/50 border border-white/10 rounded-xl p-4 overflow-x-auto">
                    <code className="text-sm text-white/80">
                      {`# Install the package
cpm install ${packageData.name}

# Use in Claude Code
/code-review src/components/Button.tsx`}
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="space-y-4">
                {packageData.changelog.map((release, i) => (
                  <div
                    key={release.version}
                    className={`p-4 rounded-xl border ${
                      i === 0
                        ? 'border-orange-500/30 bg-orange-500/5'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-white">v{release.version}</span>
                        {i === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium text-orange-400 bg-orange-500/20 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-white/40">{release.date}</span>
                    </div>
                    <p className="text-sm text-white/60">{release.changes}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div className="text-center py-12">
                <FileCode className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No dependencies</h3>
                <p className="text-white/50">
                  This package has no external dependencies
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-white mb-4">Package Info</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Version</span>
                  <span className="text-white font-mono">{packageData.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">License</span>
                  <span className="text-white">{packageData.license}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Installs</span>
                  <div className="flex items-center gap-1 text-white">
                    <Download className="w-3.5 h-3.5 text-white/50" />
                    {(packageData.installs / 1000).toFixed(1)}k
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Stars</span>
                  <div className="flex items-center gap-1 text-white">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    {packageData.stars}
                  </div>
                </div>
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/50">Published</span>
                    <span className="text-white/70">{packageData.createdAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Updated</span>
                    <span className="text-white/70">{packageData.updatedAt}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Card */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-white mb-4">Author</h3>
              <a
                href={packageData.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center font-mono font-bold text-white text-sm">
                  cpm
                </div>
                <div>
                  <div className="text-white font-medium group-hover:text-orange-400 transition-colors">
                    @{packageData.author}
                  </div>
                  <div className="text-xs text-white/40">Official</div>
                </div>
              </a>
            </div>

            {/* Links */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-white mb-4">Links</h3>
              <div className="space-y-2">
                <a
                  href={packageData.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Repository
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <FileCode className="w-4 h-4" />
                  Documentation
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </div>
            </div>

            {/* Tags */}
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-sm font-medium text-white mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {packageData.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/packages?tag=${tag}`}
                    className="px-2.5 py-1 text-xs text-white/60 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Report */}
            <div className="text-center">
              <button className="text-xs text-white/30 hover:text-white/50 transition-colors">
                Report this package
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center font-mono font-bold text-white text-[10px]">
                cpm
              </div>
              <span className="text-sm text-white/50">
                cpm — The package manager for Claude Code
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/40">
              <a href="https://github.com/cpm-ai/cpm" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                GitHub
              </a>
              <span className="text-white/20">•</span>
              <Link href="/docs" className="hover:text-white transition-colors">
                Docs
              </Link>
              <span className="text-white/20">•</span>
              <span>Open Source (MIT)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
