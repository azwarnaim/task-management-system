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

/**
 * Gets direct children of a task
 * @param tasks - All tasks in the system
 * @param taskId - The task ID to get children for
 * @returns Array of child tasks
 */
export function getTaskChildren(tasks: Task[], taskId: number): Task[] {
  return tasks.filter(task => task.parentId === taskId);
}

/**
 * Gets dependency counts for a parent task
 * @param tasks - All tasks in the system
 * @param taskId - The parent task ID
 * @returns Object with total, done, and complete counts
 */
export function getDependencyCounts(tasks: Task[], taskId: number) {
  const children = getTaskChildren(tasks, taskId);
  return {
    total: children.length,
    done: children.filter(t => t.status === 'DONE').length,
    complete: children.filter(t => t.status === 'COMPLETE').length,
  };
}

/**
 * Checks if all dependencies of a task are COMPLETE
 * @param tasks - All tasks in the system
 * @param taskId - The task ID to check
 * @returns true if all dependencies are COMPLETE
 */
export function areAllDependenciesComplete(tasks: Task[], taskId: number): boolean {
  const children = getTaskChildren(tasks, taskId);
  if (children.length === 0) return false;
  return children.every(child => child.status === 'COMPLETE');
}

/**
 * Propagates status changes up the hierarchy
 * When a task becomes DONE and all dependencies are COMPLETE -> mark as COMPLETE
 * When a task becomes IN PROGRESS -> mark parent as DONE (if COMPLETE)
 * @param tasks - All tasks in the system
 * @param taskId - The task that changed
 * @param newStatus - The new status of the task
 * @returns Array of tasks that need to be updated with their new statuses
 */
export function propagateStatusChange(
  tasks: Task[],
  taskId: number,
  newStatus: string
): Array<{ id: number; status: string }> {
  const updates: Array<{ id: number; status: string }> = [];
  const taskMap = new Map<number, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const currentTask = taskMap.get(taskId);
  if (!currentTask) return updates;

  // Update current task
  updates.push({ id: taskId, status: newStatus });

  // Case 1: Task marked as DONE - check if it should auto-upgrade to COMPLETE
  // Only upgrade to COMPLETE when all children (dependencies) are COMPLETE
  if (newStatus === 'DONE') {
    const children = getTaskChildren(tasks, taskId);
    if (children.length > 0 && children.every(child => child.status === 'COMPLETE')) {
      // Has dependencies and all are COMPLETE - auto-upgrade to COMPLETE
      updates[0].status = 'COMPLETE';
      newStatus = 'COMPLETE'; // Update for next check
    }
    
    // Also notify parent that this child is now DONE
    // Parent should check if all children are DONE/COMPLETE and upgrade to COMPLETE
    if (currentTask.parentId) {
      propagateUpwardsComplete(tasks, currentTask.parentId, updates);
    }
  }

  // Case 2: If task is now COMPLETE (either manually or auto-upgraded)
  // Notify parent to check if it can also become COMPLETE
  if (newStatus === 'COMPLETE' && currentTask.parentId) {
    propagateUpwardsComplete(tasks, currentTask.parentId, updates);
  }

  // Case 3: Task marked as IN PROGRESS - propagate down-grading up the chain
  if (newStatus === 'IN PROGRESS' && currentTask.parentId) {
    propagateUpwardsDone(tasks, currentTask.parentId, updates);
  }

  return updates;
}

/**
 * Helper function to propagate COMPLETE status upwards
 * Checks if parent can become COMPLETE when all children are DONE or COMPLETE
 */
function propagateUpwardsComplete(
  tasks: Task[],
  parentId: number,
  updates: Array<{ id: number; status: string }>
): void {
  const taskMap = new Map<number, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const parent = taskMap.get(parentId);
  if (!parent) return;

  // Get current parent status (considering pending updates)
  const existingParentUpdate = updates.find(u => u.id === parentId);
  const currentParentStatus = existingParentUpdate?.status || parent.status;

  // Apply pending updates to check current state of children
  const updatedStatuses = new Map(updates.map(u => [u.id, u.status]));
  
  const children = getTaskChildren(tasks, parentId);
  if (children.length === 0) return; // No children, can't auto-upgrade

  // Check if all children are DONE or COMPLETE
  const allChildrenDoneOrComplete = children.every(child => {
    const status = updatedStatuses.get(child.id) || child.status;
    return status === 'DONE' || status === 'COMPLETE';
  });

  if (allChildrenDoneOrComplete) {
    // Upgrade all DONE children to COMPLETE
    children.forEach(child => {
      const childStatus = updatedStatuses.get(child.id) || child.status;
      if (childStatus === 'DONE') {
        const existingChildUpdate = updates.find(u => u.id === child.id);
        if (existingChildUpdate) {
          existingChildUpdate.status = 'COMPLETE';
        } else {
          updates.push({ id: child.id, status: 'COMPLETE' });
        }
        updatedStatuses.set(child.id, 'COMPLETE');
      }
    });

    // When all children are DONE or COMPLETE, parent should be marked as COMPLETE
    // regardless of its current status (IN PROGRESS, DONE, etc.)
    if (existingParentUpdate) {
      existingParentUpdate.status = 'COMPLETE';
    } else {
      updates.push({ id: parentId, status: 'COMPLETE' });
    }

    // Continue propagating up
    if (parent.parentId) {
      propagateUpwardsComplete(tasks, parent.parentId, updates);
    }
  }
}

/**
 * Helper function to propagate DONE status upwards (from COMPLETE to DONE)
 * When a child task is changed to IN PROGRESS, update parent from COMPLETE to DONE
 * Parent task must never revert to IN PROGRESS
 */
function propagateUpwardsDone(
  tasks: Task[],
  parentId: number,
  updates: Array<{ id: number; status: string }>
): void {
  const taskMap = new Map<number, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  const parent = taskMap.get(parentId);
  if (!parent) return;

  // Get current parent status (considering pending updates)
  const existingParentUpdate = updates.find(u => u.id === parentId);
  const currentParentStatus = existingParentUpdate?.status || parent.status;

  // Only downgrade from COMPLETE to DONE, never to IN PROGRESS
  if (currentParentStatus === 'COMPLETE') {
    if (existingParentUpdate) {
      existingParentUpdate.status = 'DONE';
    } else {
      updates.push({ id: parentId, status: 'DONE' });
    }

    // Continue propagating up
    if (parent.parentId) {
      propagateUpwardsDone(tasks, parent.parentId, updates);
    }
  }
}
