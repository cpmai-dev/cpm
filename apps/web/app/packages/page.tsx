'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Download, Check, Zap, Server, Bot, FileCode, GitBranch, Puzzle, Layers, Package, Filter, SortAsc } from 'lucide-react'
import { Header } from '@/components/layout/Header'

const packageTypes = [
  { name: 'All', slug: 'all', icon: Package },
  { name: 'Skills', slug: 'skills', icon: Zap },
  { name: 'MCP Servers', slug: 'mcp', icon: Server },
  { name: 'Agents', slug: 'agents', icon: Bot },
  { name: 'Rules', slug: 'rules', icon: FileCode },
  { name: 'Hooks', slug: 'hooks', icon: GitBranch },
  { name: 'Workflows', slug: 'workflows', icon: Puzzle },
  { name: 'Templates', slug: 'templates', icon: Layers },
  { name: 'Bundles', slug: 'bundles', icon: Package },
]

const allPackages = [
  {
    name: '@official/code-review',
    description: 'Comprehensive code review with security analysis, best practices, and actionable feedback.',
    type: 'Skill',
    typeSlug: 'skills',
    author: 'cpm',
    installs: 12500,
    slug: 'official-code-review',
    verified: true,
    version: '1.2.0',
  },
  {
    name: '@official/github',
    description: 'Full GitHub integration - issues, PRs, repos, actions, and more via MCP.',
    type: 'MCP Server',
    typeSlug: 'mcp',
    author: 'cpm',
    installs: 8900,
    slug: 'official-github',
    verified: true,
    version: '2.1.3',
  },
  {
    name: '@community/nextjs-rules',
    description: 'Next.js 14+ App Router conventions, best practices, and coding standards.',
    type: 'Rules',
    typeSlug: 'rules',
    author: 'nextjs_dev',
    installs: 5600,
    slug: 'community-nextjs-rules',
    verified: false,
    version: '1.0.5',
  },
  {
    name: '@official/test-writer',
    description: 'Generate comprehensive test suites with Jest, Vitest, or Pytest.',
    type: 'Skill',
    typeSlug: 'skills',
    author: 'cpm',
    installs: 7800,
    slug: 'official-test-writer',
    verified: true,
    version: '1.4.0',
  },
  {
    name: '@community/pr-agent',
    description: 'Autonomous agent for creating, reviewing, and managing pull requests.',
    type: 'Agent',
    typeSlug: 'agents',
    author: 'pr_wizard',
    installs: 4200,
    slug: 'community-pr-agent',
    verified: false,
    version: '0.9.2',
  },
  {
    name: '@official/postgres',
    description: 'PostgreSQL MCP server for database queries, migrations, and schema inspection.',
    type: 'MCP Server',
    typeSlug: 'mcp',
    author: 'cpm',
    installs: 6100,
    slug: 'official-postgres',
    verified: true,
    version: '1.1.0',
  },
  {
    name: '@official/slack',
    description: 'Slack integration for messaging, channels, and workspace management.',
    type: 'MCP Server',
    typeSlug: 'mcp',
    author: 'cpm',
    installs: 5400,
    slug: 'official-slack',
    verified: true,
    version: '1.3.2',
  },
  {
    name: '@community/typescript-rules',
    description: 'Strict TypeScript coding standards with best practices and type safety.',
    type: 'Rules',
    typeSlug: 'rules',
    author: 'ts_master',
    installs: 4800,
    slug: 'community-typescript-rules',
    verified: false,
    version: '2.0.1',
  },
  {
    name: '@official/doc-writer',
    description: 'Generate comprehensive documentation with API references and examples.',
    type: 'Skill',
    typeSlug: 'skills',
    author: 'cpm',
    installs: 6300,
    slug: 'official-doc-writer',
    verified: true,
    version: '1.0.8',
  },
  {
    name: '@community/deploy-agent',
    description: 'Autonomous deployment agent for CI/CD pipelines and cloud platforms.',
    type: 'Agent',
    typeSlug: 'agents',
    author: 'devops_pro',
    installs: 3200,
    slug: 'community-deploy-agent',
    verified: false,
    version: '0.8.5',
  },
  {
    name: '@official/pre-commit',
    description: 'Pre-commit hook for code formatting, linting, and validation.',
    type: 'Hook',
    typeSlug: 'hooks',
    author: 'cpm',
    installs: 4500,
    slug: 'official-pre-commit',
    verified: true,
    version: '1.1.0',
  },
  {
    name: '@community/react-template',
    description: 'React 18+ project template with TypeScript, Tailwind, and testing setup.',
    type: 'Template',
    typeSlug: 'templates',
    author: 'react_dev',
    installs: 3800,
    slug: 'community-react-template',
    verified: false,
    version: '1.2.0',
  },
  {
    name: '@official/fullstack-bundle',
    description: 'Complete bundle for full-stack development with all essential packages.',
    type: 'Bundle',
    typeSlug: 'bundles',
    author: 'cpm',
    installs: 2900,
    slug: 'official-fullstack-bundle',
    verified: true,
    version: '1.0.0',
  },
  {
    name: '@community/git-workflow',
    description: 'Automated git workflow for branching, commits, and PR management.',
    type: 'Workflow',
    typeSlug: 'workflows',
    author: 'git_guru',
    installs: 3100,
    slug: 'community-git-workflow',
    verified: false,
    version: '1.1.2',
  },
  {
    name: '@official/redis',
    description: 'Redis MCP server for caching, sessions, and pub/sub messaging.',
    type: 'MCP Server',
    typeSlug: 'mcp',
    author: 'cpm',
    installs: 4100,
    slug: 'official-redis',
    verified: true,
    version: '1.0.3',
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

export default function PackagesPage() {
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'installs' | 'name' | 'recent'>('installs')

  const filteredPackages = allPackages
    .filter(pkg => {
      const matchesType = selectedType === 'all' || pkg.typeSlug === selectedType
      const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesType && matchesSearch
    })
    .sort((a, b) => {
      if (sortBy === 'installs') return b.installs - a.installs
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Packages</h1>
          <p className="text-white/50">
            Discover and install packages to extend Claude Code
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="installs">Most Popular</option>
              <option value="name">Name (A-Z)</option>
              <option value="recent">Recently Updated</option>
            </select>
            <SortAsc className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {packageTypes.map((type) => {
            const Icon = type.icon
            const isActive = selectedType === type.slug
            return (
              <button
                key={type.slug}
                onClick={() => setSelectedType(type.slug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.name}
              </button>
            )
          })}
        </div>

        {/* Results Count */}
        <div className="text-sm text-white/40 mb-4">
          {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} found
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => (
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
              <h3 className="text-white font-mono text-sm mb-1 group-hover:text-orange-400 transition-colors">
                {pkg.name}
              </h3>

              {/* Version */}
              <div className="text-xs text-white/30 mb-2">v{pkg.version}</div>

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

        {/* Empty State */}
        {filteredPackages.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No packages found</h3>
            <p className="text-white/50 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedType('all')
              }}
              className="px-4 py-2 text-sm font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Load More */}
        {filteredPackages.length > 0 && (
          <div className="flex justify-center mt-8">
            <button className="px-6 py-2.5 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all">
              Load more packages
            </button>
          </div>
        )}
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
