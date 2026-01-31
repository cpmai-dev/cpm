import Link from 'next/link'
import { Search, Download, ArrowRight, Terminal, Zap, Server, Bot, FileCode, GitBranch, Puzzle, Layers, Package, Check, Copy, Star, Github } from 'lucide-react'
import { Header } from '@/components/layout/Header'

const packageTypes = [
  { name: 'Skills', slug: 'skills', icon: Zap, count: 89, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', description: 'Reusable capabilities' },
  { name: 'MCP Servers', slug: 'mcp', icon: Server, count: 45, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', description: 'External integrations' },
  { name: 'Agents', slug: 'agents', icon: Bot, count: 32, color: 'text-green-400 bg-green-500/10 border-green-500/20', description: 'Autonomous workflows' },
  { name: 'Rules', slug: 'rules', icon: FileCode, count: 67, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', description: 'Project conventions' },
  { name: 'Hooks', slug: 'hooks', icon: GitBranch, count: 28, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', description: 'Event triggers' },
  { name: 'Workflows', slug: 'workflows', icon: Puzzle, count: 41, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', description: 'Multi-step processes' },
  { name: 'Templates', slug: 'templates', icon: Layers, count: 56, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', description: 'Project starters' },
  { name: 'Bundles', slug: 'bundles', icon: Package, count: 23, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', description: 'Package collections' },
]

const featuredPackages = [
  {
    name: '@official/code-review',
    description: 'Comprehensive code review with security analysis, best practices, and actionable feedback.',
    type: 'Skill',
    author: 'cpm',
    installs: 12500,
    slug: 'official-code-review',
    verified: true,
  },
  {
    name: '@official/github',
    description: 'Full GitHub integration - issues, PRs, repos, actions, and more via MCP.',
    type: 'MCP Server',
    author: 'cpm',
    installs: 8900,
    slug: 'official-github',
    verified: true,
  },
  {
    name: '@community/nextjs-rules',
    description: 'Next.js 14+ App Router conventions, best practices, and coding standards.',
    type: 'Rules',
    author: 'nextjs_dev',
    installs: 5600,
    slug: 'community-nextjs-rules',
    verified: false,
  },
  {
    name: '@official/test-writer',
    description: 'Generate comprehensive test suites with Jest, Vitest, or Pytest.',
    type: 'Skill',
    author: 'cpm',
    installs: 7800,
    slug: 'official-test-writer',
    verified: true,
  },
  {
    name: '@community/pr-agent',
    description: 'Autonomous agent for creating, reviewing, and managing pull requests.',
    type: 'Agent',
    author: 'pr_wizard',
    installs: 4200,
    slug: 'community-pr-agent',
    verified: false,
  },
  {
    name: '@official/postgres',
    description: 'PostgreSQL MCP server for database queries, migrations, and schema inspection.',
    type: 'MCP Server',
    author: 'cpm',
    installs: 6100,
    slug: 'official-postgres',
    verified: true,
  },
]

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
          <div className="absolute inset-0 grid-pattern" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Now in Public Beta
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              The package manager for{' '}
              <span className="gradient-text">Claude Code</span>
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mx-auto mb-8">
              Discover, install, and share skills, MCP servers, agents, and more.
              Extend Claude Code with a single command.
            </p>

            {/* CLI Demo */}
            <div className="max-w-xl mx-auto mb-10">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/50 to-amber-500/50 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                <div className="relative bg-[#0d0d10] border border-white/10 rounded-xl overflow-hidden">
                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-white/30 font-mono ml-2">terminal</span>
                  </div>
                  {/* Terminal content */}
                  <div className="p-4 font-mono text-sm">
                    <div className="flex items-center gap-2 text-white/70">
                      <span className="text-green-400">$</span>
                      <span className="text-white">cpm install @official/code-review</span>
                    </div>
                    <div className="mt-2 text-white/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Installing code-review@1.2.0...</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Added to .claude/skills/code-review</span>
                      </div>
                      <div className="mt-2 text-white/60">
                        ✨ Ready! Use <span className="text-orange-400">/code-review</span> in Claude Code
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Link
                href="/docs/getting-started"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/25"
              >
                <Terminal className="w-4 h-4" />
                Install CLI
              </Link>
              <Link
                href="/packages"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all"
              >
                <Package className="w-4 h-4" />
                Browse Packages
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span><strong className="text-white">50k+</strong> installs</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span><strong className="text-white">380+</strong> packages</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span><strong className="text-white">2.1k</strong> GitHub stars</span>
              </div>
            </div>
          </div>
        </section>

        {/* Package Types */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-white mb-3">
                Everything you need to extend Claude Code
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                Eight package types to customize and enhance your Claude Code experience.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {packageTypes.map((type) => {
                const Icon = type.icon
                return (
                  <Link
                    key={type.slug}
                    href={`/packages?type=${type.slug}`}
                    className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all"
                  >
                    <div className={`inline-flex p-2 rounded-lg ${type.color} border mb-3`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-white font-medium text-sm mb-0.5 group-hover:text-orange-400 transition-colors">
                      {type.name}
                    </h3>
                    <p className="text-xs text-white/40">{type.description}</p>
                    <div className="mt-2 text-xs text-white/30">{type.count} packages</div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Featured Packages */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Featured Packages</h2>
                <p className="text-sm text-white/40">Popular and trending in the community</p>
              </div>
              <Link
                href="/packages"
                className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredPackages.map((pkg) => (
                <Link
                  key={pkg.slug}
                  href={`/packages/${pkg.slug}`}
                  className="group relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                >
                  {/* Type Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[pkg.type]}`}>
                      {pkg.type}
                    </div>
                    {pkg.verified && (
                      <div className="flex items-center gap-1 text-xs text-orange-400">
                        <Check className="w-3.5 h-3.5" />
                        Official
                      </div>
                    )}
                  </div>

                  {/* Package Name */}
                  <h3 className="text-white font-mono text-sm mb-2 group-hover:text-orange-400 transition-colors">
                    {pkg.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/50 mb-4 line-clamp-2">
                    {pkg.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-white/30">
                    <span>by @{pkg.author}</span>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {pkg.installs >= 1000 ? `${(pkg.installs / 1000).toFixed(1)}k` : pkg.installs}
                    </div>
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-white mb-3">
                Get started in 30 seconds
              </h2>
              <p className="text-white/50">
                Install the CLI and start extending Claude Code immediately.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 font-mono font-bold text-sm mb-4">
                  1
                </div>
                <h3 className="text-white font-medium mb-2">Install the CLI</h3>
                <p className="text-sm text-white/40 mb-4">One command to get started with cpm.</p>
                <code className="block text-sm text-white/70 font-mono bg-black/30 rounded-lg px-3 py-2">
                  npm install -g @cpm/cli
                </code>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 font-mono font-bold text-sm mb-4">
                  2
                </div>
                <h3 className="text-white font-medium mb-2">Browse & Install</h3>
                <p className="text-sm text-white/40 mb-4">Find packages and install with one command.</p>
                <code className="block text-sm text-white/70 font-mono bg-black/30 rounded-lg px-3 py-2">
                  cpm install @official/github
                </code>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 font-mono font-bold text-sm mb-4">
                  3
                </div>
                <h3 className="text-white font-medium mb-2">Use in Claude Code</h3>
                <p className="text-sm text-white/40 mb-4">Packages are automatically available.</p>
                <code className="block text-sm text-white/70 font-mono bg-black/30 rounded-lg px-3 py-2">
                  /github create issue
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Share your packages with the community
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Built something cool? Publish it to the cpm registry and help thousands of developers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/docs/publishing"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/25"
              >
                Learn to Publish
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/cpm-ai/cpm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all"
              >
                <Github className="w-4 h-4" />
                Star on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5">
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
      </main>
    </div>
  )
}
