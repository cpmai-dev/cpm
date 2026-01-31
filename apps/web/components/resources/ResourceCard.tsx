'use client'

import Link from 'next/link'
import { Copy, ThumbsUp, Eye, User } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ResourceWithRelations, ResourceType } from '@/types/database'
import { formatNumber, getResourceTypeLabel, timeAgo, truncate, copyToClipboard } from '@/lib/utils'
import { useState } from 'react'

interface ResourceCardProps {
  resource: ResourceWithRelations
  onCopy?: () => void
}

const typeColors: Record<ResourceType, 'orange' | 'blue' | 'purple' | 'green' | 'yellow' | 'pink'> = {
  system_prompt: 'orange',
  skill: 'blue',
  mcp_config: 'purple',
  agent_workflow: 'green',
  project_rules: 'yellow',
  custom_instruction: 'pink',
}

export function ResourceCard({ resource, onCopy }: ResourceCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const success = await copyToClipboard(resource.content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopy?.()
    }
  }

  return (
    <Link href={`/r/${resource.slug}`}>
      <Card className="h-full flex flex-col cursor-pointer group">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge variant={typeColors[resource.type]} size="sm">
            {getResourceTypeLabel(resource.type)}
          </Badge>
          {resource.is_featured && (
            <Badge variant="orange" size="sm">
              Featured
            </Badge>
          )}
        </div>

        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-orange-600 transition-colors mb-2">
          {resource.title}
        </h3>

        <p className="text-sm text-neutral-600 mb-4 flex-grow">
          {truncate(resource.description, 120)}
        </p>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {resource.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded"
              >
                {tag.name}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="text-xs text-neutral-400">+{resource.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              {formatNumber(resource.upvotes_count)}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="w-4 h-4" />
              {formatNumber(resource.copies_count)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatNumber(resource.views_count)}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Author & Time */}
        <div className="flex items-center justify-between mt-3 text-xs text-neutral-400">
          {resource.author ? (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {resource.author.display_name || resource.author.username || 'Anonymous'}
            </span>
          ) : (
            <span>Anonymous</span>
          )}
          <span>{timeAgo(resource.created_at)}</span>
        </div>
      </Card>
    </Link>
  )
}
