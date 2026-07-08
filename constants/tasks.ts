export type TaskType = {
  id: string;
  label: string;
};

/** Seed list the task picker starts with — users can add or remove tasks from here at runtime. */
export const DEFAULT_TASKS: TaskType[] = [
  { id: 'emails', label: 'Writing Emails' },
  { id: 'reports', label: 'Reading Reports' },
  { id: 'calls', label: 'Phone Calls' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'admin', label: 'Admin Work' },
];
