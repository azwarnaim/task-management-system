# 🚀 Deployment Guide for Vercel

## ⚠️ Important: SQLite Won't Work on Vercel

Vercel's filesystem is **read-only**, so the current SQLite setup won't work in production. You need to use a cloud database.

## Quick Solution for Vercel Deployment

### Option 1: Vercel Postgres (Recommended) ✅

#### Step 1: Install Vercel Postgres
```bash
cd /Users/azwarnaim/Developer/iv/task-management-system/app
bun add @vercel/postgres
```

#### Step 2: Create a New Database Adapter

Create `lib/db-vercel.ts`:

```typescript
import { sql } from '@vercel/postgres';
import { Task } from './types';

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

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const { rows } = await sql`
      INSERT INTO tasks (header, type, status, target, limit_value, reviewer, parent_id)
      VALUES (${task.header}, ${task.type}, ${task.status}, ${task.target}, ${task.limit}, ${task.reviewer}, ${task.parentId ?? null})
      RETURNING id, header, type, status, target, limit_value as "limit", reviewer, parent_id as "parentId"
    `;
    return rows[0] as Task;
  },
  
  // Add other methods...
};

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
}
```

#### Step 3: Environment-Based Database Selection

Update `lib/db.ts` to detect environment:

```typescript
// Use Vercel Postgres in production, SQLite in development
const isProduction = process.env.VERCEL === '1';

export const taskDB = isProduction 
  ? require('./db-vercel').taskDB 
  : require('./db-sqlite').taskDB;

export const initializeDatabase = isProduction
  ? require('./db-vercel').initializeDatabase
  : require('./db-sqlite').initializeDatabase;
```

#### Step 4: Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel Postgres support"
   git push origin master
   ```

2. **Go to [Vercel Dashboard](https://vercel.com)**

3. **Import Project**:
   - Click "Add New Project"
   - Import your GitHub repository

4. **Add Postgres Database**:
   - In project settings, go to "Storage"
   - Click "Create Database"
   - Select "Postgres"
   - Click "Create"

5. **Environment Variables** (auto-configured):
   - Vercel automatically adds Postgres connection strings

6. **Deploy**:
   - Click "Deploy"

---

### Option 2: Turso (Edge SQLite) 🌍

Turso is SQLite that works on the edge (similar API, cloud-hosted).

#### Step 1: Install Turso
```bash
bun add @libsql/client
```

#### Step 2: Sign up for Turso
```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Sign up
turso auth signup

# Create database
turso db create task-management-system

# Get connection URL
turso db show task-management-system

# Create auth token
turso db tokens create task-management-system
```

#### Step 3: Update Database Code

Create `lib/db-turso.ts`:

```typescript
import { createClient } from '@libsql/client';
import { Task } from './types';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const taskDB = {
  async getAllTasks(): Promise<Task[]> {
    const result = await client.execute(`
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
    `);
    return result.rows as unknown as Task[];
  },
  // Add other methods...
};
```

#### Step 4: Deploy to Vercel

1. Add environment variables in Vercel:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

2. Deploy

---

## Local Development (No Changes Needed)

Your current SQLite setup works perfectly for local development:

```bash
# Install dependencies
bun install

# Run migration
bun run migrate

# Start dev server
bunx --bun next dev
```

---

## Deployment Checklist

- [ ] Choose database: Vercel Postgres or Turso
- [ ] Install dependencies
- [ ] Create environment-aware database adapter
- [ ] Update API routes to use async/await
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Add database in Vercel dashboard
- [ ] Run migration on production database
- [ ] Test deployment

---

## Recommended: Vercel Postgres

**Why?**
- ✅ Fully managed
- ✅ Auto-configured with Vercel
- ✅ Free tier (60 hours/month)
- ✅ Real PostgreSQL
- ✅ No external services needed

**Cost**: Free tier is sufficient for interview assessment

---

## Need Help?

Contact: azwardev@gmail.com
