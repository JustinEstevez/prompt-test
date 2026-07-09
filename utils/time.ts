/** Converts elapsed minutes into hours rounded to the nearest tenth (each tenth = 6 minutes).
 *  Exactly half a block (e.g. 3 of 6 minutes) rounds down, not up. */
export function decimalHoursFromMinutes(minutes: number): number {
  const blocks = minutes / 6;
  return Math.ceil(blocks - 0.5) / 10;
}

/** Parses a 12-hour clock time like "1:35pm", "1:35 PM", or "1pm" into minutes since midnight.
 *  Returns null if the string isn't a valid 12-hour time. */
export function parseTime12h(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (hour < 1 || hour > 12 || minute > 59) return null;

  if (meridiem === 'am') {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }

  return hour * 60 + minute;
}

/** Formats elapsed milliseconds as a running stopwatch display, e.g. "1:02:03" or "12:03". */
export function formatStopwatch(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
