"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataItem {
  name: string;
  value: number;
}

interface GenericPieChartProps {
  title: string;
  data: DataItem[];
  loading?: boolean;
}

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function GenericPieChart({ title, data, loading = false }: GenericPieChartProps) {
  if (loading) {
    return (
      <div className="h-[350px] bg-popover p-6 rounded-xl border border-border flex items-center justify-center text-muted-foreground animate-pulse">
        Loading {title}...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] bg-popover p-6 rounded-xl border border-border flex items-center justify-center text-muted-foreground">
        No {title.toLowerCase()} data available.
      </div>
    );
  }

  return (
    <div className="bg-popover p-6 rounded-xl border border-border">
      <h3 className="text-foreground font-medium mb-6">{title}</h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                borderColor: 'var(--tooltip-border, #E4E4E7)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
