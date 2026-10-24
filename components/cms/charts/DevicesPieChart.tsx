"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Smartphone } from 'lucide-react';

const COLORS = ['#8B5CF6', '#06B6D4', '#3B82F6', '#F59E0B'];

export default function DevicesPieChart() {
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/devices?${query}`);
        const json = await res.json();
        if (json.devices) {
          setData(json.devices);
        }
      } catch (error) {
        console.error('Failed to load devices data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="h-full min-h-[380px] flex items-center justify-center rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-28 bg-muted/70 rounded-full" />
          <div className="h-36 w-36 rounded-full bg-muted/40" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full min-h-[380px] flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-muted-foreground">
        <Smartphone className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No device data available for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">Device Breakdown</h3>
        <p className="text-xs text-muted-foreground">Screen & platform share of traffic</p>
      </div>
      
      <div className="h-[280px] w-full my-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
