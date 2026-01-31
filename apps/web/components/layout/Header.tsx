'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Github, Terminal, Book, Package, Plus, User, LogOut } from 'lucide-react'
import { Profile } from '@/types/database'

interface HeaderProps {
  user?: Profile | null
  onSignOut?: () => void
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center font-mono font-bold text-white text-sm">
              cpm
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-base font-semibold text-white leading-tight">
                cpm
              </span>
              <span className="text-[10px] text-white/40 leading-tight">
                Package Manager for Claude Code
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/packages"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Package className="w-4 h-4" />
              Packages
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Book className="w-4 h-4" />
              Docs
            </Link>
            <Link
              href="/cli"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Terminal className="w-4 h-4" />
              CLI
            </Link>
            <a
              href="https://github.com/cpm-ai/cpm"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Github className="w-4 h-4" />
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/publish"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Publish
                </Link>
                <div className="relative group">
                  <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-white/70" />
                    )}
                  </button>
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-[#1a1a1e] border border-white/10 rounded-xl shadow-xl py-1 min-w-[140px]">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/publish"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Publish
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white/60 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            <nav className="flex flex-col gap-1">
              <Link
                href="/packages"
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Package className="w-4 h-4" />
                Packages
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Book className="w-4 h-4" />
                Docs
              </Link>
              <Link
                href="/cli"
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Terminal className="w-4 h-4" />
                CLI
              </Link>
              <div className="my-2 border-t border-white/5" />
              {user ? (
                <>
                  <Link
                    href="/publish"
                    className="px-3 py-2 text-sm text-orange-400 hover:text-orange-300 hover:bg-white/5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Publish Package
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onSignOut?.()
                    }}
                    className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/publish"
                    className="px-3 py-2 text-sm text-orange-400 hover:text-orange-300 hover:bg-white/5 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Publish Package
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
