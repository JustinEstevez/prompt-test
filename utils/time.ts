/** Converts elapsed minutes into hours rounded to the nearest tenth (each tenth = 6 minutes).
 *  Exactly half a block (e.g. 3 of 6 minutes) rounds down, not up. */
export function decimalHoursFromMinutes(minutes: number): number {
  const blocks = minutes / 6;
  return Math.ceil(blocks - 0.5) / 10;
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
