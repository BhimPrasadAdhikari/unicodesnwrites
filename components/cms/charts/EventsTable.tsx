'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Mail, 
  Download, 
  ShoppingBag, 
  Share2, 
  MessageSquare, 
  Search, 
  MousePointer2, 
  Code,
  Zap
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const EVENT_ICON_MAP: Record<string, React.ReactNode> = {
  blog_view: <FileText className="h-4 w-4" />,
  newsletter_signup: <Mail className="h-4 w-4" />,
  resume_download: <Download className="h-4 w-4" />,
  product_view: <ShoppingBag className="h-4 w-4" />,
  social_link_click: <Share2 className="h-4 w-4" />,
  contact_form_submit: <MessageSquare className="h-4 w-4" />,
  project_filter: <Search className="h-4 w-4" />,
  cta_button_click: <MousePointer2 className="h-4 w-4" />,
  code_walkthrough_open: <Code className="h-4 w-4" />,
};

const getEventIcon = (name: string) => {
  return EVENT_ICON_MAP[name] || <Zap className="h-4 w-4" />;
};

interface EventRow {
  name: string;
  count: number;
  change: number;
  category: string;
  lastOccurred: string;
  icon: string;
}

export default function EventsTable() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const query = searchParams.toString();
        const res = await fetch(`/api/analytics/events?${query}`);
        const json = await res.json();
        
        if (json.events) {
          setEvents(json.events);
        }
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 min-h-[360px] flex items-center justify-center text-muted-foreground animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-32 bg-muted/70 rounded-full" />
          <div className="h-24 w-64 bg-muted/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr className="border-b border-border bg-muted/40 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              <TableHead>Event Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Trend</TableHead>
              <TableHead>Last Recorded</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {events.length > 0 ? (
              events.map((event, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                        {getEventIcon(event.name)}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground capitalize block">
                          {event.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-2xs font-mono text-muted-foreground">
                          {event.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted/80 px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">
                      {event.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {event.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs ${event.change >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {event.change >= 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {Math.abs(event.change)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(event.lastOccurred).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No events recorded in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
