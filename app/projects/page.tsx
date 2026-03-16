"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useTableData, insertChildRows } from "@/hooks/use-table-data"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { createClient } from "@/lib/supabase/client"
import { toSnakeCase } from "@/lib/types"
import type { Project, Task } from "@/lib/types"
import {
  FolderKanban,
  PlayCircle,
  CheckCircle2,
  DollarSign,
  X,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

const projectTabs = ["All Projects", "Active", "Completed", "On Hold"] as const

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
}

const taskStatusLabels: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
}

const emptyProjectForm = {
  name: "",
  description: "",
  client: "",
  manager: "",
  startDate: "",
  endDate: "",
  budget: "",
}

const emptyTaskForm = {
  title: "",
  assignee: "",
  priority: "medium",
  dueDate: "",
}

export default function ProjectsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  // ── Data from normalized DB tables (projects with nested tasks) ──
  const { data: projects, loading, insert, update, remove, refresh } = useTableData<Project>("projects", {
    select: "*, tasks(*)",
  })

  const [activeTab, setActiveTab] = useState<string>("All Projects")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [form, setForm] = useState(emptyProjectForm)
  const [taskForm, setTaskForm] = useState(emptyTaskForm)
  const [showTaskForm, setShowTaskForm] = useState(false)

  // KPI calculations
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0)

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (activeTab === "All Projects") return true
    if (activeTab === "Active") return p.status === "active"
    if (activeTab === "Completed") return p.status === "completed"
    if (activeTab === "On Hold") return p.status === "on-hold"
    return true
  })

  // Keep selectedProject in sync with data
  const currentProject = selectedProject
    ? projects.find((p) => p.id === selectedProject.id) || selectedProject
    : null

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-red-500"
    if (progress <= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getProgressBgColor = (progress: number) => {
    if (progress < 30) return "bg-red-100"
    if (progress <= 70) return "bg-yellow-100"
    return "bg-green-100"
  }

  // Calculate progress from task statuses
  const calcProgress = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0
    const done = tasks.filter((t) => t.status === "done").length
    return Math.round((done / tasks.length) * 100)
  }

  const handleCreateProject = async () => {
    if (!form.name || !form.client || !form.manager) return
    await insert({
      name: form.name,
      description: form.description,
      client: form.client,
      manager: form.manager,
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      endDate: form.endDate || null,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      progress: 0,
      status: "active" as Project["status"],
    })
    if (user?.id && orgId) {
      logAction({
        action: "project.created",
        module: "projects",
        description: `Created project: ${form.name}`,
        metadata: { name: form.name, client: form.client },
        userId: user.id,
        orgId,
      })
    }
    setShowCreateDialog(false)
    setForm(emptyProjectForm)
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? All tasks will also be deleted.`)) return
    await remove(project.id)
    if (selectedProject?.id === project.id) setSelectedProject(null)
    if (user?.id && orgId) {
      logAction({
        action: "project.deleted",
        module: "projects",
        description: `Deleted project: ${project.name}`,
        metadata: { projectId: project.id, name: project.name },
        userId: user.id,
        orgId,
      })
    }
  }

  const handleAddTask = async () => {
    if (!currentProject || !taskForm.title || !taskForm.assignee) return
    await insertChildRows("tasks", [{
      projectId: currentProject.id,
      title: taskForm.title,
      assignee: taskForm.assignee,
      priority: taskForm.priority,
      status: "todo",
      dueDate: taskForm.dueDate || null,
    }])

    // Refresh projects to get updated tasks
    await refresh()

    if (user?.id && orgId) {
      logAction({
        action: "task.created",
        module: "projects",
        description: `Added task "${taskForm.title}" to project "${currentProject.name}"`,
        metadata: { projectId: currentProject.id, taskTitle: taskForm.title },
        userId: user.id,
        orgId,
      })
    }
    setTaskForm(emptyTaskForm)
    setShowTaskForm(false)
  }

  const handleTaskStatusChange = async (task: Task, newStatus: Task["status"]) => {
    if (!currentProject) return
    const supabase = createClient()
    await supabase.from("tasks").update(toSnakeCase({ status: newStatus } as Record<string, unknown>)).eq("id", task.id)

    // Recalculate progress
    const updatedTasks = (currentProject.tasks || []).map((t) =>
      t.id === task.id ? { ...t, status: newStatus } : t
    )
    const newProgress = calcProgress(updatedTasks)
    await update(currentProject.id, { progress: newProgress })

    // Refresh to get latest data
    await refresh()
  }

  const handleDeleteTask = async (task: Task) => {
    if (!currentProject) return
    const supabase = createClient()
    await supabase.from("tasks").delete().eq("id", task.id)

    // Recalculate progress
    const remainingTasks = (currentProject.tasks || []).filter((t) => t.id !== task.id)
    const newProgress = calcProgress(remainingTasks)
    await update(currentProject.id, { progress: newProgress })

    await refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <PageGuard permission={PERMISSIONS.PROJECTS_VIEW}>
    <div className="space-y-6">
      <PageHeader
        title={t("projects.title")}
        subtitle={t("projects.subtitle")}
        action={{ label: t("projects.addProject"), onClick: () => { setForm(emptyProjectForm); setShowCreateDialog(true) } }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t("projects.totalProjects")} value={totalProjects.toString()} icon={FolderKanban} subtitle="All projects" />
        <KpiCard title={t("projects.activeProjects")} value={activeProjects.toString()} icon={PlayCircle} subtitle="Currently running" />
        <KpiCard title={t("projects.completed")} value={completedProjects.toString()} icon={CheckCircle2} subtitle="Successfully delivered" />
        <KpiCard title={t("projects.totalBudget")} value={formatCurrency(totalBudget)} icon={DollarSign} subtitle="Across all projects" />
      </div>

      {/* Project Detail Panel */}
      {currentProject ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{currentProject.name}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(currentProject.status)}`}>
                    {currentProject.status.replace("-", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{currentProject.description}</p>
              </div>
              <button
                onClick={() => handleDeleteProject(currentProject)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete project"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Project Info Grid */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Client</p>
                <p className="text-sm font-medium text-gray-900">{currentProject.client}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Manager</p>
                <p className="text-sm font-medium text-gray-900">{currentProject.manager}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Timeline</p>
                <p className="text-sm text-gray-900">
                  {currentProject.startDate ? formatDate(currentProject.startDate) : "—"} - {currentProject.endDate ? formatDate(currentProject.endDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Budget</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(currentProject.spent ?? 0)} / {formatCurrency(currentProject.budget ?? 0)}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Progress</span>
                <span className="text-xs font-medium text-gray-700">{currentProject.progress ?? 0}%</span>
              </div>
              <div className={`w-full h-2 rounded-full ${getProgressBgColor(currentProject.progress ?? 0)}`}>
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(currentProject.progress ?? 0)}`}
                  style={{ width: `${currentProject.progress ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Tasks ({(currentProject.tasks || []).length})</h3>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </button>
            </div>

            {/* Add Task Mini Form */}
            {showTaskForm && (
              <div className="mb-4 p-4 rounded-lg border border-indigo-200 bg-indigo-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    placeholder="Task title"
                  />
                  <input
                    type="text"
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    placeholder="Assignee"
                  />
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <button
                      onClick={handleAddTask}
                      className="h-9 px-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(currentProject.tasks || []).map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{task.assignee}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityColors[task.priority] || "bg-gray-100 text-gray-700"}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task, e.target.value as Task["status"])}
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(currentProject.tasks || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No tasks yet. Click &quot;Add Task&quot; to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tab Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {projectTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{project.client}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ml-2 flex-shrink-0 ${getStatusColor(project.status)}`}>
                    {project.status.replace("-", " ")}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-gray-700">{project.progress ?? 0}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${getProgressBgColor(project.progress ?? 0)}`}>
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(project.progress ?? 0)}`}
                      style={{ width: `${project.progress ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-gray-500">Budget</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(project.spent ?? 0)} / {formatCurrency(project.budget ?? 0)}
                  </span>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="h-3.5 w-3.5" />
                    <span>{project.manager}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{project.startDate ? formatDate(project.startDate) : "—"}</span>
                  </div>
                </div>

                {/* Task Count */}
                <div className="mt-2 text-xs text-gray-400">
                  {(project.tasks || []).length} task{(project.tasks || []).length !== 1 ? "s" : ""} &middot; {(project.tasks || []).filter((t) => t.status === "done").length} completed
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-gray-500">
                  {projects.length === 0 ? "No projects yet. Click \"Add Project\" to get started." : "No projects found in this category."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* New Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">New Project</h3>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe the project..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input
                    type="text"
                    value={form.client}
                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <input
                    type="text"
                    value={form.manager}
                    onChange={(e) => setForm({ ...form, manager: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Project manager"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
