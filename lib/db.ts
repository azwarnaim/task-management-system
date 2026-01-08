import { Task } from './types';

// Simple wrapper that switches between SQLite and Vercel Postgres
const isProduction = typeof process !== 'undefined' && (process.env.VERCEL === '1' || process.env.POSTGRES_URL);

// Create async wrappers for all database operations
export async function initializeDatabase() {
  if (isProduction) {
    const { initializeDatabase: init } = await import('./db-vercel');
    return init();
  } else {
    const { initializeDatabase: init } = await import('./db-sqlite');
    return init();
  }
}

export const taskDB = {
  async getAllTasks(): Promise<Task[]> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.getAllTasks();
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.getAllTasks();
    }
  },

  async getTaskById(id: number): Promise<Task | null> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.getTaskById(id);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.getTaskById(id);
    }
  },

  async getTasksByParentId(parentId: number | null): Promise<Task[]> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.getTasksByParentId(parentId);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.getTasksByParentId(parentId);
    }
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.createTask(task);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.createTask(task);
    }
  },

  async updateTask(id: number, task: Partial<Omit<Task, 'id'>>): Promise<Task | null> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.updateTask(id, task);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.updateTask(id, task);
    }
  },

  async deleteTask(id: number): Promise<boolean> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.deleteTask(id);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.deleteTask(id);
    }
  },

  async hasChildren(id: number): Promise<boolean> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.hasChildren(id);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.hasChildren(id);
    }
  },

  async getPaginatedRootTasks(page: number, limit: number): Promise<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (isProduction) {
      const { taskDB } = await import('./db-vercel');
      return taskDB.getPaginatedRootTasks(page, limit);
    } else {
      const { taskDB } = await import('./db-sqlite');
      return taskDB.getPaginatedRootTasks(page, limit);
    }
  },
};
