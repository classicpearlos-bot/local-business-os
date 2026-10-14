/**
 * Helper utilities for Meta 24-Hour Daily Messaging Tier Limit hold & auto-resume.
 * 
 * Meta WhatsApp Cloud API limits Tier 1 accounts to 250 unique business-initiated
 * conversations per rolling 24-hour window.
 */

export interface DailyLimitMeta {
  isDailyLimitPaused: boolean;
  hitAt: string | null;
  resumeAt: string | null;
  heldBackCount: number;
  sentTotal: number;
}

export interface CalculatedResumeWindow {
  stoppedAt: string;
  resumeAt: string;
  displayStopped: string;
  displayResume: string;
  isDue: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  formattedCountdown: string;
}

/**
 * Format a Date or ISO string into friendly Indian Standard Time (IST)
 * e.g. "Today at 7:50 AM", "Tomorrow at 8:00 AM", or "Oct 15, 8:00 AM"
 */
export function formatISTTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    // Compare dates in IST
    const istOpts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };
    const dateStr = d.toLocaleDateString('en-CA', istOpts); // YYYY-MM-DD
    const nowDateStr = now.toLocaleDateString('en-CA', istOpts);

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Check yesterday/today/tomorrow
    const dDay = new Date(dateStr);
    const nowDay = new Date(nowDateStr);
    const diffDays = Math.round((dDay.getTime() - nowDay.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday at ${timeStr}`;
    } else {
      const monthDay = d.toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric'
      });
      return `${monthDay} at ${timeStr}`;
    }
  } catch {
    return String(dateInput);
  }
}

/**
 * Calculates the exact auto-resume timestamp from when the limit was hit.
 * 
 * Logic:
 * - Meta's limit is a rolling 24-hour window from when conversations started/hit limit.
 * - If stopped at 7:50 AM today, the quota starts renewing 24 hours later.
 * - We add a 10-15 minute safety buffer to guarantee Meta's internal server clocks
 *   have completely rolled over the 24-hour window.
 * - E.g. Stopped at 7:50 AM today -> Resumes at 8:00 AM tomorrow (24h + 10m).
 */
export function calculateDailyLimitReset(stoppedAtInput?: Date | string | null): CalculatedResumeWindow {
  const stoppedDate = stoppedAtInput ? new Date(stoppedAtInput) : new Date();
  const validStopped = isNaN(stoppedDate.getTime()) ? new Date() : stoppedDate;

  // Add 24 hours + 10 minutes buffer, rounded up to the nearest 5-minute interval
  const rawResumeMs = validStopped.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 1000;
  const roundedResumeMs = Math.ceil(rawResumeMs / (5 * 60 * 1000)) * (5 * 60 * 1000);
  const resumeDate = new Date(roundedResumeMs);

  const nowMs = Date.now();
  const remainingMs = resumeDate.getTime() - nowMs;
  const isDue = remainingMs <= 0;

  let hoursRemaining = 0;
  let minutesRemaining = 0;
  let formattedCountdown = 'Due now (Ready to dispatch)';

  if (!isDue) {
    const totalMinutes = Math.floor(remainingMs / (60 * 1000));
    hoursRemaining = Math.floor(totalMinutes / 60);
    minutesRemaining = totalMinutes % 60;
    formattedCountdown = `${hoursRemaining}h ${minutesRemaining}m remaining`;
  }

  return {
    stoppedAt: validStopped.toISOString(),
    resumeAt: resumeDate.toISOString(),
    displayStopped: formatISTTime(validStopped),
    displayResume: formatISTTime(resumeDate),
    isDue,
    hoursRemaining,
    minutesRemaining,
    formattedCountdown
  };
}

/**
 * Encodes daily limit hold metadata into the campaign description field.
 */
export function encodeDailyLimitDescription(
  baseDescription: string | null | undefined,
  hitAt: string,
  resumeAt: string,
  heldBackCount: number,
  sentTotal: number
): string {
  const cleanBase = (baseDescription || 'Broadcast')
    .replace(/\s*•\s*\[DAILY_LIMIT_PAUSED:.*?\]/g, '')
    .replace(/\s*•\s*\[Completed: Stopped immediately.*?\]/g, '')
    .trim();

  const tag = `[DAILY_LIMIT_PAUSED: hit_at=${hitAt}|resume_at=${resumeAt}|held_back=${heldBackCount}|sent=${sentTotal}]`;
  return `${cleanBase} • ${tag}`;
}

/**
 * Parses daily limit metadata from a campaign description or recipient records.
 */
export function parseDailyLimitDescription(description: string | null | undefined): DailyLimitMeta {
  if (!description) {
    return {
      isDailyLimitPaused: false,
      hitAt: null,
      resumeAt: null,
      heldBackCount: 0,
      sentTotal: 0
    };
  }

  const match = description.match(/\[DAILY_LIMIT_PAUSED:\s*hit_at=([^|]+)\|resume_at=([^|]+)\|held_back=(\d+)\|sent=(\d+)\]/);
  if (match) {
    return {
      isDailyLimitPaused: true,
      hitAt: match[1],
      resumeAt: match[2],
      heldBackCount: parseInt(match[3], 10) || 0,
      sentTotal: parseInt(match[4], 10) || 0
    };
  }

  // Fallback for legacy format
  if (description.includes('daily limit')) {
    return {
      isDailyLimitPaused: true,
      hitAt: null,
      resumeAt: null,
      heldBackCount: 0,
      sentTotal: 0
    };
  }

  return {
    isDailyLimitPaused: false,
    hitAt: null,
    resumeAt: null,
    heldBackCount: 0,
    sentTotal: 0
  };
}
