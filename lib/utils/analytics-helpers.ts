import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export function getDateRange(range: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    case '7days':
      return {
        start: subDays(now, 7),
        end: now
      };
    case '30days':
      return {
        start: subDays(now, 30),
        end: now
      };
    case '90days':
      return {
        start: subDays(now, 90),
        end: now
      };
    case 'thisMonth':
      // Up to now, not the end of the month: the previous period is then the same length.
      return {
        start: startOfMonth(now),
        end: now
      };
    case 'lastMonth':
      const lastMonth = subDays(startOfMonth(now), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: parseISO(customStart),
          end: parseISO(customEnd)
        };
      }
      return {
        start: subDays(now, 7),
        end: now
      };
    default:
      return {
        start: subDays(now, 7),
        end: now
      };
  }
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
