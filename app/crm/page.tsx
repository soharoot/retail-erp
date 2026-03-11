"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Target, Users, DollarSign, TrendingUp, Mail, Phone, Building2, Calendar, X, GripVertical } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  value: number
  source: string
  stage: string
  assignedTo: string
  lastContact: string
  createdAt: string
}

const initialLeads: Lead[] = [
  { id: "L-001", name: "James Wilson", company: "TechCorp Inc", email: "james@techcorp.com", phone: "+1 (555) 100-1001", value: 45000, source: "Website", stage: "new", assignedTo: "Sarah Davis", lastContact: "2025-03-01", createdAt: "2025-02-15" },
  { id: "L-002", name: "Maria Garcia", company: "InnovateCo", email: "maria@innovateco.com", phone: "+1 (555) 100-1002", value: 78000, source: "Referral", stage: "qualified", assignedTo: "John Miller", lastContact: "2025-03-05", createdAt: "2025-01-20" },
  { id: "L-003", name: "Robert Chen", company: "Global Systems", email: "robert@globalsys.com", phone: "+1 (555) 100-1003", value: 120000, source: "LinkedIn", stage: "proposal", assignedTo: "Sarah Davis", lastContact: "2025-03-07", createdAt: "2025-01-10" },
  { id: "L-004", name: "Emily Brown", company: "StartupXYZ", email: "emily@startupxyz.com", phone: "+1 (555) 100-1004", value: 25000, source: "Trade Show", stage: "negotiation", assignedTo: "Mike Johnson", lastContact: "2025-03-08", createdAt: "2025-02-01" },
  { id: "L-005", name: "David Park", company: "MegaRetail", email: "david@megaretail.com", phone: "+1 (555) 100-1005", value: 95000, source: "Website", stage: "won", assignedTo: "John Miller", lastContact: "2025-02-28", createdAt: "2024-12-15" },
  { id: "L-006", name: "Lisa Thompson", company: "FoodChain Ltd", email: "lisa@foodchain.com", phone: "+1 (555) 100-1006", value: 55000, source: "Referral", stage: "qualified", assignedTo: "Sarah Davis", lastContact: "2025-03-04", createdAt: "2025-02-10" },
  { id: "L-007", name: "Kevin Moore", company: "BuildRight Co", email: "kevin@buildright.com", phone: "+1 (555) 100-1007", value: 35000, source: "LinkedIn", stage: "new", assignedTo: "Mike Johnson", lastContact: "2025-03-06", createdAt: "2025-02-25" },
  { id: "L-008", name: "Anna White", company: "HealthFirst", email: "anna@healthfirst.com", phone: "+1 (555) 100-1008", value: 67000, source: "Trade Show", stage: "lost", assignedTo: "John Miller", lastContact: "2025-02-20", createdAt: "2024-11-30" },
  { id: "L-009", name: "Tom Harris", company: "AutoParts Plus", email: "tom@autoparts.com", phone: "+1 (555) 100-1009", value: 42000, source: "Website", stage: "proposal", assignedTo: "Sarah Davis", lastContact: "2025-03-03", createdAt: "2025-01-25" },
  { id: "L-010", name: "Sophie Lee", company: "DigitalEdge", email: "sophie@digitaledge.com", phone: "+1 (555) 100-1010", value: 88000, source: "Referral", stage: "negotiation", assignedTo: "Mike Johnson", lastContact: "2025-03-07", createdAt: "2025-02-05" },
]

const stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
const stageLabels: Record<string, string> = { new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" }
const stageColors: Record<string, string> = {
  new: "bg-purple-50 border-purple-200",
  qualified: "bg-blue-50 border-blue-200",
  proposal: "bg-cyan-50 border-cyan-200",
  negotiation: "bg-amber-50 border-amber-200",
  won: "bg-green-50 border-green-200",
  lost: "bg-red-50 border-red-200",
}

export default function CRMPage() {
  const [leads, setLeads] = useLocalStorage<Lead[]>("erp-leads", initialLeads)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [showDialog, setShowDialog] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({ name: "", company: "", email: "", phone: "", value: "", source: "Website", stage: "new", assignedTo: "" })

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = leads.reduce((sum, l) => sum + l.value, 0)
  const wonValue = leads.filter(l => l.stage === "won").reduce((sum, l) => sum + l.value, 0)
  const activeLeads = leads.filter(l => !["won", "lost"].includes(l.stage)).length
  const conversionRate = leads.length > 0 ? ((leads.filter(l => l.stage === "won").length / leads.length) * 100).toFixed(1) : "0"

  const handleSave = () => {
    if (!formData.name) return
    const newLead: Lead = {
      id: `L-${String(leads.length + 1).padStart(3, "0")}`,
      ...formData,
      value: parseFloat(formData.value) || 0,
      lastContact: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
    }
    setLeads([...leads, newLead])
    setShowDialog(false)
    setFormData({ name: "", company: "", email: "", phone: "", value: "", source: "Website", stage: "new", assignedTo: "" })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="CRM" subtitle="Manage leads and track your sales pipeline" action={{ label: "Add Lead", onClick: () => setShowDialog(true) }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Pipeline" value={formatCurrency(totalValue)} subtitle="All leads" icon={DollarSign} />
        <KpiCard title="Active Leads" value={String(activeLeads)} subtitle="In pipeline" icon={Target} />
        <KpiCard title="Won Deals" value={formatCurrency(wonValue)} subtitle="Closed revenue" icon={TrendingUp} />
        <KpiCard title="Conversion Rate" value={`${conversionRate}%`} subtitle="Won / Total" icon={Users} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-md flex-1">
          <SearchInput placeholder="Search leads by name or company..." value={search} onChange={setSearch} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("kanban")} className={`px-3 py-2 text-sm rounded-lg transition-colors ${view === "kanban" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            Kanban
          </button>
          <button onClick={() => setView("table")} className={`px-3 py-2 text-sm rounded-lg transition-colors ${view === "table" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            Table
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
          {stages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage)
            const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0)
            return (
              <div key={stage} className={`rounded-xl border p-4 min-w-[250px] ${stageColors[stage]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{stageLabels[stage]}</h3>
                  <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium text-gray-600">{stageLeads.length}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{formatCurrency(stageValue)}</p>
                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <button key={lead.id} onClick={() => setSelectedLead(lead)} className="w-full text-left bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" />{lead.company}</p>
                      <p className="text-sm font-semibold text-indigo-600 mt-2">{formatCurrency(lead.value)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{lead.source}</span>
                        <span className="text-xs text-gray-400">{lead.assignedTo.split(" ")[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.company}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(lead.value)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.source}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.stage} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.assignedTo}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(lead.lastContact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedLead.name}</h3>
                  <p className="text-gray-500 flex items-center gap-1"><Building2 className="h-4 w-4" />{selectedLead.company}</p>
                </div>
                <StatusBadge status={selectedLead.stage} />
              </div>
              <div className="text-3xl font-bold text-indigo-600">{formatCurrency(selectedLead.value)}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="h-4 w-4 text-gray-400" />{selectedLead.email}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="h-4 w-4 text-gray-400" />{selectedLead.phone}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Users className="h-4 w-4 text-gray-400" />{selectedLead.assignedTo}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4 text-gray-400" />{formatDate(selectedLead.lastContact)}</div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Activity Timeline</h4>
                <div className="space-y-3">
                  <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-indigo-500" /><div><p className="text-sm text-gray-700">Lead created via {selectedLead.source}</p><p className="text-xs text-gray-400">{formatDate(selectedLead.createdAt)}</p></div></div>
                  <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-green-500" /><div><p className="text-sm text-gray-700">Last contacted</p><p className="text-xs text-gray-400">{formatDate(selectedLead.lastContact)}</p></div></div>
                  <div className="flex gap-3"><div className="w-2 h-2 mt-2 rounded-full bg-blue-500" /><div><p className="text-sm text-gray-700">Moved to {stageLabels[selectedLead.stage]} stage</p><p className="text-xs text-gray-400">Current stage</p></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Deal Value</label><input type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>Website</option><option>Referral</option><option>LinkedIn</option><option>Trade Show</option><option>Cold Call</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage</label><select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="new">New</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="negotiation">Negotiation</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label><input value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Add Lead</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
