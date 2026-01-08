import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, taskDB } from '@/lib/db';
import { wouldCreateCircularDependency } from '@/lib/task-utils';

// Initialize database on first import
initializeDatabase();

// GET /api/tasks - Get all tasks or paginated tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // If pagination params provided, use pagination
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
        return NextResponse.json(
          { error: 'Invalid pagination parameters' },
          { status: 400 }
        );
      }

      const result = await taskDB.getPaginatedRootTasks(pageNum, limitNum);
      return NextResponse.json(result);
    }

    // Otherwise return all tasks
    const tasks = await taskDB.getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { header, type, status, target, limit, reviewer, parentId } = body;

    // Validation
    if (!header || !header.trim()) {
      return NextResponse.json(
        { error: 'Task name is required' },
        { status: 400 }
      );
    }

    // Check for circular dependency if parent is specified
    if (parentId) {
      const allTasks = await taskDB.getAllTasks();
      // For new tasks, we'll use a temporary high ID
      const tempId = Math.max(...allTasks.map(t => t.id), 0) + 1;
      
      if (wouldCreateCircularDependency(allTasks, tempId, parentId)) {
        return NextResponse.json(
          { error: 'This would create a circular dependency' },
          { status: 400 }
        );
      }

      // Verify parent task exists
      const parentTask = await taskDB.getTaskById(parentId);
      if (!parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 404 }
        );
      }
    }

    const newTask = await taskDB.createTask({
      header: header.trim(),
      type: type || 'Narrative',
      status: status || 'In Process',
      target: target || '0',
      limit: limit || '0',
      reviewer: reviewer || 'Assign reviewer',
      parentId: parentId || undefined,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
