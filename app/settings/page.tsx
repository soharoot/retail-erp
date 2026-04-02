"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { PageHeader } from "@/components/layout/page-header"
import { Building2, Globe, CreditCard, Bell, Palette, Database, Save } from "lucide-react"
import { useTheme } from "@/lib/theme/theme-provider"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company")
  const [saved, setSaved] = useState(false)
  const [settings, updateSettings, settingsLoading] = useSettings()
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()
  const { preferences, setPreferences } = useTheme()

  const handleSave = async () => {
    await updateSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (user?.id && orgId) {
      logAction({
        action: "settings.saved",
        module: "settings",
        description: `Paramètres mis à jour (onglet: ${activeTab})`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { tab: activeTab },
      })
    }
  }

  const setField = (updates: Record<string, unknown>) => {
    updateSettings(updates)
  }

  const tabs = [
    { id: "company", label: "Informations entreprise", icon: Building2 },
    { id: "regional", label: "Régional", icon: Globe },
    { id: "billing", label: "Facturation & TVA", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Apparence", icon: Palette },
    { id: "system", label: "Système", icon: Database },
  ]

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  if (settingsLoading) {
    return (
      <PageGuard permission={PERMISSIONS.SETTINGS_VIEW}>
        <div className="py-16 text-center text-gray-400">{t("common.loading")}</div>
      </PageGuard>
    )
  }

  return (
    <PageGuard permission={PERMISSIONS.SETTINGS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Nav */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-[#e6f0ed] text-[#00483c] border-r-2 border-[#00483c]" : "text-gray-600 hover:bg-gray-50"}`}>
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
                  <h3 className="text-lg font-semibold text-gray-900">Informations de l&apos;entreprise</h3>
                  <p className="text-sm text-gray-500">Gérez les détails de votre entreprise</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className={labelClass}>Nom de l&apos;entreprise</label><input value={settings.companyName} onChange={e => setField({ companyName: e.target.value })} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Adresse</label><textarea value={settings.address} onChange={e => setField({ address: e.target.value })} rows={2} className={inputClass} /></div>
                  <div><label className={labelClass}>Téléphone</label><input value={settings.phone} onChange={e => setField({ phone: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label><input value={settings.email} onChange={e => setField({ email: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Site web</label><input value={settings.website} onChange={e => setField({ website: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>NIF / NIS</label><input value={settings.taxId} onChange={e => setField({ taxId: e.target.value })} className={inputClass} /></div>
                </div>
              </div>
            )}

            {activeTab === "regional" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Paramètres régionaux</h3>
                  <p className="text-sm text-gray-500">Configuration fixée pour l&apos;Algérie</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Devise</label>
                    <div className={`${inputClass} bg-gray-50 text-gray-700`}>DZD — Dinar algérien (DA)</div>
                  </div>
                  <div>
                    <label className={labelClass}>Format de date</label>
                    <select value={settings.dateFormat} onChange={e => setField({ dateFormat: e.target.value })} className={inputClass}>
                      <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                      <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Fuseau horaire</label>
                    <div className={`${inputClass} bg-gray-50 text-gray-700`}>Africa/Algiers (CET)</div>
                  </div>
                  <div>
                    <label className={labelClass}>Langue</label>
                    <div className={`${inputClass} bg-gray-50 text-gray-700`}>Français</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Facturation & TVA</h3>
                  <p className="text-sm text-gray-500">Configurez les taux de TVA et les préférences de facturation</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Taux de TVA par défaut (%)</label><input type="number" value={settings.taxRate} onChange={e => setField({ taxRate: parseFloat(e.target.value) || 0 })} className={inputClass} /></div>
                  <div><label className={labelClass}>Préfixe facture</label><input value={settings.invoicePrefix} onChange={e => setField({ invoicePrefix: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Préfixe bon de commande</label><input value={settings.poPrefix} onChange={e => setField({ poPrefix: e.target.value })} className={inputClass} /></div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Modes de paiement acceptés</h4>
                  <div className="flex flex-wrap gap-3">
                    {["Espèces", "Carte de crédit", "Virement bancaire", "Chèque"].map(m => (
                      <label key={m} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" defaultChecked className="rounded text-[#00483c] focus:ring-[#00483c]" /><span className="text-sm text-gray-700">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Préférences de notification</h3>
                  <p className="text-sm text-gray-500">Choisissez les notifications que vous souhaitez recevoir</p>
                </div>
                <div className="space-y-4">
                  {[
                    { key: "emailNotifications", label: "Notifications par email", desc: "Recevez les mises à jour importantes par email" },
                    { key: "lowStockAlerts", label: "Alertes de stock bas", desc: "Soyez notifié quand les produits sont en rupture" },
                    { key: "orderNotifications", label: "Notifications de commandes", desc: "Recevez des alertes pour les nouvelles commandes" },
                    { key: "reportEmails", label: "Rapports hebdomadaires", desc: "Recevez un résumé hebdomadaire par email" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div><p className="text-sm font-medium text-gray-900">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                      <button onClick={() => setField({ [item.key]: !settings[item.key as keyof typeof settings] })} className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? "bg-[#00483c]" : "bg-gray-200"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key as keyof typeof settings] ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Apparence</h3>
                  <p className="text-sm text-gray-500">Personnalisez l&apos;interface de votre espace de travail</p>
                </div>

                {/* Theme */}
                <div>
                  <label className={labelClass}>Thème</label>
                  <p className="text-xs text-gray-500 mb-3">Contrôle l&apos;apparence claire / sombre de l&apos;interface</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "light"  as const, label: "Clair",  previewClass: "bg-white" },
                      { value: "dark"   as const, label: "Sombre",   previewClass: "bg-gray-900" },
                      { value: "system" as const, label: "Système", previewClass: "bg-gradient-to-br from-white to-gray-900" },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPreferences({ ...preferences, theme: opt.value })}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                          preferences.theme === opt.value
                            ? "border-[#00483c] bg-[#e6f0ed]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-full h-10 rounded-lg border border-gray-200 ${opt.previewClass}`} />
                        <span className="text-xs font-medium text-gray-700">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interface Density */}
                <div>
                  <label className={labelClass}>Densité de l&apos;interface</label>
                  <p className="text-xs text-gray-500 mb-3">Ajustez l&apos;espacement du contenu principal</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "default"      as const, label: "Par défaut",  desc: "Espacement équilibré" },
                      { value: "compact"      as const, label: "Compact",     desc: "Espacement réduit" },
                      { value: "comfortable"  as const, label: "Confortable", desc: "Plus d'espace" },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPreferences({ ...preferences, interfaceStyle: opt.value })}
                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-colors ${
                          preferences.interfaceStyle === opt.value
                            ? "border-[#00483c] bg-[#e6f0ed]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                        <span className="text-xs text-gray-400">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dashboard Layout */}
                <div>
                  <label className={labelClass}>Disposition du tableau de bord</label>
                  <p className="text-xs text-gray-500 mb-3">Comment les cartes KPI sont affichées</p>
                  <div className="flex gap-3">
                    {([
                      { value: "grid" as const, label: "Grille", icon: "\u229e" },
                      { value: "list" as const, label: "Liste", icon: "\u2630" },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPreferences({ ...preferences, dashboardLayout: opt.value })}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-colors ${
                          preferences.dashboardLayout === opt.value
                            ? "border-[#00483c] bg-[#e6f0ed] text-[#00483c]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-base leading-none">{opt.icon}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400 italic">Les modifications sont enregistrées automatiquement par utilisateur.</p>
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Paramètres système</h3>
                  <p className="text-sm text-gray-500">Configuration système avancée</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div><p className="text-sm font-medium text-gray-900">Sauvegarde automatique</p><p className="text-xs text-gray-500">Sauvegarde quotidienne de toutes les données</p></div>
                    <button onClick={() => setField({ autoBackup: !settings.autoBackup })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoBackup ? "bg-[#00483c]" : "bg-gray-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoBackup ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Authentification à deux facteurs</p>
                      <p className="text-xs text-gray-500">Nécessite la configuration de Supabase Auth</p>
                    </div>
                    <button onClick={() => setField({ twoFactor: !settings.twoFactor })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.twoFactor ? "bg-[#00483c]" : "bg-gray-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.twoFactor ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Informations système</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Version :</span><span className="ml-2 font-medium text-gray-900">v3.0.0</span></div>
                    <div><span className="text-gray-500">Dernière sauvegarde :</span><span className="ml-2 font-medium text-gray-900">Non configuré</span></div>
                    <div><span className="text-gray-500">Base de données :</span><span className="ml-2 font-medium text-gray-900">Supabase PostgreSQL</span></div>
                    <div><span className="text-gray-500">Stockage :</span><span className="ml-2 font-medium text-gray-900">Tables normalisées avec RLS</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              {saved && <span className="text-sm text-green-600 font-medium">Paramètres enregistrés avec succès !</span>}
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33] transition-colors">
                <Save className="h-4 w-4" />{t("settings.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageGuard>
  )
}
