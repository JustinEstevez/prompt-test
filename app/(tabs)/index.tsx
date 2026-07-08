import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_TASKS, TaskType } from '@/constants/tasks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { decimalHoursFromMinutes, formatStopwatch } from '@/utils/time';
import { hexToRgba } from '@/utils/color';
import { normalizeTaskName } from '@/utils/tasks';

const DEBUG_SPEED_MULTIPLIER = 60;

type LogEntry = {
  id: string;
  taskLabel: string;
  ms: number;
};

export default function TimeLogScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const borderColor = Colors[colorScheme].icon;
  // Dark mode's tint is pure white, so white button text would be invisible on it.
  const tintTextColor = colorScheme === 'dark' ? Colors.dark.background : '#fff';
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<TaskType[]>(DEFAULT_TASKS);
  const [newTaskName, setNewTaskName] = useState('');
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<'select' | 'manage'>('select');
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(DEFAULT_TASKS[0]?.id ?? '');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<{ id: string; label: string } | null>(null);
  const [activeSpeedMultiplier, setActiveSpeedMultiplier] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [manualHoursText, setManualHoursText] = useState('');
  const [manualMinutesText, setManualMinutesText] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const isRunning = startedAt !== null;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const elapsedMs = isRunning ? (now - startedAt) * activeSpeedMultiplier : 0;

  function handleStart() {
    const task = tasks.find((t) => t.id === selectedTaskId)!;
    setActiveTask({ id: task.id, label: task.label });
    setActiveSpeedMultiplier(debugMode ? DEBUG_SPEED_MULTIPLIER : 1);
    const startTime = Date.now();
    setNow(startTime);
    setStartedAt(startTime);
  }

  function handleStop() {
    const ms = (Date.now() - startedAt!) * activeSpeedMultiplier;

    if (ms > 0) {
      setEntries((prev) => [
        { id: `${Date.now()}-${Math.random()}`, taskLabel: activeTask!.label, ms },
        ...prev,
      ]);
    }
    setStartedAt(null);
    setActiveTask(null);
  }

  function handleAddTask() {
    const name = newTaskName.trim();
    if (!name) {
      setTaskError('Enter a task name.');
      return;
    }
    if (tasks.some((t) => normalizeTaskName(t.label) === normalizeTaskName(name))) {
      setTaskError('That task already exists.');
      return;
    }

    const newTask: TaskType = { id: `${Date.now()}-${Math.random()}`, label: name };
    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
    setNewTaskName('');
    setTaskError(null);
  }

  function handleRemoveTask(id: string) {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    if (selectedTaskId === id) {
      setSelectedTaskId(next[0]?.id ?? '');
    }
  }

  function handleManualMinutesChange(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      setManualMinutesText('');
      return;
    }
    const clamped = Math.min(parseInt(digitsOnly, 10), 59);
    setManualMinutesText(`${clamped}`);
  }

  function handleLogManual() {
    const hours = manualHoursText.trim() ? parseInt(manualHoursText, 10) : 0;
    const minutes = manualMinutesText.trim() ? parseInt(manualMinutesText, 10) : 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      setManualError('Enter an amount of time greater than 0.');
      return;
    }

    const task = tasks.find((t) => t.id === selectedTaskId)!;
    setEntries((prev) => [
      { id: `${Date.now()}-${Math.random()}`, taskLabel: task.label, ms: totalMinutes * 60000 },
      ...prev,
    ]);
    setManualHoursText('');
    setManualMinutesText('');
    setManualError(null);
  }

  function handleRemove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // Grouped by normalized name (not task id) so time logged against a since-removed task
  // keeps accumulating if a task with the same name (any case) is added back later.
  const totalsByName = new Map<string, { label: string; ms: number }>();
  for (const entry of entries) {
    const key = normalizeTaskName(entry.taskLabel);
    const existing = totalsByName.get(key);
    if (existing) {
      existing.ms += entry.ms;
    } else {
      totalsByName.set(key, { label: entry.taskLabel, ms: entry.ms });
    }
  }
  for (const task of tasks) {
    const existing = totalsByName.get(normalizeTaskName(task.label));
    if (existing) existing.label = task.label;
  }

  const taskTotals = Array.from(totalsByName.entries())
    .map(([key, { label, ms }]) => ({
      id: key,
      label,
      hours: decimalHoursFromMinutes(ms / 60000),
    }))
    .filter((t) => t.hours > 0);

  const grandTotalHours = decimalHoursFromMinutes(
    entries.reduce((sum, e) => sum + e.ms, 0) / 60000
  );

  return (
    <ThemedView style={styles.flex}>
    <FlatList
      style={styles.flex}
      contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
      data={entries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <ThemedView style={styles.header}>
          <View style={styles.modeRow}>
            {(['timer', 'manual'] as const).map((m) => {
              const selected = mode === m;
              return (
                <Pressable
                  key={m}
                  disabled={isRunning}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeButton,
                    { borderColor },
                    selected && { backgroundColor: hexToRgba(tint, 0.15), borderColor: tint },
                  ]}>
                  <ThemedText
                    style={[styles.chipText, selected && { color: tint, fontWeight: '600' }]}>
                    {m === 'timer' ? 'Timer' : 'Manual'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.modeRow}>
            {(['select', 'manage'] as const).map((v) => {
              const selected = taskView === v;
              return (
                <Pressable
                  key={v}
                  disabled={isRunning}
                  onPress={() => setTaskView(v)}
                  style={[
                    styles.modeButton,
                    { borderColor },
                    selected && { backgroundColor: hexToRgba(tint, 0.15), borderColor: tint },
                  ]}>
                  <ThemedText
                    style={[styles.chipText, selected && { color: tint, fontWeight: '600' }]}>
                    {v === 'select' ? 'Tasks' : 'Manage Tasks'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {taskView === 'select' ? (
            tasks.length === 0 ? (
              <ThemedText style={styles.subtitle}>Add a task in Manage Tasks to get started.</ThemedText>
            ) : (
              <View style={[styles.chipRow, isRunning && styles.disabled]}>
                {tasks.map((task) => {
                  const selected = task.id === selectedTaskId;
                  return (
                    <Pressable
                      key={task.id}
                      disabled={isRunning}
                      onPress={() => setSelectedTaskId(task.id)}
                      style={[
                        styles.chip,
                        { borderColor },
                        selected && { backgroundColor: hexToRgba(tint, 0.15), borderColor: tint },
                      ]}>
                      <ThemedText
                        style={[styles.chipText, selected && { color: tint, fontWeight: '600' }]}>
                        {task.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : (
            <>
              <View style={[styles.manageTaskList, isRunning && styles.disabled]}>
                {tasks.map((task) => (
                  <View key={task.id} style={[styles.manageTaskRow, { borderColor }]}>
                    <ThemedText style={styles.entryLabel}>{task.label}</ThemedText>
                    <Pressable
                      disabled={isRunning}
                      onPress={() => handleRemoveTask(task.id)}
                      style={styles.removeButton}>
                      <ThemedText style={styles.removeButtonText}>✕</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addTaskRow}>
                <TextInput
                  style={[styles.input, styles.addTaskInput, { borderColor, color: Colors[colorScheme].text }]}
                  placeholder="New task name"
                  placeholderTextColor={borderColor}
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  editable={!isRunning}
                />
                <Pressable
                  disabled={isRunning}
                  style={[styles.addTaskButton, { backgroundColor: tint }]}
                  onPress={handleAddTask}>
                  <ThemedText style={[styles.actionButtonText, { color: tintTextColor }]}>Add</ThemedText>
                </Pressable>
              </View>
              {taskError && <ThemedText style={styles.error}>{taskError}</ThemedText>}
            </>
          )}

          {tasks.length === 0 ? null : mode === 'timer' ? (
            <>
              <ThemedText style={styles.stopwatch}>
                {isRunning ? formatStopwatch(elapsedMs) : '0:00'}
              </ThemedText>

              <Pressable
                style={[styles.actionButton, { backgroundColor: isRunning ? '#e74c3c' : tint }]}
                onPress={isRunning ? handleStop : handleStart}>
                <ThemedText
                  style={[styles.actionButtonText, { color: isRunning ? '#fff' : tintTextColor }]}>
                  {isRunning ? 'Stop Timer' : 'Start Timer'}
                </ThemedText>
              </Pressable>

              <View style={styles.debugRow}>
                <ThemedText style={styles.debugLabel}>
                  Debug mode ({DEBUG_SPEED_MULTIPLIER}x speed)
                </ThemedText>
                <Switch value={debugMode} onValueChange={setDebugMode} disabled={isRunning} />
              </View>
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
                Time
              </ThemedText>
              <View style={styles.durationRow}>
                <View style={styles.durationField}>
                  <TextInput
                    style={[styles.input, { borderColor, color: Colors[colorScheme].text }]}
                    placeholder="0"
                    placeholderTextColor={borderColor}
                    value={manualHoursText}
                    onChangeText={(text) => setManualHoursText(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                  />
                  <ThemedText style={styles.durationFieldLabel}>hours</ThemedText>
                </View>
                <View style={styles.durationField}>
                  <TextInput
                    style={[styles.input, { borderColor, color: Colors[colorScheme].text }]}
                    placeholder="0"
                    placeholderTextColor={borderColor}
                    value={manualMinutesText}
                    onChangeText={handleManualMinutesChange}
                    keyboardType="numeric"
                  />
                  <ThemedText style={styles.durationFieldLabel}>minutes</ThemedText>
                </View>
              </View>

              {manualError && <ThemedText style={styles.error}>{manualError}</ThemedText>}

              <Pressable style={[styles.actionButton, { backgroundColor: tint }]} onPress={handleLogManual}>
                <ThemedText style={[styles.actionButtonText, { color: tintTextColor }]}>Log Time</ThemedText>
              </Pressable>
            </>
          )}
        </ThemedView>
      }
      renderItem={({ item }) => (
        <ThemedView style={[styles.entryRow, { borderColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.entryLabel}>
            {item.taskLabel}
          </ThemedText>
          <ThemedText style={styles.entryDuration}>{formatStopwatch(item.ms)}</ThemedText>
          <Pressable onPress={() => handleRemove(item.id)} style={styles.removeButton}>
            <ThemedText style={styles.removeButtonText}>✕</ThemedText>
          </Pressable>
        </ThemedView>
      )}
      ListEmptyComponent={<ThemedText style={styles.empty}>No entries yet.</ThemedText>}
      ListFooterComponent={
        entries.length > 0 ? (
          <ThemedView style={styles.summary}>
            {taskTotals.map((t) => (
              <View key={t.id} style={styles.summaryRow}>
                <ThemedText>{t.label}</ThemedText>
                <ThemedText type="defaultSemiBold">{t.hours.toFixed(1)}</ThemedText>
              </View>
            ))}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText type="subtitle">Total</ThemedText>
              <ThemedText type="subtitle">{grandTotalHours.toFixed(1)}</ThemedText>
            </View>
          </ThemedView>
        ) : null
      }
    />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    gap: 12,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 14,
  },
  manageTaskList: {
    gap: 8,
  },
  manageTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  addTaskRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addTaskInput: {
    flex: 1,
    textAlign: 'left',
  },
  addTaskButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationField: {
    flex: 1,
    gap: 4,
  },
  durationFieldLabel: {
    opacity: 0.6,
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    color: '#e74c3c',
  },
  stopwatch: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  debugLabel: {
    opacity: 0.7,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  entryLabel: {
    flex: 1,
  },
  entryDuration: {
    opacity: 0.7,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
    opacity: 0.5,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 24,
  },
  summary: {
    marginTop: 8,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
});
