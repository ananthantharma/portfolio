import {api} from './api';
import {nextOccurrence, statusOf, Task} from './types';

/** Complete consistently from the list or the editor; recurrence runs only after a successful save. */
export async function saveTaskChanges(task: Task, patch: Record<string, unknown>) {
  const saved = await api.update(task._id, patch);
  let warning: string | null = null;
  if (statusOf(task) !== 'done' && statusOf(saved) === 'done') {
    const next = nextOccurrence(saved);
    if (next) {
      try {
        await api.create({
          title: saved.title, priority: saved.priority, dueDate: next, category: saved.category,
          notes: saved.notes, tags: saved.tags, recurrence: saved.recurrence, estimatedTime: saved.estimatedTime,
          sourcePageId: typeof saved.sourcePageId === 'object' ? saved.sourcePageId?._id : saved.sourcePageId,
          subtasks: saved.subtasks?.map(item => ({title: item.title, isCompleted: false})),
          status: 'todo', isCompleted: false,
        });
      } catch {
        warning = 'Task saved, but the next occurrence could not be created. Use Duplicate to create the next task.';
      }
    }
  }
  return {task: saved, warning};
}
