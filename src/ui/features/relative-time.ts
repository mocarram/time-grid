/** Format an ISO timestamp as a relative phrase. */
export function formatRelativeTime(isoOrNull: string | null, nowMs: number = Date.now()): string | null {
  if (!isoOrNull) return null;
  const then = new Date(isoOrNull).getTime();
  if (Number.isNaN(then)) return null;
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) return diffSec <= 1 ? "just now" : `${diffSec} seconds ago`;
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
