'use client';

import React from 'react';
import {Globe2Icon, Layout, Server, Cpu, Smartphone, Globe } from 'lucide-react';

const CATEGORIES = [
    { name: 'All', icon: Globe2Icon },
    { name: 'Full-Stack', icon: Globe },
    { name: 'Frontend', icon: Layout },
    { name: 'Backend', icon: Server },
    { name: 'AI/ML', icon: Cpu },
    { name: 'Mobile', icon: Smartphone }
];

interface ProjectFiltersProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

export default function ProjectFilters({ activeCategory, onCategoryChange }: ProjectFiltersProps) {
  return (
    // One scrollable row at every width: wrapping orphaned the last tab around 800px
    <div className="no-scrollbar -mx-6 flex min-w-0 gap-1 overflow-x-auto border-b border-border px-6 md:mx-0 md:px-0">
      {CATEGORIES.map(({ name, icon: Icon }) => {
        const isActive = (name === 'All' && activeCategory === '') || name === activeCategory;
        
        return (
          <button
              key={name}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(name === 'All' ? '' : name)}
              className={`
                  -mb-px shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2
                  ${isActive
                      ? 'border-foreground text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
              `}
          >
              <Icon className="h-4 w-4" />
              {name}
          </button>
        );
      })}
    </div>
  );
}
