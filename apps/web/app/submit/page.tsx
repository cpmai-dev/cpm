'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { ResourceType, ResourceFormData } from '@/types/database'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'

const resourceTypes = [
  { value: 'system_prompt', label: 'System Prompt' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp_config', label: 'MCP Config' },
  { value: 'agent_workflow', label: 'Agent Workflow' },
  { value: 'project_rules', label: 'Project Rules' },
  { value: 'custom_instruction', label: 'Custom Instruction' },
]

const categories = [
  { value: '1', label: 'System Prompts' },
  { value: '2', label: 'Skills' },
  { value: '3', label: 'MCP Servers' },
  { value: '4', label: 'Agent Workflows' },
  { value: '5', label: 'Project Rules' },
  { value: '6', label: 'Custom Instructions' },
]

const languages = [
  { value: 'general', label: 'General' },
  { value: 'python', label: 'Python' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
]

const useCases = [
  { value: 'coding', label: 'Coding' },
  { value: 'writing', label: 'Writing' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'research', label: 'Research' },
  { value: 'automation', label: 'Automation' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'creative', label: 'Creative' },
  { value: 'business', label: 'Business' },
]

const availableTags = [
  'coding', 'writing', 'analysis', 'research', 'automation',
  'python', 'typescript', 'javascript', 'react', 'nextjs',
  'api', 'database', 'devops', 'testing', 'documentation',
  'productivity', 'creative', 'business', 'education'
]

export default function SubmitPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<ResourceFormData>({
    title: '',
    description: '',
    content: '',
    type: 'system_prompt',
    category_id: '',
    language: 'general',
    use_case: 'coding',
    tags: [],
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag].slice(0, 5), // Max 5 tags
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required'
    } else if (formData.content.length < 50) {
      newErrors.content = 'Content must be at least 50 characters'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // In production, submit to Supabase
    console.log('Submitting:', formData)

    // Redirect to success or the new resource page
    router.push('/browse')
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Link */}
          <Link
            href="/browse"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </Link>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Submit a Resource</h1>
                <p className="text-neutral-600">Share your prompts, skills, and configs with the community</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <Input
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Senior Software Engineer"
                error={errors.title}
                required
              />

              {/* Description */}
              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe what this resource does and when to use it..."
                rows={3}
                error={errors.description}
                required
              />

              {/* Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Resource Type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  options={resourceTypes}
                />
                <Select
                  label="Category"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  options={categories}
                  placeholder="Select a category"
                  error={errors.category_id}
                />
              </div>

              {/* Language & Use Case */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Language (optional)"
                  name="language"
                  value={formData.language || ''}
                  onChange={handleChange}
                  options={languages}
                />
                <Select
                  label="Use Case (optional)"
                  name="use_case"
                  value={formData.use_case || ''}
                  onChange={handleChange}
                  options={useCases}
                />
              </div>

              {/* Content */}
              <div>
                <Textarea
                  label="Content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Enter the full prompt, skill instructions, or configuration..."
                  rows={12}
                  error={errors.content}
                  className="font-mono text-sm"
                  required
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Tip: Use Markdown formatting for better readability
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tags (select up to 5)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        formData.tags.includes(tag)
                          ? 'bg-orange-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Submission Guidelines</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Make sure your content is original or properly attributed</li>
                      <li>Test your prompt/skill before submitting</li>
                      <li>Provide a clear description of use cases</li>
                      <li>Submissions are reviewed before publishing</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Link href="/browse">
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Submit for Review
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
