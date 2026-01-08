"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Task } from "@/lib/types"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  "Done": "bg-green-500/10 text-green-700 border-green-200",
  "In Process": "bg-blue-500/10 text-blue-700 border-blue-200",
  "Pending": "bg-yellow-500/10 text-yellow-700 border-yellow-200",
}

export function createColumns(
  onDelete: (id: number) => void,
  onToggleStatus: (task: Task) => void
): ColumnDef<Task>[] {
  return [
  {
    id: "select",
    header: "Done",
    cell: ({ row }) => {
      const task = row.original
      return (
        <Checkbox
          checked={task.status === 'DONE'}
          onCheckedChange={() => onToggleStatus(task)}
          aria-label="Mark as done"
        />
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="font-medium">#{row.getValue("id")}</div>,
  },
  {
    accessorKey: "header",
    header: "Task Name",
    cell: ({ row }) => <div className="max-w-[300px]">{row.getValue("header")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.getValue("type")}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant="outline"
          className={`${statusColors[status] || "bg-gray-500/10 text-gray-700"}`}
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "parentId",
    header: "Parent",
    cell: ({ row }) => {
      const parentId = row.getValue("parentId") as number | undefined
      return parentId ? (
        <div className="text-muted-foreground">#{parentId}</div>
      ) : (
        <div className="text-muted-foreground/50">-</div>
      )
    },
  },
  {
    accessorKey: "reviewer",
    header: "Reviewer",
    cell: ({ row }) => <div>{row.getValue("reviewer")}</div>,
  },
  {
    accessorKey: "target",
    header: "Target",
    cell: ({ row }) => <div className="text-center">{row.getValue("target")}</div>,
  },
  {
    accessorKey: "limit",
    header: "Limit",
    cell: ({ row }) => <div className="text-center">{row.getValue("limit")}</div>,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const task = row.original
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(task.id)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    },
  },
]
}

interface TaskTableProps {
  tasks: Task[]
  onTaskDeleted?: () => void
  onTaskUpdated?: () => void
}

export function TaskTable({ tasks, onTaskDeleted, onTaskUpdated }: TaskTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to delete task')
        return
      }

      // Refresh the task list
      if (onTaskDeleted) {
        onTaskDeleted()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'DONE' ? 'IN PROGRESS' : 'DONE'
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update task')
      
      toast.success(`Task marked as ${newStatus}`)
      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task status')
    }
  }

  const columns = React.useMemo(() => createColumns(handleDelete, handleToggleStatus), [])

  // Filter tasks by status
  const filteredTasks = React.useMemo(() => {
    if (statusFilter === "ALL") return tasks
    return tasks.filter(task => task.status === statusFilter)
  }, [tasks, statusFilter])

  const table = useReactTable({
    data: filteredTasks,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
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
          placeholder="Filter tasks..."
          value={(table.getColumn("header")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("header")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of{" "}
          {table.getRowModel().rows.length} task(s) displayed.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
