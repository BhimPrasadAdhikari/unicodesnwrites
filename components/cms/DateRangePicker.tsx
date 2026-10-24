"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

const ranges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 90 days', value: '90days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
];

export default function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('range') || '7days';
  
  const [isOpen, setIsOpen] = useState(false);

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('range', range);
    params.delete('start');
    params.delete('end');
    
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
        aria-expanded={isOpen}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {ranges.find(r => r.value === currentRange)?.label || 'Custom Range'}
        </span>
        <ChevronDown className={`ml-0.5 h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover/95 p-1.5 shadow-overlay z-30 overflow-hidden">
            <div className="space-y-0.5">
              {ranges.map((range) => {
                const isSelected = currentRange === range.value;
                return (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => handleRangeChange(range.value)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{range.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
