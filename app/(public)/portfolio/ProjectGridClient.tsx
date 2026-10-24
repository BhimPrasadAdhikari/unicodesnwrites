'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectFilters from '@/components/public/ProjectFilters';
import ProjectCard from '@/components/public/ProjectCard';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProjectGridProps {
  initialProjects: any[];
}

export default function ProjectGridClient({ initialProjects }: ProjectGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlCategory = searchParams.get('category') || '';
  const urlQuery = searchParams.get('q') || '';

  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const [query, setQuery] = useState(urlQuery);

  // Helper to update URL search params without page reload loops
  const updateUrl = useCallback(
    (category: string, qStr: string) => {
      const next = new URLSearchParams();
      if (category && category !== 'All') {
        next.set('category', category);
      }
      const trimmed = qStr.trim();
      if (trimmed) {
        next.set('q', trimmed);
      }

      const nextQueryString = next.toString();
      const targetUrl = `/projects${nextQueryString ? `?${nextQueryString}` : ''}`;

      // Use shallow window history update to avoid re-triggering full server component reloads
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
        }
      }
    },
    []
  );

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    updateUrl(cat, query);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
  };

  // Debounced URL update for text input
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(activeCategory, query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, activeCategory, updateUrl]);

  const filteredProjects = useMemo(() => {
    let result = initialProjects;
    if (activeCategory && activeCategory !== 'All') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) =>
        [p.title, p.shortDescription, p.category, ...(p.techStack || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeCategory, initialProjects, query]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0 lg:flex-1">
          <ProjectFilters
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>
        <div className="w-full lg:max-w-xs relative">
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search projects..."
            className="w-full border-b border-border bg-transparent px-4 py-2.5 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none placeholder:text-muted-foreground mr-1"
          />
        </div>
      </div>

      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <AnimatePresence>
          {filteredProjects.map((project) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              key={project._id}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">No projects found.</p>
          <button
            onClick={() => {
              handleCategoryChange('');
              setQuery('');
            }}
            className="mt-4 text-primary hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
