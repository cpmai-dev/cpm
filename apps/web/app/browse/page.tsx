'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ResourceWithRelations, ResourceType, Tag } from '@/types/database'
import { Search, Loader2, Copy, X, Sparkles, Zap, Server, GitBranch, FileCode, Settings } from 'lucide-react'

// Mock data
const mockTags: Tag[] = [
  { id: '1', name: 'coding', slug: 'coding', created_at: '' },
  { id: '2', name: 'writing', slug: 'writing', created_at: '' },
  { id: '3', name: 'analysis', slug: 'analysis', created_at: '' },
  { id: '4', name: 'python', slug: 'python', created_at: '' },
  { id: '5', name: 'typescript', slug: 'typescript', created_at: '' },
  { id: '6', name: 'react', slug: 'react', created_at: '' },
  { id: '7', name: 'nextjs', slug: 'nextjs', created_at: '' },
  { id: '8', name: 'automation', slug: 'automation', created_at: '' },
]

const mockResources: ResourceWithRelations[] = [
  {
    id: '1', slug: 'senior-software-engineer', title: 'Senior Software Engineer',
    description: 'Transform Claude into an experienced senior developer with best practices for clean code, testing, and architecture.',
    content: '', type: 'system_prompt', category_id: '1', author_id: null, status: 'published',
    language: 'general', framework: null, use_case: 'coding',
    views_count: 45200, copies_count: 12500, upvotes_count: 892,
    is_featured: true, is_official: false,
    created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z', published_at: '2024-01-15T10:00:00Z',
    tags: [mockTags[0], mockTags[4]],
  },
  {
    id: '2', slug: 'technical-writer-pro', title: 'Technical Writer Pro',
    description: 'Create clear, comprehensive documentation with perfect formatting and structure.',
    content: '', type: 'skill', category_id: '2', author_id: null, status: 'published',
    language: 'general', framework: null, use_case: 'writing',
    views_count: 28900, copies_count: 8900, upvotes_count: 654,
    is_featured: true, is_official: false,
    created_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z', published_at: '2024-01-20T10:00:00Z',
    tags: [mockTags[1]],
  },
  {
    id: '3', slug: 'fullstack-mcp-server', title: 'Full-Stack MCP Server',
    description: 'Complete MCP configuration for file system, database, and API access.',
    content: '', type: 'mcp_config', category_id: '3', author_id: null, status: 'published',
    language: 'typescript', framework: 'nodejs', use_case: 'coding',
    views_count: 15600, copies_count: 5600, upvotes_count: 423,
    is_featured: true, is_official: false,
    created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z', published_at: '2024-02-01T10:00:00Z',
    tags: [mockTags[0], mockTags[4], mockTags[7]],
  },
  {
    id: '4', slug: 'react-component-generator', title: 'React Component Generator',
    description: 'Generate well-structured React components with TypeScript, hooks, and proper prop types.',
    content: '', type: 'skill', category_id: '2', author_id: null, status: 'published',
    language: 'typescript', framework: 'react', use_case: 'coding',
    views_count: 21300, copies_count: 7800, upvotes_count: 567,
    is_featured: false, is_official: false,
    created_at: '2024-02-10T10:00:00Z', updated_at: '2024-02-10T10:00:00Z', published_at: '2024-02-10T10:00:00Z',
    tags: [mockTags[0], mockTags[4], mockTags[5]],
  },
  {
    id: '5', slug: 'code-review-expert', title: 'Code Review Expert',
    description: 'Thorough code reviews identifying bugs, security issues, and improvements.',
    content: '', type: 'system_prompt', category_id: '1', author_id: null, status: 'published',
    language: 'general', framework: null, use_case: 'coding',
    views_count: 18700, copies_count: 6200, upvotes_count: 489,
    is_featured: false, is_official: false,
    created_at: '2024-02-15T10:00:00Z', updated_at: '2024-02-15T10:00:00Z', published_at: '2024-02-15T10:00:00Z',
    tags: [mockTags[0]],
  },
  {
    id: '6', slug: 'data-analyst-workflow', title: 'Data Analyst Workflow',
    description: 'Complete workflow for data cleaning, visualization, and statistical analysis.',
    content: '', type: 'agent_workflow', category_id: null, author_id: null, status: 'published',
    language: 'python', framework: null, use_case: 'analysis',
    views_count: 12400, copies_count: 4100, upvotes_count: 312,
    is_featured: false, is_official: false,
    created_at: '2024-02-20T10:00:00Z', updated_at: '2024-02-20T10:00:00Z', published_at: '2024-02-20T10:00:00Z',
    tags: [mockTags[2], mockTags[3]],
  },
]

const resourceTypes = [
  { slug: 'system_prompt', name: 'System Prompts', icon: Sparkles },
  { slug: 'skill', name: 'Skills', icon: Zap },
  { slug: 'mcp_config', name: 'MCP Configs', icon: Server },
  { slug: 'agent_workflow', name: 'Agent Workflows', icon: GitBranch },
  { slug: 'project_rules', name: 'Project Rules', icon: FileCode },
  { slug: 'custom_instruction', name: 'Custom Instructions', icon: Settings },
]

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

function BrowseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selectedType, setSelectedType] = useState<ResourceType | undefined>(
    (searchParams.get('type') as ResourceType) || undefined
  )
  const [sortBy, setSortBy] = useState<'popular' | 'latest' | 'most_copied'>(
    (searchParams.get('sort') as any) || 'popular'
  )
  const [resources, setResources] = useState<ResourceWithRelations[]>(mockResources)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (selectedType) params.set('type', selectedType)
    if (sortBy !== 'popular') params.set('sort', sortBy)
    const newUrl = params.toString() ? `/browse?${params.toString()}` : '/browse'
    router.push(newUrl, { scroll: false })
  }, [search, selectedType, sortBy, router])

  useEffect(() => {
    setIsLoading(true)
    let filtered = [...mockResources]

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(searchLower) || r.description.toLowerCase().includes(searchLower)
      )
    }

    if (selectedType) {
      filtered = filtered.filter((r) => r.type === selectedType)
    }

    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        filtered.sort((a, b) => b.views_count - a.views_count)
        break
      case 'most_copied':
        filtered.sort((a, b) => b.copies_count - a.copies_count)
        break
    }

    setTimeout(() => {
      setResources(filtered)
      setIsLoading(false)
    }, 200)
  }, [search, selectedType, sortBy])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setSelectedType(undefined)
    setSortBy('popular')
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts, skills, configs..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedType(undefined)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                !selectedType
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              All
            </button>
            {resourceTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.slug}
                  onClick={() => setSelectedType(type.slug as ResourceType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${
                    selectedType === type.slug
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{type.name}</span>
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
          >
            <option value="popular">Most Popular</option>
            <option value="latest">Latest</option>
            <option value="most_copied">Most Copied</option>
          </select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/50">
            {isLoading ? 'Loading...' : `${resources.length} resources found`}
          </p>
          {(selectedType || search) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 mb-4">No resources found</p>
            <button
              onClick={handleClearFilters}
              className="text-orange-400 hover:text-orange-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <Link
                key={resource.id}
                href={`/r/${resource.slug}`}
                className="group relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
              >
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[resource.type]} mb-3`}>
                  {typeLabels[resource.type]}
                </div>

                <h3 className="text-white font-medium mb-2 group-hover:text-orange-400 transition-colors">
                  {resource.title}
                </h3>

                <p className="text-sm text-white/50 mb-4 line-clamp-2">
                  {resource.description}
                </p>

                <div className="flex items-center justify-between text-xs text-white/40">
                  <div className="flex items-center gap-3">
                    {resource.tags?.slice(0, 2).map((tag) => (
                      <span key={tag.id} className="text-white/30">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    {(resource.copies_count / 1000).toFixed(1)}k
                  </div>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  )
}
