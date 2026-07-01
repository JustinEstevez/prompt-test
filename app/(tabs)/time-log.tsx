import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TASKS } from '@/constants/tasks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { decimalHoursFromMinutes, formatStopwatch } from '@/utils/time';
import { hexToRgba } from '@/utils/color';

const DEBUG_SPEED_MULTIPLIER = 60;

type LogEntry = {
  id: string;
  taskId: string;
  taskLabel: string;
  ms: number;
};

export default function TimeLogScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;
  const borderColor = Colors[colorScheme].icon;

  const [selectedTaskId, setSelectedTaskId] = useState(TASKS[0].id);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<{ id: string; label: string } | null>(null);
  const [activeSpeedMultiplier, setActiveSpeedMultiplier] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const isRunning = startedAt !== null;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const elapsedMs = isRunning ? (now - startedAt) * activeSpeedMultiplier : 0;

  function handleStart() {
    const task = TASKS.find((t) => t.id === selectedTaskId)!;
    setActiveTask({ id: task.id, label: task.label });
    setActiveSpeedMultiplier(debugMode ? DEBUG_SPEED_MULTIPLIER : 1);
    setStartedAt(Date.now());
  }

  function handleStop() {
    const ms = (Date.now() - startedAt!) * activeSpeedMultiplier;

    if (ms > 0) {
      setEntries((prev) => [
        { id: `${Date.now()}-${Math.random()}`, taskId: activeTask!.id, taskLabel: activeTask!.label, ms },
        ...prev,
      ]);
    }
    setStartedAt(null);
    setActiveTask(null);
  }

  function handleRemove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const taskTotals = TASKS.map((task) => {
    const totalMs = entries
      .filter((e) => e.taskId === task.id)
      .reduce((sum, e) => sum + e.ms, 0);
    return { id: task.id, label: task.label, hours: decimalHoursFromMinutes(totalMs / 60000) };
  }).filter((t) => t.hours > 0);

  const grandTotalHours = decimalHoursFromMinutes(
    entries.reduce((sum, e) => sum + e.ms, 0) / 60000
  );

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.listContent}
      data={entries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <ThemedView style={styles.header}>
          <ThemedText type="title">Time Log</ThemedText>
          <ThemedText style={styles.subtitle}>
            Start the stopwatch when you begin a task, stop it when you&apos;re done.
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Task
          </ThemedText>
          <View style={[styles.chipRow, isRunning && styles.disabled]}>
            {TASKS.map((task) => {
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

          <ThemedText style={styles.stopwatch}>
            {isRunning ? formatStopwatch(elapsedMs) : '0:00'}
          </ThemedText>

          <Pressable
            style={[styles.actionButton, { backgroundColor: isRunning ? '#e74c3c' : tint }]}
            onPress={isRunning ? handleStop : handleStart}>
            <ThemedText style={styles.actionButtonText}>
              {isRunning ? 'Stop Timer' : 'Start Timer'}
            </ThemedText>
          </Pressable>

          <View style={styles.debugRow}>
            <ThemedText style={styles.debugLabel}>
              Debug mode ({DEBUG_SPEED_MULTIPLIER}x speed)
            </ThemedText>
            <Switch value={debugMode} onValueChange={setDebugMode} disabled={isRunning} />
          </View>
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
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingTop: 64,
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
