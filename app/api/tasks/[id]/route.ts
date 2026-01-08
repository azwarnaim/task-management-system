import { NextRequest, NextResponse } from 'next/server';
import { taskDB } from '@/lib/db';
import { wouldCreateCircularDependency } from '@/lib/task-utils';

// GET /api/tasks/[id] - Get task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const task = await taskDB.getTaskById(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { header, type, status, target, limit, reviewer, parentId } = body;

    // Check if task exists
    const existingTask = await taskDB.getTaskById(id);
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check for circular dependency if parent is being changed
    if (parentId !== undefined && parentId !== existingTask.parentId) {
      const allTasks = await taskDB.getAllTasks();
      
      if (wouldCreateCircularDependency(allTasks, id, parentId)) {
        return NextResponse.json(
          { error: 'This would create a circular dependency' },
          { status: 400 }
        );
      }

      // Verify parent task exists if parentId is provided
      if (parentId !== null) {
        const parentTask = await taskDB.getTaskById(parentId);
        if (!parentTask) {
          return NextResponse.json(
            { error: 'Parent task not found' },
            { status: 404 }
          );
        }
      }
    }

    const updatedTask = await taskDB.updateTask(id, {
      header,
      type,
      status,
      target,
      limit,
      reviewer,
      parentId: parentId === null ? undefined : parentId,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Check if task has children
    if (await taskDB.hasChildren(id)) {
      return NextResponse.json(
        { error: 'Cannot delete task with child tasks. Delete or reassign children first.' },
        { status: 400 }
      );
    }

    const deleted = await taskDB.deleteTask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
