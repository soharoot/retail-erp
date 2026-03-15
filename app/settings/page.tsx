"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { useI18n } from "@/lib/i18n/context"
import { PageHeader } from "@/components/layout/page-header"
import { Building2, Globe, CreditCard, Bell, Palette, Database, Save } from "lucide-react"
import type { Settings } from "@/lib/types"
import { defaultSettings } from "@/lib/types"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company")
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useSupabaseData<Settings>("erp-settings", defaultSettings)
  const { setLanguage } = useI18n()

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: "company", label: "Company Info", icon: Building2 },
    { id: "regional", label: "Regional", icon: Globe },
    { id: "billing", label: "Billing & Tax", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "system", label: "System", icon: Database },
  ]

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <PageGuard permission={PERMISSIONS.SETTINGS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Settings" subtitle="Configure your ERP system preferences" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Nav */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600" : "text-gray-600 hover:bg-gray-50"}`}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {activeTab === "company" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                  <p className="text-sm text-gray-500">Manage your business details</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className={labelClass}>Company Name</label><input value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Address</label><textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} rows={2} className={inputClass} /></div>
                  <div><label className={labelClass}>Phone</label><input value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label><input value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Website</label><input value={settings.website} onChange={e => setSettings({...settings, website: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Tax ID / EIN</label><input value={settings.taxId} onChange={e => setSettings({...settings, taxId: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
            )}

            {activeTab === "regional" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Regional Settings</h3>
                  <p className="text-sm text-gray-500">Configure locale and formatting preferences</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Currency</label><select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className={inputClass}><option value="DZD">DZD - Algerian Dinar (DA)</option><option value="USD">USD - US Dollar</option><option value="EUR">EUR - Euro</option><option value="GBP">GBP - British Pound</option><option value="CAD">CAD - Canadian Dollar</option><option value="AUD">AUD - Australian Dollar</option></select></div>
                  <div><label className={labelClass}>Date Format</label><select value={settings.dateFormat} onChange={e => setSettings({...settings, dateFormat: e.target.value})} className={inputClass}><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></div>
                  <div><label className={labelClass}>Timezone</label><select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})} className={inputClass}><option value="America/New_York">Eastern Time (ET)</option><option value="America/Chicago">Central Time (CT)</option><option value="America/Denver">Mountain Time (MT)</option><option value="America/Los_Angeles">Pacific Time (PT)</option><option value="Europe/London">GMT</option><option value="Europe/Paris">CET</option></select></div>
                  <div>
                    <label className={labelClass}>Language</label>
                    <select
                      value={settings.language}
                      onChange={e => {
                        const lang = e.target.value
                        setSettings({...settings, language: lang})
                        setLanguage(lang as "en" | "fr" | "ar")
                      }}
                      className={inputClass}
                    >
                      <option value="en">English</option>
                      <option value="fr">French — Français</option>
                      <option value="ar">Arabic — العربية</option>
                      <option value="es">Spanish — Español</option>
                      <option value="de">German — Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Billing & Tax Configuration</h3>
                  <p className="text-sm text-gray-500">Configure tax rates and billing preferences</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Default Tax Rate (%)</label><input type="number" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Invoice Prefix</label><input value={settings.invoicePrefix} onChange={e => setSettings({...settings, invoicePrefix: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>PO Prefix</label><input value={settings.poPrefix} onChange={e => setSettings({...settings, poPrefix: e.target.value})} className={inputClass} /></div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Methods Accepted</h4>
                  <div className="flex flex-wrap gap-3">
                    {["Cash", "Credit Card", "Bank Transfer", "Check", "PayPal"].map(m => (
                      <label key={m} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" /><span className="text-sm text-gray-700">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                  <p className="text-sm text-gray-500">Choose what notifications you want to receive</p>
                </div>
                <div className="space-y-4">
                  {[
                    { key: "emailNotifications", label: "Email Notifications", desc: "Receive important updates via email" },
                    { key: "lowStockAlerts", label: "Low Stock Alerts", desc: "Get notified when products are running low" },
                    { key: "orderNotifications", label: "Order Notifications", desc: "Receive alerts for new orders and status changes" },
                    { key: "reportEmails", label: "Weekly Report Emails", desc: "Receive weekly business summary reports" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div><p className="text-sm font-medium text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                      <button onClick={() => setSettings({...settings, [item.key]: !settings[item.key as keyof typeof settings]})} className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? "bg-indigo-600" : "bg-gray-200"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key as keyof typeof settings] ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
                  <p className="text-sm text-gray-500">Customize the look and feel</p>
                </div>
                <div>
                  <label className={labelClass}>Theme</label>
                  <div className="flex gap-3 mt-2">
                    {[
                      { name: "Light", color: "bg-white border-2 border-indigo-500" },
                      { name: "Dark", color: "bg-gray-900" },
                      { name: "System", color: "bg-gradient-to-r from-white to-gray-900" },
                    ].map(theme => (
                      <button key={theme.name} className="flex flex-col items-center gap-2">
                        <div className={`w-16 h-12 rounded-lg border border-gray-200 ${theme.color}`} />
                        <span className="text-xs font-medium text-gray-600">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Primary Color</label>
                  <div className="flex gap-3 mt-2">
                    {[
                      { name: "Indigo", color: "bg-indigo-600", selected: true },
                      { name: "Blue", color: "bg-blue-600" },
                      { name: "Green", color: "bg-green-600" },
                      { name: "Purple", color: "bg-purple-600" },
                      { name: "Red", color: "bg-red-600" },
                    ].map(c => (
                      <button key={c.name} className={`w-8 h-8 rounded-full ${c.color} ${c.selected ? "ring-2 ring-offset-2 ring-indigo-600" : ""}`} title={c.name} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Sidebar Style</label>
                  <div className="flex gap-3 mt-2">
                    <button className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white">Default</button>
                    <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Compact</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
                  <p className="text-sm text-gray-500">Advanced system configuration</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div><p className="text-sm font-medium text-gray-900">Automatic Backup</p><p className="text-xs text-gray-500">Daily backup of all system data</p></div>
                    <button onClick={() => setSettings({...settings, autoBackup: !settings.autoBackup})} className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoBackup ? "bg-indigo-600" : "bg-gray-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoBackup ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div><p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p><p className="text-xs text-gray-500">Require 2FA for all admin accounts</p></div>
                    <button onClick={() => setSettings({...settings, twoFactor: !settings.twoFactor})} className={`relative w-11 h-6 rounded-full transition-colors ${settings.twoFactor ? "bg-indigo-600" : "bg-gray-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.twoFactor ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">System Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Version:</span><span className="ml-2 font-medium text-gray-900">v1.0.0</span></div>
                    <div><span className="text-gray-500">Last Backup:</span><span className="ml-2 font-medium text-gray-900">Mar 9, 2025</span></div>
                    <div><span className="text-gray-500">Database:</span><span className="ml-2 font-medium text-gray-900">Local Storage</span></div>
                    <div><span className="text-gray-500">Uptime:</span><span className="ml-2 font-medium text-gray-900">99.9%</span></div>
                  </div>
                </div>
                <div className="border-t pt-4 flex gap-3">
                  <button className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Export All Data</button>
                  <button className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Clear Cache</button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              {saved && <span className="text-sm text-green-600 font-medium">Settings saved successfully!</span>}
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                <Save className="h-4 w-4" />Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageGuard>
  )
}
