import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'default' | 'blue' | 'cyan' | 'success' | 'warning' | 'purple';
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false,
  variant = 'default'
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="flex justify-between items-center mb-3">
          <div className="h-3.5 w-24 bg-muted/60 rounded-full" />
          <div className="h-9 w-9 bg-muted/50 rounded-xl" />
        </div>
        <div className="h-7 w-28 bg-muted/80 rounded-lg mb-2" />
        <div className="h-3.5 w-16 bg-muted/40 rounded-full" />
      </div>
    );
  }

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  const variantStyles = {
    default: 'bg-secondary text-foreground border-border',
    blue: 'bg-secondary text-foreground border-border',
    cyan: 'bg-accent/10 text-accent border-accent/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    purple: 'bg-secondary text-foreground border-border',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{title}</h3>
        {icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${variantStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="font-serif text-[32px] font-medium leading-none tracking-[-0.02em] text-foreground sm:text-[36px]">
          {value}
        </div>
        
        {change !== undefined && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono text-[12px] font-medium ${
              isNeutral 
                ? 'bg-muted text-muted-foreground'
                : isPositive 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
            }`}>
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              <span>
                {change > 0 && '+'}
                {change.toFixed(1)}%
              </span>
            </span>
            <span className="text-2xs text-muted-foreground">vs prev period</span>
          </div>
        )}
      </div>
    </div>
  );
}
