export type TaskType = {
  id: string;
  label: string;
};

export const TASKS: TaskType[] = [
  { id: 'emails', label: 'Writing Emails' },
  { id: 'reports', label: 'Reading Reports' },
  { id: 'calls', label: 'Phone Calls' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'admin', label: 'Admin Work' },
];
