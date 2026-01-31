import { clsx, type ClassValue } from 'clsx'
import { ResourceType } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
  return formatDate(date)
}

export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    system_prompt: 'System Prompt',
    skill: 'Skill',
    mcp_config: 'MCP Config',
    agent_workflow: 'Agent Workflow',
    project_rules: 'Project Rules',
    custom_instruction: 'Custom Instruction',
  }
  return labels[type]
}

export function getResourceTypeColor(type: ResourceType): string {
  const colors: Record<ResourceType, string> = {
    system_prompt: 'bg-orange-100 text-orange-800',
    skill: 'bg-blue-100 text-blue-800',
    mcp_config: 'bg-purple-100 text-purple-800',
    agent_workflow: 'bg-green-100 text-green-800',
    project_rules: 'bg-yellow-100 text-yellow-800',
    custom_instruction: 'bg-pink-100 text-pink-800',
  }
  return colors[type]
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

export function generateUniqueSlug(title: string): string {
  const base = slugify(title)
  const timestamp = Date.now().toString(36)
  return `${base}-${timestamp}`
}
