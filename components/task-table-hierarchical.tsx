"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Task } from "@/lib/types"
import { 
  getTaskChildren, 
  getDependencyCounts, 
  propagateStatusChange 
} from "@/lib/task-utils"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Edit2, Save, X, Trash2 } from "lucide-react"

interface TaskRowProps {
  task: Task
  allTasks: Task[]
  level: number
  onToggleStatus: (task: Task) => void
  onUpdateTask: (taskId: number, updates: Partial<Task>) => void
  onDeleteTask: (taskId: number) => void
  expandedTasks: Set<number>
  toggleExpand: (taskId: number) => void
}

function TaskRow({
  task,
  allTasks,
  level,
  onToggleStatus,
  onUpdateTask,
  onDeleteTask,
  expandedTasks,
  toggleExpand,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedName, setEditedName] = React.useState(task.header)
  const [editedParent, setEditedParent] = React.useState<string>(
    task.parentId?.toString() || "none"
  )

  const children = getTaskChildren(allTasks, task.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedTasks.has(task.id)
  const dependencyCounts = hasChildren ? getDependencyCounts(allTasks, task.id) : null

  const handleSave = () => {
    const updates: Partial<Task> = {
      header: editedName,
      parentId: editedParent === "none" ? undefined : parseInt(editedParent),
    }
    onUpdateTask(task.id, updates)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(task.header)
    setEditedParent(task.parentId?.toString() || "none")
    setIsEditing(false)
  }

  // Get available parent options (exclude self, descendants, and COMPLETE tasks)
  const getAvailableParents = () => {
    const getDescendants = (taskId: number): number[] => {
      const children = getTaskChildren(allTasks, taskId)
      return children.flatMap(child => [child.id, ...getDescendants(child.id)])
    }
    
    const excludedIds = new Set([task.id, ...getDescendants(task.id)])
    return allTasks.filter(t => !excludedIds.has(t.id) && t.status !== 'COMPLETE')
  }

  const statusColors: Record<string, string> = {
    "DONE": "bg-green-500/10 text-green-700 border-green-200",
    "IN PROGRESS": "bg-blue-500/10 text-blue-700 border-blue-200",
    "COMPLETE": "bg-purple-500/10 text-purple-700 border-purple-200",
  }

  return (
    <>
      <div
        className={`flex items-center gap-2 p-3 border-b hover:bg-accent/50 transition-colors`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        <div className="w-6 flex-shrink-0">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpand(task.id)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Status Checkbox */}
        <Checkbox
          checked={task.status === 'DONE' || task.status === 'COMPLETE'}
          onCheckedChange={() => onToggleStatus(task)}
          disabled={task.status === 'COMPLETE'}
          className="flex-shrink-0"
        />

        {/* Task ID */}
        <div className="w-12 text-sm font-mono text-muted-foreground flex-shrink-0">
          #{task.id}
        </div>

        {/* Task Name (Editable) */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-8"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`font-medium truncate ${
                  task.status === 'COMPLETE' ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.header}
              </span>
              {dependencyCounts && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  ({dependencyCounts.total} deps: {dependencyCounts.complete} complete, {dependencyCounts.done} done)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Parent Selector (when editing) */}
        {isEditing && (
          <Select value={editedParent} onValueChange={setEditedParent}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select parent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Parent</SelectItem>
              {getAvailableParents().map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  #{t.id} - {t.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Badge */}
        {!isEditing && (
          <Badge
            variant="outline"
            className={`${statusColors[task.status] || "bg-gray-500/10 text-gray-700"} flex-shrink-0`}
          >
            {task.status}
          </Badge>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 w-8 p-0 text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTask(task.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Render Children */}
      {isExpanded &&
        children.map((child) => (
          <TaskRow
            key={child.id}
            task={child}
            allTasks={allTasks}
            level={level + 1}
            onToggleStatus={onToggleStatus}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            expandedTasks={expandedTasks}
            toggleExpand={toggleExpand}
          />
        ))}
    </>
  )
}

interface TaskTableHierarchicalProps {
  tasks: Task[]
  onTasksChanged: () => void
}

export function TaskTableHierarchical({ tasks, onTasksChanged }: TaskTableHierarchicalProps) {
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedTasks, setExpandedTasks] = React.useState<Set<number>>(new Set())
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Get root tasks (tasks with no parent)
  const rootTasks = React.useMemo(() => {
    let filtered = tasks.filter(task => !task.parentId)
    
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(task => task.status === statusFilter)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.header.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }, [tasks, statusFilter, searchQuery])

  const toggleExpand = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    const allParentIds = tasks
      .filter(task => getTaskChildren(tasks, task.id).length > 0)
      .map(task => task.id)
    setExpandedTasks(new Set(allParentIds))
  }

  const collapseAll = () => {
    setExpandedTasks(new Set())
  }

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'DONE' || task.status === 'COMPLETE' ? 'IN PROGRESS' : 'DONE'
    
    setIsUpdating(true)
    try {
      // Calculate status propagation
      const updates = propagateStatusChange(tasks, task.id, newStatus)
      
      // Apply all updates
      for (const update of updates) {
        const taskToUpdate = tasks.find(t => t.id === update.id)
        if (!taskToUpdate) continue

        const response = await fetch(`/api/tasks/${update.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskToUpdate, status: update.status })
        })

        if (!response.ok) throw new Error('Failed to update task')
      }
      
      toast.success(
        updates.length > 1 
          ? `Updated ${updates.length} tasks with status propagation`
          : `Task marked as ${newStatus}`
      )
      onTasksChanged()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    setIsUpdating(true)
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) throw new Error('Task not found')

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, ...updates })
      })

      if (!response.ok) throw new Error('Failed to update task')

      // If parent changed, need to check status propagation on both old and new parent chains
      if (updates.parentId !== undefined && updates.parentId !== task.parentId) {
        const statusUpdatesToApply = new Map<number, string>()
        
        // Create updated tasks array with the new parent relationship
        const updatedTasks = tasks.map(t => 
          t.id === taskId ? { ...t, ...updates } : t
        )

        // Check old parent chain (if exists) - parent may need status downgrade
        if (task.parentId) {
          const oldParentUpdates = propagateStatusChange(updatedTasks, task.parentId, tasks.find(t => t.id === task.parentId)?.status || 'IN PROGRESS')
          oldParentUpdates.forEach(u => statusUpdatesToApply.set(u.id, u.status))
        }

        // Check new parent chain (if exists) - new parent may need status upgrade
        if (updates.parentId) {
          const newParentUpdates = propagateStatusChange(updatedTasks, updates.parentId, tasks.find(t => t.id === updates.parentId)?.status || 'IN PROGRESS')
          newParentUpdates.forEach(u => statusUpdatesToApply.set(u.id, u.status))
        }

        // Apply all status updates
        for (const [id, status] of statusUpdatesToApply) {
          if (id === taskId) continue // Already updated
          
          const taskToUpdate = tasks.find(t => t.id === id)
          if (!taskToUpdate) continue

          await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...taskToUpdate, status })
          })
        }
      }

      toast.success('Task updated successfully')
      onTasksChanged()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete task')
      }

      toast.success('Task deleted successfully')
      onTasksChanged()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="IN PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Hierarchical Task List */}
      <div className="rounded-md border">
        <div className="bg-muted/50 p-3 border-b font-medium flex gap-2 text-sm">
          <div className="w-6"></div>
          <div className="w-6">✓</div>
          <div className="w-12">ID</div>
          <div className="flex-1">Task Name</div>
          <div className="w-24">Status</div>
          <div className="w-24">Actions</div>
        </div>

        {rootTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No tasks found. Create your first task!
          </div>
        ) : (
          rootTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              allTasks={tasks}
              level={0}
              onToggleStatus={handleToggleStatus}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
            />
          ))
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {rootTasks.length} root task(s) of {tasks.length} total
      </div>
    </div>
  )
}
