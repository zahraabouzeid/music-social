import type { Period } from '@/api/types';

export const periodOptions: { value: Period; label: string }[] = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All time' },
];

export function periodPhrase(period: Period) {
  return { week: 'the last 7 days', month: 'the last 30 days', year: 'the last year', all: 'all time' }[period];
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function count(value: number) {
  return value < 10_000 ? value.toLocaleString('en') : compact.format(value);
}

export function hours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 600) return `${(minutes / 60).toFixed(1)} h`;
  return `${count(Math.round(minutes / 60))} h`;
}

export function listing(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} d ago`;
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export function percent(similarity: number) {
  return `${Math.round(similarity * 100)}%`;
}

export function dailySeries(daily: { day: string; plays: number }[], days: number) {
  const byDay = new Map(daily.map((entry) => [entry.day, entry.plays]));
  const series: number[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    series.push(byDay.get(date.toISOString().slice(0, 10)) ?? 0);
  }
  return series;
}

export function plural(value: number, one: string, many: string) {
  return value === 1 ? one : many;
}
