"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface TableItem {
  label: string;
  value: number;
  subValue?: string | number;
}

interface AnalyticsTableProps {
  title: string;
  endpoint: string;
  columns: {
    label: string;
    key: string;
    format?: (value: any) => string | number;
  }[];
  mapData: (data: any) => TableItem[];
}

export default function AnalyticsTable({ title, endpoint, columns, mapData }: AnalyticsTableProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const firstColumnLabel = columns[0]?.label || 'Name';
  const secondColumnLabel = columns[1]?.label || 'Value';
  const secondColumnFormatter = columns[1]?.format;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = searchParams.toString();
        const res = await fetch(`${endpoint}?${query}`);
        const json = await res.json();
        const items = mapData(json);
        setData(items || []);
      } catch (error) {
        console.error(`Failed to load ${title} data`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams, endpoint, mapData, title]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 min-h-[300px] flex flex-col justify-center items-center text-muted-foreground animate-pulse">
        <div className="h-4 w-32 bg-muted/70 rounded-full mb-4" />
        <div className="space-y-2 w-full max-w-xs">
          <div className="h-8 bg-muted/40 rounded-xl w-full" />
          <div className="h-8 bg-muted/30 rounded-xl w-full" />
          <div className="h-8 bg-muted/20 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 min-h-[300px] flex flex-col justify-between">
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">Top performers for current range</p>
        </div>
        
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-36 text-sm text-muted-foreground italic">
            No data recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <TableHead className="py-2.5 pr-4">{firstColumnLabel}</TableHead>
                  <TableHead className="py-2.5 text-right pl-4">{secondColumnLabel}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-2.5 pr-4 font-medium text-foreground truncate max-w-[180px]" title={item.label}>
                      {item.label}
                    </TableCell>
                    <TableCell className="py-2.5 pl-4 text-right font-semibold text-foreground">
                      {secondColumnFormatter
                        ? secondColumnFormatter(item.value)
                        : item.value.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
