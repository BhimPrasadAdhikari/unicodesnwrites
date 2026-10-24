"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Zap, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Activity,
  Layers
} from 'lucide-react';
import MetricCard from '@/components/cms/MetricCard';
import DateRangePicker from '@/components/cms/DateRangePicker';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import type { AiTelemetryOverview } from '@/lib/services/ai-telemetry';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

export default function AiAnalyticsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AiTelemetryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTelemetry() {
      setLoading(true);
      setError('');
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/ai?${query}`);
        if (!res.ok) throw new Error('AI Telemetry data could not be loaded.');
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to load AI telemetry', err);
        setError(err instanceof Error ? err.message : 'AI Telemetry load failed.');
      } finally {
        setLoading(false);
      }
    }

    fetchTelemetry();
  }, [searchParams]);

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="LLM Operations"
        title="AI Telemetry & Token Analytics"
        description="Monitor token consumption, prompt latency, model distributions, and generation logs across platform AI features."
        action={<DateRangePicker />}
      />

      {error && (
        <Alert variant="destructive" className="p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Telemetry Data Unavailable</p>
            <p className="mt-1 opacity-80">{error}</p>
          </div>
        </Alert>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tokens"
          value={data?.totalTokens?.toLocaleString() || '0'}
          loading={loading}
          icon={<Zap className="h-5 w-5" />}
          variant="blue"
        />
        <MetricCard
          title="Prompt / Completion"
          value={`${((data?.promptTokens || 0) / 1000).toFixed(1)}k / ${((data?.completionTokens || 0) / 1000).toFixed(1)}k`}
          loading={loading}
          icon={<Cpu className="h-5 w-5" />}
          variant="cyan"
        />
        <MetricCard
          title="Total Generation Calls"
          value={data?.totalRequests?.toLocaleString() || '0'}
          loading={loading}
          icon={<Activity className="h-5 w-5" />}
          variant="default"
        />
        <MetricCard
          title="Avg. Latency"
          value={`${data?.avgLatencyMs || 0} ms`}
          loading={loading}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Usage */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Model Usage Breakdown</h3>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading model metrics...</div>
          ) : !data?.modelsBreakdown.length ? (
            <p className="text-sm text-muted-foreground py-4">No model telemetry recorded yet for this period.</p>
          ) : (
            <div className="space-y-3">
              {data.modelsBreakdown.map((item) => (
                <div key={item.model} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div>
                    <p className="font-mono text-sm font-semibold">{item.model}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.requests} generation requests</p>
                  </div>
                  <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg bg-secondary text-foreground">
                    {item.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Usage */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Feature Token Distribution</h3>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading feature metrics...</div>
          ) : !data?.featuresBreakdown.length ? (
            <p className="text-sm text-muted-foreground py-4">No feature telemetry recorded yet for this period.</p>
          ) : (
            <div className="space-y-3">
              {data.featuresBreakdown.map((item) => (
                <div key={item.feature} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div>
                    <p className="text-sm font-semibold capitalize">{item.feature.replaceAll('-', ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.requests} calls executed</p>
                  </div>
                  <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg bg-muted text-foreground">
                    {item.totalTokens.toLocaleString()} tokens
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent LLM Generation Stream */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <p className="text-eyebrow text-primary">Live Telemetry Audit</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Recent LLM Generations</h2>
          <p className="text-sm text-muted-foreground">Audit individual generation prompts, token counts, latency, and status.</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading audit stream...</div>
        ) : !data?.recentLogs.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No generation logs recorded for the selected range.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="px-4">Time</TableHead>
                  <TableHead className="px-4">Feature</TableHead>
                  <TableHead className="px-4">Model</TableHead>
                  <TableHead className="px-4">Prompt Tokens</TableHead>
                  <TableHead className="px-4">Completion Tokens</TableHead>
                  <TableHead className="px-4">Total Tokens</TableHead>
                  <TableHead className="px-4">Latency</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {data.recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-medium capitalize">{log.feature}</TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono">{log.model}</TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono">{log.promptTokens.toLocaleString()}</TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono">{log.completionTokens.toLocaleString()}</TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono font-bold">{log.totalTokens.toLocaleString()}</TableCell>
                    <TableCell className="py-3 px-4 text-xs font-mono">{log.latencyMs} ms</TableCell>
                    <TableCell className="py-3 px-4">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive" title={log.error}>
                          <AlertTriangle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
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
