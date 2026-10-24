'use client';

import React, { useState, useRef, useEffect } from 'react';
// We'll treat icons as simple strings/badges for now to avoid massive dependency on first pass
// Ideally we would import specific icons from react-icons/si based on the tech name

interface TechStackSelectorProps {
  selectedTech: string[];
  onChange: (tech: string[]) => void;
}

const COMMON_TECH = [
  'React', 'Next.js', 'Typescript', 'Node.js', 'MongoDB', 'PostgreSQL', 
  'Python', 'TailwindCSS', 'AWS', 'Docker', 'GraphQL', 'Firebase', 
  'Redux', 'Vue.js', 'Angular', 'Svelte', 'Framer Motion', 'Figma',
  'Git', 'Prisma', 'Stripe', 'OpenAI'
];

export default function TechStackSelector({ selectedTech, onChange }: TechStackSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleAdd = (tech: string) => {
    if (tech && !selectedTech.includes(tech)) {
      onChange([...selectedTech, tech]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemove = (tech: string) => {
    onChange(selectedTech.filter(t => t !== tech));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAdd(inputValue.trim());
    }
  };

  const filteredOptions = COMMON_TECH.filter(tech => 
    tech.toLowerCase().includes(inputValue.toLowerCase()) && 
    !selectedTech.includes(tech)
  );

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-foreground mb-1">Tech Stack</label>
      
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTech.map(tech => (
          <span key={tech} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
            {tech}
            <button
              type="button"
              onClick={() => handleRemove(tech)}
              className="ml-1.5 inline-flex text-primary/60 hover:text-primary focus:outline-none"
            >
              <span className="sr-only">Remove {tech}</span>
              &times;
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        className="block w-full rounded-md border-border bg-background text-foreground focus:border-primary focus:ring-primary sm:text-sm p-2 border placeholder:text-muted-foreground"
        placeholder="Type to search or add custom..."
        value={inputValue}
        onChange={e => {
            setInputValue(e.target.value);
            setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {/* Dropdown */}
      {isOpen && inputValue && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-border focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && (
             <li 
                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-popover-foreground hover:bg-muted"
                onClick={() => handleAdd(inputValue)}
             >
                <span className="block truncate">Add &quot;{inputValue}&quot;</span>
             </li>
          )}
          {filteredOptions.map((tech) => (
            <li
              key={tech}
              className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-popover-foreground hover:bg-muted"
              onClick={() => handleAdd(tech)}
            >
              <span className="block truncate">{tech}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
