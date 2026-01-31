'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ResourceType } from '@/types/database'
import { copyToClipboard, formatNumber, formatDate } from '@/lib/utils'
import { Copy, ThumbsUp, Eye, Share2, Bookmark, ArrowLeft, User, Check } from 'lucide-react'

const mockResource = {
  id: '1',
  slug: 'senior-software-engineer',
  title: 'Senior Software Engineer',
  description: 'Transform Claude into an experienced senior developer with best practices for clean code, testing, and architecture. Perfect for code reviews, pair programming, and learning modern development practices.',
  content: `You are a senior software engineer with 15+ years of experience across multiple languages and frameworks. Your expertise includes:

## Core Competencies
- Clean code principles and SOLID design patterns
- Test-driven development (TDD) and behavior-driven development (BDD)
- System architecture and scalability patterns
- Code review best practices
- Performance optimization

## Communication Style
- Explain complex concepts clearly with examples
- Provide context for recommendations
- Offer multiple solutions when appropriate
- Ask clarifying questions when requirements are ambiguous

## Code Standards
When writing code, you:
1. Follow language-specific conventions and idioms
2. Write self-documenting code with meaningful names
3. Include appropriate error handling
4. Add comments only when the "why" isn't obvious
5. Consider edge cases and potential failure modes

## Review Guidelines
When reviewing code, you:
- Start with positive observations
- Explain the reasoning behind suggestions
- Distinguish between must-fix issues and nice-to-haves
- Consider the broader context and constraints

Always prioritize code clarity and maintainability over cleverness.`,
  type: 'system_prompt' as ResourceType,
  author: { username: 'claude_enthusiast', display_name: 'Claude Enthusiast', avatar_url: null },
  language: 'general',
  use_case: 'coding',
  views_count: 45200,
  copies_count: 12500,
  upvotes_count: 892,
  is_featured: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  tags: [
    { id: '1', name: 'coding', slug: 'coding' },
    { id: '2', name: 'typescript', slug: 'typescript' },
    { id: '3', name: 'best-practices', slug: 'best-practices' },
  ],
}

const typeColors: Record<string, string> = {
  system_prompt: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  skill: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  mcp_config: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  agent_workflow: 'text-green-400 bg-green-500/10 border-green-500/20',
  project_rules: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  custom_instruction: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

const typeLabels: Record<string, string> = {
  system_prompt: 'System Prompt',
  skill: 'Skill',
  mcp_config: 'MCP Config',
  agent_workflow: 'Agent Workflow',
  project_rules: 'Project Rules',
  custom_instruction: 'Custom Instruction',
}

export default function ResourceDetailPage() {
  const params = useParams()
  const [copied, setCopied] = useState(false)
  const [upvoted, setUpvoted] = useState(false)

  const resource = mockResource

  const handleCopy = async () => {
    const success = await copyToClipboard(resource.content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 rounded text-xs font-medium border ${typeColors[resource.type]}`}>
              {typeLabels[resource.type]}
            </span>
            {resource.is_featured && (
              <span className="px-2.5 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {resource.title}
          </h1>

          <p className="text-lg text-white/60 mb-6">
            {resource.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/40 mb-6">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {formatNumber(resource.views_count)} views
            </span>
            <span className="flex items-center gap-1.5">
              <Copy className="w-4 h-4" />
              {formatNumber(resource.copies_count)} copies
            </span>
            <span className="flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" />
              {formatNumber(resource.upvotes_count)} upvotes
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/25"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={() => setUpvoted(!upvoted)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                upvoted
                  ? 'bg-white/10 text-white border-white/20'
                  : 'text-white/70 border-white/10 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${upvoted ? 'fill-current' : ''}`} />
              {upvoted ? 'Upvoted' : 'Upvote'}
            </button>
            <button className="p-2.5 text-white/50 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-2.5 text-white/50 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden mb-8">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="text-sm font-medium text-white/70">Content</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs text-white/50 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-6 text-sm text-white/80 whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">
            {resource.content}
          </pre>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Author */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white/50 mb-3">Created by</h3>
            {resource.author ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-white/50" />
                </div>
                <div>
                  <p className="font-medium text-white">{resource.author.display_name}</p>
                  <p className="text-sm text-white/40">@{resource.author.username}</p>
                </div>
              </div>
            ) : (
              <p className="text-white/40">Anonymous</p>
            )}
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white/50 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/40">Created</dt>
                <dd className="text-white/70">{formatDate(resource.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Language</dt>
                <dd className="text-white/70 capitalize">{resource.language}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/40">Use case</dt>
                <dd className="text-white/70 capitalize">{resource.use_case}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-white/50 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/browse?tags=${tag.slug}`}
                  className="px-3 py-1.5 text-sm text-white/60 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
