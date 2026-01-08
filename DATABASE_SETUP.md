# Task Management System

A task management system built with Next.js, TypeScript, and SQLite.

## Features

- ✅ Create tasks with hierarchical parent-child relationships
- ✅ Circular dependency prevention
- ✅ SQLite database for persistent storage
- ✅ RESTful API with Next.js API routes
- ✅ Modern UI with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15
- **Runtime**: Bun
- **Database**: SQLite (via Bun's built-in SQLite)
- **UI**: React, TailwindCSS, shadcn/ui
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or higher

### Installation

```bash
# Install dependencies
bun install

# Run database migration (imports initial data)
bun run migrate

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database

### Local Development

The app uses SQLite for local development. The database file is stored in `database/tasks.db` and is gitignored.

### Reset Database

```bash
bun run db:reset
```

### Migration

To import tasks from `data.json`:

```bash
bun run migrate
```

## Deployment

### Option 1: Railway/Render (Recommended for SQLite)

1. Connect your GitHub repository
2. Set build command: `bun install && bun run build`
3. Set start command: `bun run start`
4. Deploy

SQLite works perfectly on Railway/Render as they have persistent filesystems.

### Option 2: Vercel (Requires Database Change)

⚠️ **Vercel has a read-only filesystem**, so SQLite won't work in production.

For Vercel deployment, you need to switch to one of these:

1. **Vercel Postgres** (recommended)
   ```bash
   # Install Vercel Postgres SDK
   bun add @vercel/postgres
   ```

2. **Turso** (SQLite in the cloud)
   ```bash
   # Install Turso SDK
   bun add @libsql/client
   ```

Then update `lib/db.ts` to use the cloud database.

## API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/[id]` - Get task by ID
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Example Request

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "header": "New Task",
    "type": "Narrative",
    "status": "In Process",
    "reviewer": "John Doe",
    "parentId": null
  }'
```

## Project Structure

```
app/
├── api/
│   └── tasks/
│       ├── route.ts          # GET /api/tasks, POST /api/tasks
│       └── [id]/
│           └── route.ts      # GET, PUT, DELETE /api/tasks/[id]
├── create-task/
│   └── page.tsx              # Task creation form
├── dashboard/
│   ├── page.tsx              # Dashboard view
│   └── data.json             # Initial task data
├── components/               # UI components
├── lib/
│   ├── db.ts                 # Database operations
│   ├── types.ts              # TypeScript types
│   └── task-utils.ts         # Task utility functions
└── scripts/
    └── migrate.ts            # Database migration script
```

## Features Implemented

### 1. Task Creation Form
- Required task name field with validation
- Optional parent task selection
- Automatic circular dependency detection
- Success/error toast notifications

### 2. Circular Dependency Prevention
The system prevents circular references in the task hierarchy:

```typescript
// Example: Prevents this scenario
Task A → parent: Task B
Task B → parent: Task C
Task C → parent: Task A ❌ (Would create circular dependency)
```

### 3. Database Operations
- CRUD operations for tasks
- Foreign key relationships
- Bulk insert for migrations
- Transaction support

## Environment Variables

No environment variables are required for local development with SQLite.

For production with cloud databases, add:

```env
# Vercel Postgres
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# OR Turso
TURSO_DATABASE_URL="..."
TURSO_AUTH_TOKEN="..."
```

## Development

```bash
# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Lint code
bun run lint
```

## License

MIT
