import Database from 'better-sqlite3';
import path from 'path';
import { Task } from './types';

const dbPath = path.join(process.cwd(), 'database', 'tasks.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      header TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN PROGRESS',
      target TEXT NOT NULL DEFAULT '0',
      limit_value TEXT NOT NULL DEFAULT '0',
      reviewer TEXT NOT NULL DEFAULT 'Assign reviewer',
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_parent_id ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);
  `);
}

// Task CRUD operations
export const taskDB = {
  getAllTasks(): Task[] {
    const stmt = db.prepare(`
      SELECT 
        id,
        header,
        type,
        status,
        target,
        limit_value as "limit",
        reviewer,
        parent_id as parentId
      FROM tasks
      ORDER BY id ASC
    `);
    return stmt.all() as Task[];
  },

  getTaskById(id: number): Task | null {
    const stmt = db.prepare(`
      SELECT 
        id,
        header,
        type,
        status,
        target,
        limit_value as "limit",
        reviewer,
        parent_id as parentId
      FROM tasks
      WHERE id = ?
    `);
    return stmt.get(id) as Task | null;
  },

  getTasksByParentId(parentId: number | null): Task[] {
    if (parentId === null) {
      const stmt = db.prepare(`
        SELECT 
          id,
          header,
          type,
          status,
          target,
          limit_value as "limit",
          reviewer,
          parent_id as parentId
        FROM tasks
        WHERE parent_id IS NULL
        ORDER BY id ASC
      `);
      return stmt.all() as Task[];
    } else {
      const stmt = db.prepare(`
        SELECT 
          id,
          header,
          type,
          status,
          target,
          limit_value as "limit",
          reviewer,
          parent_id as parentId
        FROM tasks
        WHERE parent_id = ?
        ORDER BY id ASC
      `);
      return stmt.all(parentId) as Task[];
    }
  },

  createTask(task: Omit<Task, 'id'>): Task {
    const stmt = db.prepare(`
      INSERT INTO tasks (header, type, status, target, limit_value, reviewer, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      task.header,
      task.type,
      task.status,
      task.target,
      task.limit,
      task.reviewer,
      task.parentId ?? null
    );

    return this.getTaskById(info.lastInsertRowid as number)!;
  },

  updateTask(id: number, task: Partial<Omit<Task, 'id'>>): Task | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (task.header !== undefined) {
      fields.push('header = ?');
      values.push(task.header);
    }
    if (task.type !== undefined) {
      fields.push('type = ?');
      values.push(task.type);
    }
    if (task.status !== undefined) {
      fields.push('status = ?');
      values.push(task.status);
    }
    if (task.target !== undefined) {
      fields.push('target = ?');
      values.push(task.target);
    }
    if (task.limit !== undefined) {
      fields.push('limit_value = ?');
      values.push(task.limit);
    }
    if (task.reviewer !== undefined) {
      fields.push('reviewer = ?');
      values.push(task.reviewer);
    }
    if (task.parentId !== undefined) {
      fields.push('parent_id = ?');
      values.push(task.parentId ?? null);
    }

    if (fields.length === 0) {
      return this.getTaskById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getTaskById(id);
  },

  deleteTask(id: number): boolean {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  hasChildren(id: number): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE parent_id = ?');
    const result = stmt.get(id) as { count: number };
    return result.count > 0;
  },

  bulkInsertTasks(tasks: Array<Omit<Task, 'id'> & { id?: number }>): void {
    const stmt = db.prepare(`
      INSERT INTO tasks (id, header, type, status, target, limit_value, reviewer, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((tasks) => {
      for (const task of tasks) {
        stmt.run(
          task.id ?? null,
          task.header,
          task.type,
          task.status,
          task.target,
          task.limit,
          task.reviewer,
          task.parentId ?? null
        );
      }
    });

    insertMany(tasks);
  },
};
