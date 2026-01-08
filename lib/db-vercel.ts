import { sql } from '@vercel/postgres';
import { Task } from './types';

export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      header TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'In Process',
      target TEXT NOT NULL DEFAULT '0',
      limit_value TEXT NOT NULL DEFAULT '0',
      reviewer TEXT NOT NULL DEFAULT 'Assign reviewer',
      parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_parent_id ON tasks(parent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_status ON tasks(status)`;
}

export const taskDB = {
  async getAllTasks(): Promise<Task[]> {
    const { rows } = await sql`
      SELECT 
        id,
        header,
        type,
        status,
        target,
        limit_value as "limit",
        reviewer,
        parent_id as "parentId"
      FROM tasks
      ORDER BY id ASC
    `;
    return rows as Task[];
  },

  async getTaskById(id: number): Promise<Task | null> {
    const { rows } = await sql`
      SELECT 
        id,
        header,
        type,
        status,
        target,
        limit_value as "limit",
        reviewer,
        parent_id as "parentId"
      FROM tasks
      WHERE id = ${id}
    `;
    return rows[0] as Task || null;
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const { rows } = await sql`
      INSERT INTO tasks (header, type, status, target, limit_value, reviewer, parent_id)
      VALUES (${task.header}, ${task.type}, ${task.status}, ${task.target}, ${task.limit}, ${task.reviewer}, ${task.parentId ?? null})
      RETURNING id, header, type, status, target, limit_value as "limit", reviewer, parent_id as "parentId"
    `;
    return rows[0] as Task;
  },

  async updateTask(id: number, task: Partial<Omit<Task, 'id'>>): Promise<Task | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (task.header !== undefined) {
      updates.push('header = $' + (values.length + 1));
      values.push(task.header);
    }
    if (task.type !== undefined) {
      updates.push('type = $' + (values.length + 1));
      values.push(task.type);
    }
    if (task.status !== undefined) {
      updates.push('status = $' + (values.length + 1));
      values.push(task.status);
    }
    if (task.target !== undefined) {
      updates.push('target = $' + (values.length + 1));
      values.push(task.target);
    }
    if (task.limit !== undefined) {
      updates.push('limit_value = $' + (values.length + 1));
      values.push(task.limit);
    }
    if (task.reviewer !== undefined) {
      updates.push('reviewer = $' + (values.length + 1));
      values.push(task.reviewer);
    }
    if (task.parentId !== undefined) {
      updates.push('parent_id = $' + (values.length + 1));
      values.push(task.parentId ?? null);
    }

    if (updates.length === 0) {
      return this.getTaskById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING id, header, type, status, target, limit_value as "limit", reviewer, parent_id as "parentId"
    `;
    
    const { rows } = await sql.query(query, [...values, id]);
    return rows[0] as Task || null;
  },

  async deleteTask(id: number): Promise<boolean> {
    const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id}`;
    return rowCount > 0;
  },

  async hasChildren(id: number): Promise<boolean> {
    const { rows } = await sql`SELECT COUNT(*) as count FROM tasks WHERE parent_id = ${id}`;
    return rows[0].count > 0;
  },

  async getTasksByParentId(parentId: number | null): Promise<Task[]> {
    if (parentId === null) {
      const { rows } = await sql`
        SELECT 
          id,
          header,
          type,
          status,
          target,
          limit_value as "limit",
          reviewer,
          parent_id as "parentId"
        FROM tasks
        WHERE parent_id IS NULL
        ORDER BY id ASC
      `;
      return rows as Task[];
    } else {
      const { rows } = await sql`
        SELECT 
          id,
          header,
          type,
          status,
          target,
          limit_value as "limit",
          reviewer,
          parent_id as "parentId"
        FROM tasks
        WHERE parent_id = ${parentId}
        ORDER BY id ASC
      `;
      return rows as Task[];
    }
  },
};
