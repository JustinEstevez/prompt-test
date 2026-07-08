/** Normalizes a task name for case-insensitive matching (e.g. so "emails" groups with "Emails"). */
export function normalizeTaskName(name: string): string {
  return name.trim().toLowerCase();
}
