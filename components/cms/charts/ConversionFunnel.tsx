"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface FunnelStep {
  name: string;
  value: number;
}

interface ConversionFunnelProps {
  type: 'newsletter' | 'purchase' | 'contact' | 'course';
  title: string;
}

const COLORS = {
  newsletter: '#8B5CF6',
  purchase: '#10B981',
  contact: '#F59E0B',
  course: '#3B82F6'
};

export default function ConversionFunnel({ type, title }: ConversionFunnelProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/funnels?${query}`);
        const json = await res.json();
        if (json.funnels && json.funnels[type]) {
          setData(json.funnels[type]);
        }
      } catch (error) {
        console.error(`Failed to load funnel ${type}`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams, type]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 min-h-[320px] flex flex-col items-center justify-center text-muted-foreground animate-pulse">
        <div className="h-4 w-28 bg-muted/70 rounded-full mb-4" />
        <div className="h-28 w-44 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  const firstValue = data.length > 0 ? data[0].value : 0;
  const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
  const conversionRate = firstValue > 0 ? ((lastValue / firstValue) * 100).toFixed(1) : '0';
  const dropOffRate = firstValue > 0 ? (100 - Number(conversionRate)).toFixed(1) : '0';

  return (
    <div className="rounded-xl border border-border bg-card p-6 min-h-[320px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: COLORS[type] }} 
          />
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 5, right: 35, left: -10, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                horizontal={false} 
                stroke="var(--border)" 
                strokeOpacity={0.6}
              />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={90}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  color: 'var(--foreground)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar 
                dataKey="value" 
                fill={COLORS[type]} 
                radius={[0, 6, 6, 0]} 
                barSize={18}
              >
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  fill="var(--foreground)" 
                  fontSize={11} 
                  formatter={(val: any) => typeof val === "number" ? val.toLocaleString() : val} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Metrics Summary Strip */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
          <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">Conversion</span>
          <span className="text-base font-bold text-foreground">{conversionRate}%</span>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 text-right">
          <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block">Drop-off</span>
          <span className="text-base font-bold text-muted-foreground">{dropOffRate}%</span>
        </div>
      </div>
    </div>
  );
}
