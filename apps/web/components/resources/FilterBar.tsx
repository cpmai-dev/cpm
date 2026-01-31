'use client'

import { ResourceType, Category, Tag } from '@/types/database'
import { getResourceTypeLabel } from '@/lib/utils'
import { X, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

interface FilterBarProps {
  categories: Category[]
  tags: Tag[]
  selectedType?: ResourceType
  selectedCategory?: string
  selectedTags: string[]
  sortBy: 'latest' | 'popular' | 'most_copied' | 'most_upvoted'
  onTypeChange: (type?: ResourceType) => void
  onCategoryChange: (category?: string) => void
  onTagsChange: (tags: string[]) => void
  onSortChange: (sort: 'latest' | 'popular' | 'most_copied' | 'most_upvoted') => void
  onClearFilters: () => void
}

const resourceTypes: ResourceType[] = [
  'system_prompt',
  'skill',
  'mcp_config',
  'agent_workflow',
  'project_rules',
  'custom_instruction',
]

const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'most_copied', label: 'Most Copied' },
  { value: 'most_upvoted', label: 'Most Upvoted' },
] as const

export function FilterBar({
  categories,
  tags,
  selectedType,
  selectedCategory,
  selectedTags,
  sortBy,
  onTypeChange,
  onCategoryChange,
  onTagsChange,
  onSortChange,
  onClearFilters,
}: FilterBarProps) {
  const [showAllTags, setShowAllTags] = useState(false)

  const hasFilters = selectedType || selectedCategory || selectedTags.length > 0

  const displayedTags = showAllTags ? tags : tags.slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Type Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-neutral-600 mr-2">Type:</span>
        <button
          onClick={() => onTypeChange(undefined)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !selectedType ? 'bg-orange-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          All
        </button>
        {resourceTypes.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedType === type ? 'bg-orange-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {getResourceTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Category & Sort Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">Category:</span>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value || undefined)}
            className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-neutral-600 mr-2">Tags:</span>
        {displayedTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => {
              if (selectedTags.includes(tag.slug)) {
                onTagsChange(selectedTags.filter((t) => t !== tag.slug))
              } else {
                onTagsChange([...selectedTags, tag.slug])
              }
            }}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              selectedTags.includes(tag.slug)
                ? 'bg-orange-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tag.name}
          </button>
        ))}
        {tags.length > 10 && (
          <button
            onClick={() => setShowAllTags(!showAllTags)}
            className="px-2.5 py-1 text-xs text-orange-600 hover:text-orange-700 transition-colors"
          >
            {showAllTags ? 'Show less' : `+${tags.length - 10} more`}
          </button>
        )}
      </div>
    </div>
  )
}
