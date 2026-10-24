"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';

export default function TrafficLineChart() {
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/traffic-timeline?${query}`);
        const json = await res.json();
        if (json.timeline) {
          setData(json.timeline);
        }
      } catch (error) {
        console.error('Failed to load traffic data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-32 bg-muted/70 rounded-full" />
          <div className="h-28 w-64 bg-muted/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No traffic data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Traffic & Visitor Trends</h3>
          <p className="text-xs text-muted-foreground">Daily volume comparison over the selected timeframe</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Page Views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span>Unique Visitors</span>
          </div>
        </div>
      </div>

      <div className="h-[310px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViewsMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary, #3B82F6)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary, #3B82F6)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorVisitorsMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="var(--border)" 
              strokeOpacity={0.6}
            />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
              dy={8}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--border)',
                borderRadius: '12px',
                color: 'var(--foreground)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="views" 
              name="Page Views" 
              stroke="var(--primary, #3B82F6)" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorViewsMain)"
              activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--primary, #3B82F6)' }}
            />
            <Area 
              type="monotone" 
              dataKey="visitors" 
              name="Unique Visitors" 
              stroke="#06B6D4" 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill="url(#colorVisitorsMain)"
              activeDot={{ r: 5, strokeWidth: 0, fill: '#06B6D4' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
