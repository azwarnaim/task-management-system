import { Task } from './types';

/**
 * Checks if assigning parentId to taskId would create a circular dependency
 * @param tasks - All tasks in the system
 * @param taskId - The task being edited/created
 * @param parentId - The proposed parent task ID
 * @returns true if circular dependency would be created, false otherwise
 */
export function wouldCreateCircularDependency(
  tasks: Task[],
  taskId: number | null,
  parentId: number | null
): boolean {
  if (!parentId || !taskId) return false;
  if (taskId === parentId) return true;

  // Build a map of task relationships
  const taskMap = new Map<number, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  // Traverse up the parent chain to see if we encounter taskId
  let currentId: number | null = parentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (currentId === taskId) {
      // Circular dependency detected
      return true;
    }

    if (visited.has(currentId)) {
      // Already visited this node, avoid infinite loop
      break;
    }

    visited.add(currentId);
    const currentTask = taskMap.get(currentId);
    currentId = currentTask?.parentId ?? null;
  }

  return false;
}

/**
 * Gets all ancestors of a task
 * @param tasks - All tasks in the system
 * @param taskId - The task ID to get ancestors for
 * @returns Array of ancestor task IDs
 */
export function getTaskAncestors(tasks: Task[], taskId: number): number[] {
  const taskMap = new Map<number, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const ancestors: number[] = [];
  let currentId: number | null = taskMap.get(taskId)?.parentId ?? null;

  while (currentId !== null) {
    ancestors.push(currentId);
    const currentTask = taskMap.get(currentId);
    currentId = currentTask?.parentId ?? null;
  }

  return ancestors;
}

/**
 * Gets all descendants of a task (children, grandchildren, etc.)
 * @param tasks - All tasks in the system
 * @param taskId - The task ID to get descendants for
 * @returns Array of descendant task IDs
 */
export function getTaskDescendants(tasks: Task[], taskId: number): number[] {
  const descendants: number[] = [];
  const children = tasks.filter(task => task.parentId === taskId);

  children.forEach(child => {
    descendants.push(child.id);
    // Recursively get descendants of this child
    const childDescendants = getTaskDescendants(tasks, child.id);
    descendants.push(...childDescendants);
  });

  return descendants;
}

/**
 * Gets tasks that cannot be selected as parent (self and descendants)
 * @param tasks - All tasks in the system
 * @param taskId - The task being edited (null for new tasks)
 * @returns Array of task IDs that should be disabled
 */
export function getInvalidParentIds(tasks: Task[], taskId: number | null): number[] {
  if (!taskId) return [];
  
  const descendants = getTaskDescendants(tasks, taskId);
  return [taskId, ...descendants];
}
