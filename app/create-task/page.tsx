"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { toast } from "sonner"
import { Task } from "@/lib/types"
import { getInvalidParentIds } from "@/lib/task-utils"

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskName, setTaskName] = useState("")
  const [parentTaskId, setParentTaskId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<{ taskName?: string; parentTask?: string }>({})

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: { taskName?: string; parentTask?: string } = {}
    
    if (!taskName.trim()) {
      newErrors.taskName = "Task name is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          header: taskName,
          type: "Narrative",
          status: "In Process",
          target: "0",
          limit: "0",
          reviewer: "Assign reviewer",
          parentId: parentTaskId && parentTaskId !== "none" ? parseInt(parentTaskId) : null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ parentTask: data.error || 'Failed to create task' })
        toast.error(data.error || 'Failed to create task')
        return
      }

      toast.success("Task created successfully!", {
        description: `Task "${taskName}" has been added to the system.`
      })

      // Reset form
      setTaskName("")
      setParentTaskId("")
      setErrors({})
      
      // Refresh tasks list
      await fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const invalidParentIds = getInvalidParentIds(tasks, null)
  const availableParentTasks = tasks.filter(task => !invalidParentIds.includes(task.id))

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Create Task</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>Create New Task</CardTitle>
                  <CardDescription>
                    Add a new task to the system. You can optionally assign it to a parent task.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="taskName">
                        Task Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="taskName"
                        placeholder="Enter task name"
                        value={taskName}
                        onChange={(e) => {
                          setTaskName(e.target.value)
                          if (errors.taskName) {
                            setErrors({ ...errors, taskName: undefined })
                          }
                        }}
                        className={errors.taskName ? "border-red-500" : ""}
                      />
                      {errors.taskName && (
                        <p className="text-sm text-red-500">{errors.taskName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parentTask">Parent Task (Optional)</Label>
                      <Select
                        value={parentTaskId}
                        onValueChange={(value) => {
                          setParentTaskId(value === "none" ? "" : value)
                          if (errors.parentTask) {
                            setErrors({ ...errors, parentTask: undefined })
                          }
                        }}
                      >
                        <SelectTrigger id="parentTask" className={errors.parentTask ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select a parent task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {availableParentTasks.map((task) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              #{task.id} - {task.header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.parentTask && (
                        <p className="text-sm text-red-500">{errors.parentTask}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Circular dependencies are automatically prevented
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Task"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setTaskName("")
                          setParentTaskId("")
                          setErrors({})
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* {tasks.length > 0 && (
                <Card className="max-w-2xl">
                  <CardHeader>
                    <CardTitle>Recent Tasks</CardTitle>
                    <CardDescription>
                      Last 5 tasks in the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasks.slice(-5).reverse().map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">#{task.id} - {task.header}</p>
                            {task.parentId && (
                              <p className="text-sm text-muted-foreground">
                                Parent: #{task.parentId}
                              </p>
                            )}
                          </div>
                          <span className="text-sm px-2 py-1 bg-secondary rounded">
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )} */}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
