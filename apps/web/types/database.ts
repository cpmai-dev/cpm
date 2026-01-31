export type ResourceType =
  | 'system_prompt'
  | 'skill'
  | 'mcp_config'
  | 'agent_workflow'
  | 'project_rules'
  | 'custom_instruction'

export type ResourceStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  created_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  github_username: string | null
  twitter_username: string | null
  website: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  slug: string
  title: string
  description: string
  content: string
  type: ResourceType
  category_id: string | null
  author_id: string | null
  status: ResourceStatus
  language: string | null
  framework: string | null
  use_case: string | null
  views_count: number
  copies_count: number
  upvotes_count: number
  is_featured: boolean
  is_official: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ResourceWithRelations extends Resource {
  category?: Category | null
  author?: Profile | null
  tags?: Tag[]
}

export interface Comment {
  id: string
  resource_id: string
  user_id: string
  parent_id: string | null
  content: string
  is_edited: boolean
  created_at: string
  updated_at: string
  user?: Profile
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Upvote {
  id: string
  resource_id: string
  user_id: string
  created_at: string
}

// Form types
export interface ResourceFormData {
  title: string
  description: string
  content: string
  type: ResourceType
  category_id: string
  language?: string
  framework?: string
  use_case?: string
  tags: string[]
}

// Filter types
export interface ResourceFilters {
  type?: ResourceType
  category?: string
  language?: string
  framework?: string
  use_case?: string
  tags?: string[]
  search?: string
  sort?: 'latest' | 'popular' | 'most_copied' | 'most_upvoted'
}
