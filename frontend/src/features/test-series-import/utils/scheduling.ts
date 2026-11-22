/**
 * Scheduling utilities: UTC <-> IST conversion and window validation
 */

export function toLocalDatetimeInput(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function toUTCISOString(localDatetimeStr?: string | null): string | null {
  if (!localDatetimeStr) return null;
  const date = new Date(localDatetimeStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function validateScheduleWindow(startsAt?: string, endsAt?: string): { isValid: boolean; error?: string } {
  if (!startsAt && !endsAt) return { isValid: true };
  if (startsAt && endsAt) {
    const startMs = new Date(startsAt).getTime();
    const endMs = new Date(endsAt).getTime();
    if (endMs <= startMs) {
      return { isValid: false, error: 'Scheduled End Time must be strictly after Scheduled Start Time.' };
    }
  }
  return { isValid: true };
}

export function formatISTDisplay(isoString?: string | null): string {
  if (!isoString) return 'Immediate';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

