"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
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
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface Task {
  id: string
  name: string
  assignee: string
  priority: string
  status: string
  dueDate: string
}

interface Project {
  id: string
  name: string
  description: string
  client: string
  manager: string
  startDate: string
  endDate: string
  budget: number
  spent: number
  progress: number
  status: string
  tasks: Task[]
}

const initialProjects: Project[] = [
  {
    id: "1",
    name: "E-Commerce Platform Redesign",
    description: "Complete overhaul of the online store frontend and checkout flow with modern UI/UX patterns",
    client: "TechRetail Inc.",
    manager: "James Wilson",
    startDate: "2025-01-15",
    endDate: "2025-06-30",
    budget: 85000,
    spent: 52000,
    progress: 65,
    status: "active",
    tasks: [
      { id: "t1", name: "Wireframe design", assignee: "Emily Zhang", priority: "high", status: "completed", dueDate: "2025-02-15" },
      { id: "t2", name: "Frontend development", assignee: "Michael Johnson", priority: "high", status: "in-progress", dueDate: "2025-04-30" },
      { id: "t3", name: "Payment integration", assignee: "Emily Zhang", priority: "medium", status: "pending", dueDate: "2025-05-15" },
      { id: "t4", name: "User testing", assignee: "Laura Chen", priority: "medium", status: "pending", dueDate: "2025-06-01" },
      { id: "t5", name: "Launch & deployment", assignee: "James Wilson", priority: "high", status: "pending", dueDate: "2025-06-30" },
    ],
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Native iOS and Android app for customer self-service portal with push notifications",
    client: "FinanceHub Ltd.",
    manager: "Emily Zhang",
    startDate: "2025-02-01",
    endDate: "2025-08-31",
    budget: 120000,
    spent: 35000,
    progress: 30,
    status: "active",
    tasks: [
      { id: "t6", name: "Requirements gathering", assignee: "Emily Zhang", priority: "high", status: "completed", dueDate: "2025-02-28" },
      { id: "t7", name: "UI/UX design", assignee: "Laura Chen", priority: "high", status: "in-progress", dueDate: "2025-04-15" },
      { id: "t8", name: "Backend API development", assignee: "Michael Johnson", priority: "medium", status: "pending", dueDate: "2025-06-30" },
      { id: "t9", name: "App store submission", assignee: "Emily Zhang", priority: "low", status: "pending", dueDate: "2025-08-15" },
    ],
  },
  {
    id: "3",
    name: "Data Analytics Dashboard",
    description: "Real-time business intelligence dashboard with interactive charts and automated reporting",
    client: "DataCorp Systems",
    manager: "Robert Taylor",
    startDate: "2024-09-01",
    endDate: "2025-03-15",
    budget: 65000,
    spent: 63000,
    progress: 95,
    status: "active",
    tasks: [
      { id: "t10", name: "Data pipeline setup", assignee: "James Wilson", priority: "high", status: "completed", dueDate: "2024-10-30" },
      { id: "t11", name: "Dashboard UI", assignee: "Michael Johnson", priority: "high", status: "completed", dueDate: "2025-01-15" },
      { id: "t12", name: "Report generation", assignee: "Robert Taylor", priority: "medium", status: "completed", dueDate: "2025-02-28" },
      { id: "t13", name: "Final QA & handoff", assignee: "Laura Chen", priority: "high", status: "in-progress", dueDate: "2025-03-15" },
    ],
  },
  {
    id: "4",
    name: "CRM System Integration",
    description: "Integration of Salesforce CRM with internal ERP and marketing automation tools",
    client: "GlobalTrade Co.",
    manager: "Sarah Mitchell",
    startDate: "2024-06-01",
    endDate: "2024-12-31",
    budget: 95000,
    spent: 92000,
    progress: 100,
    status: "completed",
    tasks: [
      { id: "t14", name: "API mapping", assignee: "Emily Zhang", priority: "high", status: "completed", dueDate: "2024-07-15" },
      { id: "t15", name: "Data migration", assignee: "James Wilson", priority: "high", status: "completed", dueDate: "2024-09-30" },
      { id: "t16", name: "Testing & validation", assignee: "Laura Chen", priority: "medium", status: "completed", dueDate: "2024-11-30" },
      { id: "t17", name: "Go-live support", assignee: "Sarah Mitchell", priority: "high", status: "completed", dueDate: "2024-12-31" },
    ],
  },
  {
    id: "5",
    name: "Cloud Infrastructure Migration",
    description: "Migrate on-premise servers to AWS cloud infrastructure with zero downtime strategy",
    client: "SecureNet Inc.",
    manager: "Kevin Brown",
    startDate: "2025-03-01",
    endDate: "2025-09-30",
    budget: 150000,
    spent: 12000,
    progress: 10,
    status: "active",
    tasks: [
      { id: "t18", name: "Infrastructure audit", assignee: "Kevin Brown", priority: "high", status: "in-progress", dueDate: "2025-04-01" },
      { id: "t19", name: "Migration plan", assignee: "James Wilson", priority: "high", status: "pending", dueDate: "2025-05-15" },
      { id: "t20", name: "Staging environment", assignee: "Michael Johnson", priority: "medium", status: "pending", dueDate: "2025-07-01" },
    ],
  },
  {
    id: "6",
    name: "Brand Identity Refresh",
    description: "Complete rebrand including logo, website, marketing collateral and brand guidelines",
    client: "FreshStart LLC",
    manager: "Laura Chen",
    startDate: "2025-01-10",
    endDate: "2025-04-30",
    budget: 45000,
    spent: 15000,
    progress: 40,
    status: "on-hold",
    tasks: [
      { id: "t21", name: "Brand research", assignee: "Laura Chen", priority: "high", status: "completed", dueDate: "2025-02-01" },
      { id: "t22", name: "Logo concepts", assignee: "Laura Chen", priority: "high", status: "completed", dueDate: "2025-02-20" },
      { id: "t23", name: "Website mockups", assignee: "Emily Zhang", priority: "medium", status: "pending", dueDate: "2025-03-15" },
      { id: "t24", name: "Collateral design", assignee: "Laura Chen", priority: "low", status: "pending", dueDate: "2025-04-15" },
      { id: "t25", name: "Brand guidelines doc", assignee: "Laura Chen", priority: "medium", status: "pending", dueDate: "2025-04-30" },
    ],
  },
]

const projectTabs = ["All Projects", "Active", "Completed", "On Hold"] as const

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
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
  name: "",
  assignee: "",
  priority: "medium",
  dueDate: "",
}

export default function ProjectsPage() {
  const { t } = useI18n()
  const [projects, setProjects] = useLocalStorage<Project[]>("erp-projects", initialProjects)
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
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0)

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (activeTab === "All Projects") return true
    if (activeTab === "Active") return p.status === "active"
    if (activeTab === "Completed") return p.status === "completed"
    if (activeTab === "On Hold") return p.status === "on-hold"
    return true
  })

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

  const handleCreateProject = () => {
    if (!form.name || !form.client || !form.manager) return
    const newProject: Project = {
      id: Date.now().toString(),
      name: form.name,
      description: form.description,
      client: form.client,
      manager: form.manager,
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      endDate: form.endDate,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      progress: 0,
      status: "active",
      tasks: [],
    }
    setProjects([...projects, newProject])
    setShowCreateDialog(false)
    setForm(emptyProjectForm)
  }

  const handleAddTask = () => {
    if (!selectedProject || !taskForm.name || !taskForm.assignee) return
    const newTask: Task = {
      id: `t${Date.now()}`,
      name: taskForm.name,
      assignee: taskForm.assignee,
      priority: taskForm.priority,
      status: "pending",
      dueDate: taskForm.dueDate || new Date().toISOString().split("T")[0],
    }
    const updatedProject = {
      ...selectedProject,
      tasks: [...selectedProject.tasks, newTask],
    }
    setProjects(projects.map((p) => (p.id === selectedProject.id ? updatedProject : p)))
    setSelectedProject(updatedProject)
    setTaskForm(emptyTaskForm)
    setShowTaskForm(false)
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
      {selectedProject ? (
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
                  <h2 className="text-lg font-semibold text-gray-900">{selectedProject.name}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(selectedProject.status)}`}>
                    {selectedProject.status.replace("-", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedProject.description}</p>
              </div>
            </div>
          </div>

          {/* Project Info Grid */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Client</p>
                <p className="text-sm font-medium text-gray-900">{selectedProject.client}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Manager</p>
                <p className="text-sm font-medium text-gray-900">{selectedProject.manager}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Timeline</p>
                <p className="text-sm text-gray-900">{formatDate(selectedProject.startDate)} - {formatDate(selectedProject.endDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Budget</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedProject.spent)} / {formatCurrency(selectedProject.budget)}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Progress</span>
                <span className="text-xs font-medium text-gray-700">{selectedProject.progress}%</span>
              </div>
              <div className={`w-full h-2 rounded-full ${getProgressBgColor(selectedProject.progress)}`}>
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(selectedProject.progress)}`}
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Tasks ({selectedProject.tasks.length})</h3>
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
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    placeholder="Task name"
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedProject.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{task.assignee}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityColors[task.priority] || "bg-gray-100 text-gray-700"}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(task.status)}`}>
                          {task.status.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(task.dueDate)}</td>
                    </tr>
                  ))}
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
                    <span className="text-xs font-medium text-gray-700">{project.progress}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${getProgressBgColor(project.progress)}`}>
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(project.progress)}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-gray-500">Budget</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
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
                    <span>{formatDate(project.startDate)}</span>
                  </div>
                </div>

                {/* Task Count */}
                <div className="mt-2 text-xs text-gray-400">
                  {project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""} &middot; {project.tasks.filter((t) => t.status === "completed").length} completed
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-gray-500">No projects found in this category.</p>
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
