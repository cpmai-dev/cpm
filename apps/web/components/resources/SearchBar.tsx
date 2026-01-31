'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search prompts, skills, and more...', className }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all',
          isFocused ? 'border-orange-500 ring-2 ring-orange-200' : 'border-neutral-200'
        )}
      >
        <Search className={cn('w-5 h-5 transition-colors', isFocused ? 'text-orange-500' : 'text-neutral-400')} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none"
        />
        {value && (
          <button onClick={handleClear} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
