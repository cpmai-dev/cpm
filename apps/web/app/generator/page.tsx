'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { copyToClipboard } from '@/lib/utils'
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Lightbulb,
  ArrowRight,
  Code,
  FileText,
  Settings,
  Zap,
} from 'lucide-react'

const generatorTypes = [
  {
    id: 'system_prompt',
    name: 'System Prompt',
    description: 'Custom instructions for Claude',
    icon: Settings,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'skill',
    name: 'Skill',
    description: 'Task-specific instructions',
    icon: Zap,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'project_rules',
    name: 'Project Rules',
    description: 'Coding standards & guidelines',
    icon: Code,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'custom_instruction',
    name: 'Custom Instruction',
    description: 'Personal preferences for Claude',
    icon: FileText,
    color: 'bg-purple-100 text-purple-600',
  },
]

const examplePrompts = [
  'A senior TypeScript developer who writes clean, well-tested code',
  'A technical writer who creates clear documentation with examples',
  'A code reviewer who gives constructive, detailed feedback',
  'A Python expert for data science and machine learning projects',
  'A product manager who writes clear requirements and user stories',
]

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'technical', label: 'Technical' },
]

const lengthOptions = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'comprehensive', label: 'Comprehensive' },
]

// Simulated AI-generated prompts (in production, call Claude API)
const generatePrompt = (type: string, description: string, tone: string, length: string): string => {
  const templates: Record<string, string> = {
    system_prompt: `You are ${description}.

## Core Responsibilities
- Provide expert guidance in your area of specialty
- Explain concepts clearly with practical examples
- Offer multiple approaches when applicable
- Ask clarifying questions when requirements are unclear

## Communication Style
- Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}
- Be direct and actionable in your responses
- Use concrete examples to illustrate points
- Acknowledge limitations and uncertainties

## Best Practices
1. Start with understanding the full context
2. Break down complex problems into manageable steps
3. Provide reasoning for recommendations
4. Consider edge cases and potential issues
5. Suggest improvements proactively

## Output Format
- Use clear structure with headers when appropriate
- Include code examples with proper formatting
- Provide summaries for longer responses
- Offer next steps or follow-up questions`,

    skill: `# ${description.split(' ').slice(0, 4).join(' ')} Skill

## Purpose
${description}

## Instructions
When activated, this skill will:
1. Analyze the user's request thoroughly
2. Apply specialized knowledge and techniques
3. Generate high-quality output following best practices
4. Provide explanations for key decisions

## Execution Steps
1. **Understand**: Parse the input and identify requirements
2. **Plan**: Outline the approach before execution
3. **Execute**: Carry out the task with attention to detail
4. **Review**: Check output for quality and completeness
5. **Deliver**: Present results in the requested format

## Quality Standards
- Accuracy: Ensure factual correctness
- Completeness: Cover all requested aspects
- Clarity: Use clear, understandable language
- Format: Follow any specified formatting requirements

## Notes
- Ask for clarification if the request is ambiguous
- Provide alternatives when appropriate
- Highlight any assumptions made`,

    project_rules: `# Project Rules

## Overview
${description}

## Code Standards

### Style
- Follow consistent naming conventions
- Use meaningful variable and function names
- Keep functions focused and single-purpose
- Maximum line length: 100 characters

### Structure
- Organize code logically by feature/domain
- Keep files focused and reasonably sized
- Use clear folder structure
- Separate concerns appropriately

### Documentation
- Document public APIs and complex logic
- Use JSDoc/docstrings for functions
- Keep README updated
- Include inline comments for non-obvious code

## Quality Requirements

### Testing
- Write tests for new features
- Maintain test coverage above 80%
- Include unit and integration tests
- Test edge cases and error handling

### Code Review
- All changes require review
- Address all review comments
- Keep PRs focused and reviewable
- Include clear PR descriptions

## Git Workflow
- Use conventional commits
- Keep commits atomic and focused
- Write descriptive commit messages
- Squash before merging when appropriate`,

    custom_instruction: `## About Me
${description}

## How I'd Like Claude to Respond
- Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}
- Length: ${length.charAt(0).toUpperCase() + length.slice(1)} responses
- Include practical examples when helpful
- Be direct and skip unnecessary preambles

## My Preferences
- Code: Include comments for complex logic
- Explanations: Use analogies when helpful
- Suggestions: Offer alternatives proactively
- Format: Use markdown for structure

## What I Value
- Accuracy over speed
- Practical, actionable advice
- Clear reasoning for recommendations
- Honest acknowledgment of limitations

## Context to Remember
- I prefer learning by doing
- I appreciate when you ask clarifying questions
- I like step-by-step breakdowns for complex topics`,
  }

  return templates[type] || templates.system_prompt
}

export default function GeneratorPage() {
  const [selectedType, setSelectedType] = useState('system_prompt')
  const [description, setDescription] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('balanced')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!description.trim()) return

    setIsGenerating(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const content = generatePrompt(selectedType, description, tone, length)
    setGeneratedContent(content)
    setIsGenerating(false)
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(generatedContent)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExampleClick = (example: string) => {
    setDescription(example)
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full text-sm text-orange-700 mb-4">
              <Wand2 className="w-4 h-4" />
              <span>AI-Powered Generator</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">
              Generate Custom Prompts
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Describe what you need and let AI create a perfectly structured prompt, skill, or configuration for you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Type Selection */}
              <Card>
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">What do you want to create?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {generatorTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedType === type.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${type.color} flex items-center justify-center mb-2`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-neutral-900">{type.name}</p>
                        <p className="text-sm text-neutral-500">{type.description}</p>
                      </button>
                    )
                  })}
                </div>
              </Card>

              {/* Description Input */}
              <Card>
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Describe your needs</h2>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., A senior TypeScript developer who writes clean, well-tested code with a focus on React and Next.js applications..."
                  rows={4}
                  className="mb-4"
                />

                {/* Example prompts */}
                <div className="space-y-2">
                  <p className="text-sm text-neutral-500 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    Try these examples:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.slice(0, 3).map((example, i) => (
                      <button
                        key={i}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-600 transition-colors truncate max-w-[200px]"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Options */}
              <Card>
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Customize</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    options={toneOptions}
                  />
                  <Select
                    label="Detail Level"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    options={lengthOptions}
                  />
                </div>
              </Card>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isGenerating}
                disabled={!description.trim()}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Prompt
              </Button>
            </div>

            {/* Output Section */}
            <div>
              <Card className="h-full" padding="none">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="font-semibold text-neutral-900">Generated Output</h2>
                  {generatedContent && (
                    <div className="flex items-center gap-2">
                      <Button onClick={handleGenerate} variant="ghost" size="sm" disabled={isGenerating}>
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button onClick={handleCopy} variant="secondary" size="sm">
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 min-h-[400px]">
                  {generatedContent ? (
                    <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-mono bg-neutral-50 p-4 rounded-lg overflow-auto max-h-[600px]">
                      {generatedContent}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-neutral-400" />
                      </div>
                      <p className="text-neutral-500 mb-2">Your generated prompt will appear here</p>
                      <p className="text-sm text-neutral-400">
                        Fill in the description and click Generate
                      </p>
                    </div>
                  )}
                </div>

                {generatedContent && (
                  <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-600">
                        Happy with the result? Share it with the community!
                      </p>
                      <Button variant="primary" size="sm">
                        Submit to Directory
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
