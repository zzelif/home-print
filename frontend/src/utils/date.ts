/**
 * Robust date & timestamp formatting helpers for HomePrint OS.
 * Normalizes SQLite UTC timestamps and renders in the user's local timezone (e.g. Philippine Time UTC+8).
 */

export function formatLocalTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).trim();
    // If it's already an ISO string with Z or timezone, parse directly; otherwise ensure UTC Z suffix
    const iso = raw.includes('T') ? (raw.endsWith('Z') ? raw : `${raw}Z`) : `${raw.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr || '';
  }
}

export function formatLocalDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).trim();
    const iso = raw.includes('T') ? (raw.endsWith('Z') ? raw : `${raw}Z`) : `${raw.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return dateStr || '';
  }
}
