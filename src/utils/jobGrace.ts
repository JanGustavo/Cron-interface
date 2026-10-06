export function formatGraceTime(endsAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
  if (!Number.isFinite(seconds)) return '00:00:00';
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}

