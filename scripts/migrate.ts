#!/usr/bin/env node
/**
 * Migration script to import tasks from data.json into SQLite database
 * Run: bun run scripts/migrate.ts
 */

import { initializeDatabase, taskDB } from '../lib/db';
import tasksData from '../app/dashboard/data.json';
import { Task } from '../lib/types';

async function migrate() {
  console.log('🔄 Starting migration...');
  
  try {
    // Initialize database
    console.log('📊 Initializing database schema...');
    initializeDatabase();
    
    // Check if data already exists
    const existingTasks = taskDB.getAllTasks();
    if (existingTasks.length > 0) {
      console.log(`⚠️  Database already contains ${existingTasks.length} tasks.`);
      console.log('Do you want to continue? This will keep existing data.');
      // For now, we'll skip if data exists
      console.log('Migration skipped. Delete database/tasks.db to start fresh.');
      return;
    }
    
    // Transform data to match our schema
    const tasksToInsert = tasksData.map(task => ({
      id: task.id,
      header: task.header,
      type: task.type,
      status: task.status,
      target: task.target,
      limit: task.limit,
      reviewer: task.reviewer,
      // parentId will be undefined/null for now (can be added later)
      parentId: undefined as number | undefined,
    }));
    
    // Insert tasks in bulk
    console.log(`📝 Inserting ${tasksToInsert.length} tasks...`);
    taskDB.bulkInsertTasks(tasksToInsert);
    
    // Verify
    const insertedTasks = taskDB.getAllTasks();
    console.log(`✅ Successfully migrated ${insertedTasks.length} tasks!`);
    
    // Show some stats
    const statusCounts = insertedTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Task Statistics:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
