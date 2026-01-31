import Link from 'next/link'
import { Terminal, Package, Upload, BookOpen, Settings, Zap, Server, Bot, FileCode, GitBranch, ArrowRight, Copy, Check } from 'lucide-react'
import { Header } from '@/components/layout/Header'

const sections = [
  {
    title: 'Getting Started',
    icon: Terminal,
    href: '/docs/getting-started',
    description: 'Install cpm and set up your environment',
    items: ['Installation', 'Quick Start', 'Configuration'],
  },
  {
    title: 'Packages',
    icon: Package,
    href: '/docs/packages',
    description: 'Learn about the different package types',
    items: ['Skills', 'MCP Servers', 'Agents', 'Rules', 'Hooks'],
  },
  {
    title: 'Publishing',
    icon: Upload,
    href: '/docs/publishing',
    description: 'Share your packages with the community',
    items: ['Package Structure', 'cpm.yaml Spec', 'Versioning'],
  },
  {
    title: 'CLI Reference',
    icon: BookOpen,
    href: '/docs/cli',
    description: 'Complete command-line reference',
    items: ['install', 'search', 'list', 'publish', 'update'],
  },
]

const packageTypes = [
  { name: 'Skills', icon: Zap, color: 'text-blue-400', description: 'Reusable prompts and capabilities that extend what Claude can do' },
  { name: 'MCP Servers', icon: Server, color: 'text-purple-400', description: 'Model Context Protocol integrations for external services' },
  { name: 'Agents', icon: Bot, color: 'text-green-400', description: 'Autonomous workflows that perform multi-step tasks' },
  { name: 'Rules', icon: FileCode, color: 'text-yellow-400', description: 'Project conventions and coding standards' },
  { name: 'Hooks', icon: GitBranch, color: 'text-pink-400', description: 'Event triggers that run before or after actions' },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Everything you need to install, use, and publish packages for Claude Code.
          </p>
        </div>

        {/* Quick Start */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Quick Start</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-white font-medium mb-4">1. Install the CLI</h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-green-400">$</span>
                <span className="text-white ml-2">npm install -g @cpm/cli</span>
              </div>
              <p className="text-sm text-white/40 mt-3">
                Or use your preferred package manager: yarn, pnpm, or bun
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-white font-medium mb-4">2. Install a package</h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-green-400">$</span>
                <span className="text-white ml-2">cpm install @official/code-review</span>
              </div>
              <p className="text-sm text-white/40 mt-3">
                Packages are automatically added to your Claude Code environment
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-white font-medium mb-4">3. Use in Claude Code</h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-white/50"># In Claude Code</span>
                <br />
                <span className="text-orange-400">/code-review</span>
                <span className="text-white ml-2">src/components/</span>
              </div>
              <p className="text-sm text-white/40 mt-3">
                Skills become available as slash commands
              </p>
            </div>

            <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
              <h3 className="text-white font-medium mb-4">4. Keep packages updated</h3>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                <span className="text-green-400">$</span>
                <span className="text-white ml-2">cpm update</span>
              </div>
              <p className="text-sm text-white/40 mt-3">
                Updates all packages to their latest compatible versions
              </p>
            </div>
          </div>
        </div>

        {/* Package Types */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Package Types</h2>
          <div className="space-y-4">
            {packageTypes.map((type) => {
              const Icon = type.icon
              return (
                <div
                  key={type.name}
                  className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-start gap-4"
                >
                  <div className={`p-2 rounded-lg bg-white/5 ${type.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">{type.name}</h3>
                    <p className="text-sm text-white/50">{type.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Documentation</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className="group p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <h3 className="text-white font-medium mb-2 group-hover:text-orange-400 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-white/50 mb-4">{section.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <span
                        key={item}
                        className="px-2 py-1 text-xs text-white/40 bg-white/5 rounded"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* CLI Commands Quick Reference */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">CLI Commands</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left text-sm font-medium text-white/70 px-6 py-3">Command</th>
                  <th className="text-left text-sm font-medium text-white/70 px-6 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { cmd: 'cpm install <package>', desc: 'Install a package' },
                  { cmd: 'cpm uninstall <package>', desc: 'Remove a package' },
                  { cmd: 'cpm search <query>', desc: 'Search for packages' },
                  { cmd: 'cpm list', desc: 'List installed packages' },
                  { cmd: 'cpm update', desc: 'Update all packages' },
                  { cmd: 'cpm info <package>', desc: 'Show package details' },
                  { cmd: 'cpm init', desc: 'Create a new package' },
                  { cmd: 'cpm publish', desc: 'Publish a package' },
                ].map((item) => (
                  <tr key={item.cmd} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-3">
                      <code className="text-sm text-orange-400 font-mono">{item.cmd}</code>
                    </td>
                    <td className="px-6 py-3 text-sm text-white/60">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* cpm.yaml Example */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Package Manifest (cpm.yaml)</h2>
          <div className="p-6 rounded-xl border border-white/10 bg-[#0d0d10]">
            <pre className="text-sm text-white/80 font-mono overflow-x-auto">
{`name: code-review
version: 1.0.0
type: skill
description: Comprehensive code review with security analysis

author:
  name: cpm
  email: hello@cpm-ai.dev
  url: https://github.com/cpm-ai

repository: https://github.com/cpm-ai/packages
license: MIT

# Skill-specific configuration
skill:
  command: /code-review
  description: Review code for bugs, security issues, and best practices

  # Arguments the skill accepts
  args:
    - name: path
      type: string
      required: true
      description: File or directory to review

    - name: focus
      type: array
      default: [security, performance, best-practices]
      description: Areas to focus on

# Keywords for search
keywords:
  - code-review
  - security
  - linting
  - best-practices`}
            </pre>
          </div>
        </div>

        {/* Help CTA */}
        <div className="text-center py-12 border-t border-white/5">
          <h2 className="text-xl font-bold text-white mb-3">Need help?</h2>
          <p className="text-white/50 mb-6">
            Join our community or check out the GitHub repository
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/cpm-ai/cpm/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all"
            >
              GitHub Discussions
            </a>
            <a
              href="https://discord.gg/cpm-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/25"
            >
              Join Discord
            </a>
          </div>
        </div>
      </main>

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
              <span>Open Source (MIT)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
