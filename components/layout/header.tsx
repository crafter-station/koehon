"use client";

import { StarIcon } from "../icons/icons";
import { ThemeToggle } from "../ui/theme-toggle";
import { ClerkUserButton } from "@/components/elements/clerk-user-button";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const isResourcesPage = pathname === "/resources";

  return (
    <header className="border-b border-zinc-200 px-4 py-4 dark:border-white/10 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-foreground text-sm font-bold text-background dark:bg-white dark:text-black">
            K
          </div>
          <span className="font-semibold">Koehon</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 sm:flex md:gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <StarIcon />
            <span className="hidden md:inline">401</span>
          </div>
          <ThemeToggle />
          {isSignedIn ? (
            <>
              {!isResourcesPage && (
                <Link
                  href="/resources"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Library
                </Link>
              )}
              <ClerkUserButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center text-zinc-600 dark:text-zinc-400"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mt-4 flex flex-col gap-4 border-t border-zinc-200 pt-4 dark:border-white/10 sm:hidden">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <StarIcon />
            401
          </div>
          {isSignedIn ? (
            <>
              {!isResourcesPage && (
                <Link
                  href="/resources"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Library
                </Link>
              )}
              <ClerkUserButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="w-full bg-foreground py-2 text-center text-sm font-medium text-background dark:bg-white dark:text-black"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
