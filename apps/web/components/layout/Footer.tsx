import Link from 'next/link'
import { Github, Twitter, Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900">
                Claude<span className="text-orange-500">.directory</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-neutral-600">
              The community directory for Claude prompts, skills, MCP configs, and more.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://github.com/yourusername/claude-directory"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/claudedirectory"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Browse</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/browse?type=system_prompt" className="text-sm text-neutral-600 hover:text-neutral-900">
                  System Prompts
                </Link>
              </li>
              <li>
                <Link href="/browse?type=skill" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Skills
                </Link>
              </li>
              <li>
                <Link href="/browse?type=mcp_config" className="text-sm text-neutral-600 hover:text-neutral-900">
                  MCP Configs
                </Link>
              </li>
              <li>
                <Link href="/browse?type=agent_workflow" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Agent Workflows
                </Link>
              </li>
              <li>
                <Link href="/browse?type=project_rules" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Project Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/generator" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Generator
                </Link>
              </li>
              <li>
                <Link href="/collections" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Collections
                </Link>
              </li>
              <li>
                <a href="https://docs.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Claude Docs
                </a>
              </li>
              <li>
                <a href="https://github.com/anthropics/anthropic-cookbook" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Anthropic Cookbook
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/submit" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Submit Resource
                </Link>
              </li>
              <li>
                <a href="https://github.com/yourusername/claude-directory" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Contribute
                </a>
              </li>
              <li>
                <a href="https://github.com/yourusername/claude-directory/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 hover:text-neutral-900">
                  Report Issue
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Claude Directory. Open source under MIT license.
          </p>
          <p className="text-sm text-neutral-500">
            Not affiliated with Anthropic. Made with ❤️ by the community.
          </p>
        </div>
      </div>
    </footer>
  )
}
