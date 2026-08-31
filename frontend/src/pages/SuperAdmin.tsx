import React, { useEffect, useState } from "react";
import { API_URL } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Power, ShieldAlert, Settings2, DownloadCloud, UploadCloud, MessageSquareWarning, PieChart, Building2, LogOut, Pencil, TrendingUp, ShoppingBag, CreditCard, MessageSquare, Settings, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { apiSuperAdminUploadUpdate, apiSuperAdminAnalytics, apiSuperAdminImpersonate, apiSuperAdminUpdateTier, apiSuperAdminSendAnnouncement, apiSuperAdminGetAuditLogs } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";
import { BranchRequestsTab } from "@/components/superadmin/BranchRequestsTab";
import { Network, ChevronDown, ChevronRight, CornerDownRight, Search, Filter } from "lucide-react";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem("super_token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "businesses" | "ota" | "announcements" | "plans" | "enquiries" | "settings" | "branch-requests" | "audit-logs">("analytics");

  // Plans State
  const [tiers, setTiers] = useState<any[]>([]);
  const [fetchingTiers, setFetchingTiers] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);

  // Saas state
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [unreadEnquiriesCount, setUnreadEnquiriesCount] = useState(0);
  const [saasSettings, setSaasSettings] = useState({ contact_email: "", contact_phone: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [superAdminProfile, setSuperAdminProfile] = useState({ email: "", password: "", oldPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [fetchingAnalytics, setFetchingAnalytics] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [fetchingAuditLogs, setFetchingAuditLogs] = useState(false);
  const [auditBusinessFilter, setAuditBusinessFilter] = useState("");

  // Announcement State
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annType, setAnnType] = useState("info");
  const [sendingAnn, setSendingAnn] = useState(false);

  // OTA state
  const [otaFile, setOtaFile] = useState<File | null>(null);
  const [otaVersion, setOtaVersion] = useState("");
  const [otaNotes, setOtaNotes] = useState("");
  const [otaUploading, setOtaUploading] = useState(false);

  // New business state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filter state for businesses
  const [searchQuery, setSearchQuery] = useState("");
  const [enquirySearchQuery, setEnquirySearchQuery] = useState("");
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState("all");
  const [enquirySortOrder, setEnquirySortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [hierarchyFilter, setHierarchyFilter] = useState("all");

  const [featuresModal, setFeaturesModal] = useState<{ isOpen: boolean, business: any }>({ isOpen: false, business: null });
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [editingFeatures, setEditingFeatures] = useState<any>({});

  const [editModal, setEditModal] = useState<{ isOpen: boolean, business: any }>({ isOpen: false, business: null });
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [tenantAnalyticsModal, setTenantAnalyticsModal] = useState<{ isOpen: boolean, business: any }>({ isOpen: false, business: null });
  const [tenantAnalyticsData, setTenantAnalyticsData] = useState<any>(null);
  const [tenantAnalyticsLoading, setTenantAnalyticsLoading] = useState(false);

  const openTenantAnalytics = async (business: any) => {
    setTenantAnalyticsModal({ isOpen: true, business });
    setTenantAnalyticsLoading(true);
    setTenantAnalyticsData(null);
    try {
      const res = await fetch(`${API_URL}/super/businesses/${business.id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTenantAnalyticsData(data);
    } catch (err: any) {
      toast({ title: "Failed to load analytics", description: err.message, variant: "destructive" });
    } finally {
      setTenantAnalyticsLoading(false);
    }
  };

  const ALL_FEATURES = [
    { key: 'manual_table_orders', label: 'Manual Table Orders', desc: 'Allow staff to create orders assigned to tables manually.' },
    { key: 'qr_digital_ordering', label: 'QR Digital Ordering', desc: 'Enable customers to scan QR codes and order directly from their phone.' },
    { key: 'pos_system', label: 'POS System', desc: 'Enable the counter POS interface for direct orders.' },
    { key: 'advanced_analytics', label: 'Advanced Analytics', desc: 'Unlock detailed sales and performance charts.' },
    { key: 'website_cms', label: 'Website CMS', desc: 'Allow the tenant to manage their landing page, gallery, and promotions.' },
    { key: 'coupon_engine', label: 'Coupon Engine', desc: 'Enable the creation and redemption of discount coupons.' },
    { key: 'customer_reviews', label: 'Customer Reviews', desc: 'Allow customers to submit reviews and feedback.' },
    { key: 'chatbot', label: 'AI Chatbot', desc: 'Enable the AI assistant floating widget on the customer-facing pages.' },
    { key: 'multi_branch', label: 'Multi-Branch Support', desc: 'Allow this tenant to request and manage sub-branches.' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/super/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("super_token", data.token);
      setToken(data.token);
      toast({ title: "Logged in successfully" });
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    if (!token) return;
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/super/businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("super_token");
        setToken(null);
        return;
      }
      const data = await res.json();
      setBusinesses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!token) return;
    setFetchingAnalytics(true);
    try {
      const data = await apiSuperAdminAnalytics();
      setAnalyticsData(data);
    } catch (err: any) {
      toast({ title: "Failed to load analytics", description: err.message, variant: "destructive" });
    } finally {
      setFetchingAnalytics(false);
    }
  };

  const fetchTiers = async () => {
    if (!token) return;
    setFetchingTiers(true);
    try {
      const res = await fetch(`${API_URL}/super/tiers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTiers(data);
    } catch (err: any) {
      toast({ title: "Failed to load tiers", description: err.message, variant: "destructive" });
    } finally {
      setFetchingTiers(false);
    }
  };

  const handleUpdatePlanTier = async (name: string, monthly_order_limit: number, monthly_price: number, included_features: string[]) => {
    setSavingTier(name);
    try {
      const res = await fetch(`${API_URL}/super/tiers/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monthly_order_limit, monthly_price, included_features })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Tier updated successfully" });
      fetchTiers();
    } catch (err: any) {
      toast({ title: "Failed to update tier", description: err.message, variant: "destructive" });
    } finally {
      setSavingTier(null);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBusinesses();
      fetchAnalytics();
      fetchTiers();
      fetchEnquiries();
      fetchUnreadEnquiriesCount();
      fetchSaasSettings();
      fetchSuperAdminProfile();
    }
  }, [token]);

  const fetchAuditLogs = async () => {
    if (!token) return;
    setFetchingAuditLogs(true);
    try {
      const data = await apiSuperAdminGetAuditLogs(auditPage, 50, auditBusinessFilter);
      setAuditLogs(data.logs);
      setAuditTotal(data.total);
    } catch (err: any) {
      toast({ title: "Failed to load audit logs", description: err.message, variant: "destructive" });
    } finally {
      setFetchingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [token, activeTab, auditPage, auditBusinessFilter]);

  const fetchEnquiries = async () => {
    try {
      const res = await fetch(`${API_URL}/super/enquiries`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEnquiries(data);
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    }
  };

  const fetchUnreadEnquiriesCount = async () => {
    try {
      const res = await fetch(`${API_URL}/super/enquiries/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUnreadEnquiriesCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread enquiries count:", err);
    }
  };

  const fetchSaasSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/super/settings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data) setSaasSettings(data);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchSuperAdminProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/super/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data && data.email) {
        setSuperAdminProfile({ email: data.email, password: "", oldPassword: "" });
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const updateEnquiryStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_URL}/super/enquiries/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchEnquiries();
    } catch (err) {
      console.error("Failed to update status:", err);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const deleteEnquiry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await fetch(`${API_URL}/super/enquiries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEnquiries();
      toast({ title: "Enquiry deleted successfully" });
    } catch (err) {
      console.error("Failed to delete enquiry:", err);
      toast({ title: "Failed to delete enquiry", variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await fetch(`${API_URL}/super/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(saasSettings)
      });
      toast({ title: "Settings saved successfully!" });
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/super/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(superAdminProfile)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Profile updated successfully!" });
      setSuperAdminProfile(prev => ({ ...prev, password: "", oldPassword: "" }));
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImpersonate = async (businessId: string) => {
    try {
      const data = await apiSuperAdminImpersonate(businessId);

      // Store current tokens as backup
      localStorage.setItem("backup_super_token", localStorage.getItem("super_token") || "");
      localStorage.setItem("backup_tenant_slug", localStorage.getItem("tenant_slug") || "");

      // Overwrite primary auth token and tenant slug
      localStorage.setItem("auth_token", data.token);
      if (data.slug) {
        localStorage.setItem("tenant_slug", data.slug);
      }

      toast({ title: "Impersonation Started", description: "Redirecting to tenant dashboard..." });

      // Redirect
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Impersonation Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    if (!confirm(`Are you sure you want to ${newStatus} this tenant?`)) return;

    try {
      const res = await fetch(`${API_URL}/super/businesses/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Business marked as ${newStatus}` });
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateTier = async (id: string, newTier: string) => {
    if (!confirm(`Are you sure you want to change the tier to ${newTier.toUpperCase()}? This will automatically override the tenant's feature flags.`)) return;
    try {
      await apiSuperAdminUpdateTier(id, newTier);
      toast({ title: "Tier Updated", description: "The business tier and features have been updated." });
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: "Failed to update tier", description: err.message, variant: "destructive" });
    }
  };

  const openFeaturesModal = (business: any) => {
    setEditingFeatures(business.features || {});
    setFeaturesModal({ isOpen: true, business });
  };

  const handleSaveFeatures = async () => {
    if (!featuresModal.business || !token) return;
    setSavingFeatures(true);
    try {
      const res = await fetch(`${API_URL}/super/businesses/${featuresModal.business.id}/features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ features: editingFeatures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save features");

      setBusinesses(businesses.map(b => b.id === featuresModal.business.id ? { ...b, features: data.features } : b));
      toast({ title: "Features saved successfully" });
      setFeaturesModal({ isOpen: false, business: null });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/super/businesses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, slug: newSlug, phone: newPhone, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Business Created Successfully!" });
      setShowAdd(false);
      setNewName("");
      setNewSlug("");
      setNewPhone("");
      setNewPassword("");
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (business: any) => {
    setEditName(business.name);
    setEditSlug(business.slug);
    setEditPhone(business.owner_phone);
    setEditPassword("");
    setEditModal({ isOpen: true, business });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.business || !token) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/super/businesses/${editModal.business.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, slug: editSlug, phone: editPhone, password: editPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Business Updated Successfully!" });
      setEditModal({ isOpen: false, business: null });
      fetchBusinesses();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUploadOta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otaFile || !otaVersion) return;
    try {
      setOtaUploading(true);
      await apiSuperAdminUploadUpdate(otaFile, otaVersion, otaNotes);
      toast({ title: "Global OTA Update Published", description: "The update has been broadcasted to all tablets!" });
      setOtaFile(null);
      setOtaVersion("");
      setOtaNotes("");
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setOtaUploading(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to broadcast this announcement to ALL active tenants globally?")) return;
    setSendingAnn(true);
    try {
      await apiSuperAdminSendAnnouncement(annTitle, annMessage, annType);
      toast({ title: "Broadcast Sent", description: "The global announcement has been pushed to all active devices." });
      setAnnTitle("");
      setAnnMessage("");
    } catch (err: any) {
      toast({ title: "Broadcast Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingAnn(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-white/20 dark:border-zinc-800/50 relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-center bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Super Admin</h1>
            <p className="text-sm text-slate-500 font-medium mt-2 tracking-wide uppercase">God View Authentication</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Master Email / Username</label>
              <Input
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Master Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-md font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate Identity"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex font-sans text-slate-900 dark:text-slate-100">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-r border-slate-200 dark:border-zinc-800 flex flex-col fixed h-screen z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-black bg-gradient-to-br from-indigo-600 to-violet-500 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
            <ShieldAlert className="text-indigo-600 w-7 h-7" /> God View
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-2 ml-10">Global Admin</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "analytics" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <PieChart className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Analytics
          </button>

          <button
            onClick={() => setActiveTab("audit-logs")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "audit-logs" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <ShieldAlert className={`w-5 h-5 ${activeTab === 'audit-logs' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Security Logs
          </button>

          <button
            onClick={() => setActiveTab("businesses")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "businesses" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <Building2 className={`w-5 h-5 ${activeTab === 'businesses' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Businesses
          </button>
          
          <button
            onClick={() => setActiveTab("branch-requests")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "branch-requests" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <Network className={`w-5 h-5 ${activeTab === 'branch-requests' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Branch Requests
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "plans" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <CreditCard className={`w-5 h-5 ${activeTab === 'plans' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Plans & Pricing
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "announcements" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <MessageSquareWarning className={`w-5 h-5 ${activeTab === 'announcements' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Announcements
          </button>

          <button
            onClick={() => setActiveTab("ota")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "ota" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <DownloadCloud className={`w-5 h-5 ${activeTab === 'ota' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> OTA Updates
          </button>
          
          <button
            onClick={async () => {
              setActiveTab("enquiries");
              if (unreadEnquiriesCount > 0) {
                setUnreadEnquiriesCount(0);
                try {
                  await fetch(`${API_URL}/super/enquiries/mark-read`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` }
                  });
                } catch (err) {
                  console.error("Failed to mark enquiries as read", err);
                }
              }
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "enquiries" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-5 h-5 ${activeTab === 'enquiries' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Enquiries
            </div>
            {unreadEnquiriesCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {unreadEnquiriesCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === "settings" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none scale-[1.02]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-slate-200"}`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Platform Settings
          </button>
        </nav>

        <div className="p-6 border-t border-slate-200 dark:border-zinc-800/50">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            onClick={() => {
              localStorage.removeItem("super_token");
              setToken(null);
            }}
          >
            <LogOut className="w-5 h-5" /> Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-72 p-10 lg:p-12 h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="w-full max-w-[1600px] mx-auto space-y-8">

          <div className="flex justify-between items-end mb-10 border-b border-slate-200 dark:border-zinc-800 pb-6">
            <div>
              <h2 className="text-4xl font-black capitalize bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                {activeTab}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {activeTab === 'analytics' && "Platform-wide performance and metrics"}
                {activeTab === 'businesses' && "Manage and provision tenant instances"}
                {activeTab === 'branch-requests' && "Review and approve franchise branch requests"}
                {activeTab === 'plans' && "Configure limits and features for subscription tiers"}
                {activeTab === 'announcements' && "Broadcast instant alerts globally"}
                {activeTab === 'ota' && "Push live updates to all tablets"}
                {activeTab === 'enquiries' && "View and manage inbound leads"}
                {activeTab === 'settings' && "Configure global platform settings"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {activeTab === "businesses" && (
                <Button
                  onClick={() => setShowAdd(!showAdd)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none h-11 px-6 font-bold"
                >
                  <Plus className="w-5 h-5 mr-2" /> Provision Restaurant
                </Button>
              )}
            </div>
          </div>

          {activeTab === "analytics" && (
            <div className="space-y-8 mt-4">
              {fetchingAnalytics || !analyticsData ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-3xl shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 transform group-hover:scale-110 transition-transform"></div>
                      <p className="text-sm font-medium text-indigo-100 flex items-center gap-2"><PieChart className="w-4 h-4 opacity-70" /> Platform GMV</p>
                      <h3 className="text-4xl font-black mt-3">₹{(analyticsData.metrics.totalGmv || 0).toLocaleString()}</h3>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-5 rounded-full -mr-10 -mt-10 transform group-hover:scale-110 transition-transform"></div>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> Active Tenants</p>
                      <h3 className="text-4xl font-black mt-3 text-slate-800 dark:text-white">
                        {analyticsData.metrics.activeTenants} <span className="text-lg text-slate-400 font-semibold">/ {analyticsData.metrics.totalTenants}</span>
                      </h3>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 opacity-5 rounded-full -mr-10 -mt-10 transform group-hover:scale-110 transition-transform"></div>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><Plus className="w-4 h-4 text-violet-500" /> Total Orders</p>
                      <h3 className="text-4xl font-black mt-3 text-slate-800 dark:text-white">{(analyticsData.metrics.totalOrders || 0).toLocaleString()}</h3>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full -mr-10 -mt-10 transform group-hover:scale-110 transition-transform"></div>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-emerald-500" /> MRR (Est)</p>
                      <h3 className="text-4xl font-black mt-3 text-slate-800 dark:text-white">₹{(analyticsData.metrics.activeTenants * 999).toLocaleString()}</h3>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 mt-6">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">Platform Growth <span className="text-sm font-medium bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-slate-500 ml-2">30 Days</span></h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={10} />
                          <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                          />
                          <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorRev)" name="GMV (₹)" />
                          <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} fill="url(#colorOrd)" name="Orders" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "audit-logs" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 mt-4">
              <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800">
                <div className="relative w-96">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Filter by Tenant ID (UUID)..." 
                    value={auditBusinessFilter}
                    onChange={(e) => setAuditBusinessFilter(e.target.value)}
                    className="pl-9 h-11 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                  />
                </div>
                <div className="text-sm font-medium text-slate-500">
                  Total Logs: {auditTotal}
                </div>
              </div>

              {fetchingAuditLogs ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-500 font-bold uppercase tracking-wider text-xs">
                        <tr>
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Tenant</th>
                          <th className="p-4">Actor</th>
                          <th className="p-4">Action</th>
                          <th className="p-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="p-4">
                              {log.business_name ? (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.business_name}</span>
                              ) : (
                                <span className="text-slate-400 italic">Global System</span>
                              )}
                            </td>
                            <td className="p-4">
                              {log.staff_name ? (
                                <span>{log.staff_name} <span className="text-xs text-slate-400">({log.staff_role})</span></span>
                              ) : log.details?.admin_actor ? (
                                <span className="text-violet-600 dark:text-violet-400 font-medium">Admin: {log.details.admin_actor.email || 'Owner'}</span>
                              ) : (
                                <span className="text-slate-400 italic">Unknown/System</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                log.action.includes('DELETE') || log.action.includes('REMOVE') ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                                log.action.includes('UPDATE') || log.action.includes('TOGGLE') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
                                'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 max-w-xs truncate text-slate-500">
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                        {auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">No security logs found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
                    <Button 
                      variant="outline" 
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="border-slate-200 dark:border-zinc-800"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-500">Page {auditPage}</span>
                    <Button 
                      variant="outline" 
                      onClick={() => setAuditPage(p => p + 1)}
                      disabled={auditLogs.length < 50}
                      className="border-slate-200 dark:border-zinc-800"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "businesses" ? (
            <>
              {showAdd && (
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm mb-8 border border-slate-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4">
                  <h2 className="text-xl font-bold mb-6">Onboard New Restaurant</h2>
                  <form onSubmit={handleCreateBusiness} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Restaurant Name</label>
                      <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. The Golden Dragon" className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-11" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Subdomain Slug</label>
                      <Input required value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. goldendragon" pattern="[a-z0-9-]+" className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-11" />
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">Lowercase letters, numbers, hyphens only.</p>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Owner Phone Number (Login ID)</label>
                      <Input required value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="10 digit number" pattern="[0-9]{10}" className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-11" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Initial Password</label>
                      <Input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-11" />
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-md font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Provision Restaurant"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search restaurants, slugs, or owners..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All Tiers</option>
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    <select
                      value={hierarchyFilter}
                      onChange={(e) => setHierarchyFilter(e.target.value)}
                      className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All Types</option>
                      <option value="franchise">Franchise (Has Branches)</option>
                      <option value="independent">Independent</option>
                    </select>
                  </div>
                </div>

                {fetching ? (
                  <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Restaurant</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Domain Slug</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Owner</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Tier</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Orders (Mtd)</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Marketing (Mtd)</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-5 font-bold text-xs uppercase tracking-wider text-slate-500">
                          <div className="flex justify-end">Actions</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {businesses.filter(b => !b.parent_business_id).filter(b => {
                        const branches = businesses.filter(branch => branch.parent_business_id === b.id);
                        
                        // Search filter: matches parent OR any of its branches
                        const sq = searchQuery.toLowerCase();
                        const matchesSearch = !sq || 
                          b.name.toLowerCase().includes(sq) || 
                          b.slug.toLowerCase().includes(sq) || 
                          b.owner_phone.includes(sq) ||
                          branches.some(br => 
                            br.name.toLowerCase().includes(sq) || 
                            br.slug.toLowerCase().includes(sq) || 
                            br.owner_phone.includes(sq)
                          );
                        
                        // Status, Tier & Hierarchy filters only apply to the parent for visibility
                        const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
                        const matchesTier = tierFilter === 'all' || b.subscription_tier === tierFilter;
                        
                        const isFranchise = branches.length > 0;
                        const matchesHierarchy = hierarchyFilter === 'all' || 
                                                (hierarchyFilter === 'franchise' && isFranchise) || 
                                                (hierarchyFilter === 'independent' && !isFranchise);
                        
                        return matchesSearch && matchesStatus && matchesTier && matchesHierarchy;
                      }).map(b => {
                        const isExpanded = expandedRows.has(b.id);
                        const branches = businesses.filter(branch => branch.parent_business_id === b.id);
                        const hasBranches = branches.length > 0;

                        return (
                          <React.Fragment key={b.id}>
                            <tr className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all group ${isExpanded ? 'bg-slate-50/50 dark:bg-zinc-800/10' : ''}`}>
                              <td className="px-6 py-5">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  {hasBranches && (
                                    <button 
                                      onClick={() => {
                                        setExpandedRows(prev => {
                                          const next = new Set(prev);
                                          if (next.has(b.id)) next.delete(b.id);
                                          else next.add(b.id);
                                          return next;
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                                    >
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                  )}
                                  {b.name}
                                </div>
                                {hasBranches && !isExpanded && (
                                  <div className="text-xs text-slate-500 mt-1 font-medium ml-8">
                                    {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
                                  </div>
                                )}
                              </td>
                          <td className="px-6 py-5 font-mono text-sm text-slate-500"><span className="whitespace-nowrap bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700">{b.slug}</span></td>
                          <td className="px-6 py-5 font-medium text-slate-700 dark:text-slate-300">{b.owner_phone}</td>
                          <td className="px-6 py-5">
                            <select
                              value={b.subscription_tier || 'free'}
                              onChange={(e) => handleUpdateTier(b.id, e.target.value)}
                              className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none font-bold capitalize text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${b.monthly_order_limit && parseInt(b.current_month_orders || 0) >= parseInt(b.monthly_order_limit) ? 'text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full' : 'text-slate-600 dark:text-slate-300'}`}>
                                {b.current_month_orders || 0}
                                {b.monthly_order_limit && <span className="text-slate-400 font-medium ml-1">/ {b.monthly_order_limit >= 999999 ? '∞' : (b.monthly_order_limit >= 1000 ? (b.monthly_order_limit/1000).toFixed(1) + 'k' : b.monthly_order_limit)}</span>}
                              </span>
                              {b.monthly_order_limit && parseInt(b.current_month_orders || 0) >= parseInt(b.monthly_order_limit) && (
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {b.current_month_marketing || 0}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${b.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              {b.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant={b.status === 'active' ? "ghost" : "default"}
                                size="icon"
                                onClick={() => toggleStatus(b.id, b.status)}
                                className={b.status === 'active' ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 w-8" : "bg-emerald-500 hover:bg-emerald-600 h-8 w-8"}
                                title={b.status === 'active' ? "Suspend" : "Activate"}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(b)}
                                title="Edit Tenant Details"
                                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-8 w-8"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openTenantAnalytics(b)}
                                title="View Performance Analytics"
                                className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 h-8 w-8"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openFeaturesModal(b)}
                                title="Manual Feature Override"
                                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-8 w-8"
                              >
                                <Settings2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleImpersonate(b.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none h-8"
                              >
                                Log In As
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && branches.map(branch => (
                              <tr key={branch.id} className="group bg-indigo-50/30 dark:bg-indigo-500/5 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-all">
                                <td className="px-6 py-4 pl-12 border-l-2 border-indigo-200 dark:border-indigo-500/30">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <CornerDownRight size={14} className="text-indigo-400" />
                                    {branch.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-500"><span className="whitespace-nowrap bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 shadow-sm">{branch.slug}</span></td>
                                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{branch.owner_phone}</td>
                                <td className="px-6 py-4">
                                  <select
                                    value={branch.subscription_tier || 'free'}
                                    onChange={(e) => handleUpdateTier(branch.id, e.target.value)}
                                    className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none font-bold capitalize text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold ${branch.monthly_order_limit && parseInt(branch.current_month_orders || 0) >= parseInt(branch.monthly_order_limit) ? 'text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full' : 'text-slate-600 dark:text-slate-300'}`}>
                                      {branch.current_month_orders || 0}
                                      {branch.monthly_order_limit && <span className="text-slate-400 font-medium ml-1">/ {branch.monthly_order_limit >= 999999 ? '∞' : (branch.monthly_order_limit >= 1000 ? (branch.monthly_order_limit/1000).toFixed(1) + 'k' : branch.monthly_order_limit)}</span>}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-bold text-slate-600 dark:text-slate-300">
                                    {branch.current_month_marketing || 0}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${branch.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${branch.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                    {branch.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant={branch.status === 'active' ? "ghost" : "default"}
                                      size="icon"
                                      onClick={() => toggleStatus(branch.id, branch.status)}
                                      className={branch.status === 'active' ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-8 w-8" : "bg-emerald-500 hover:bg-emerald-600 h-8 w-8"}
                                      title={branch.status === 'active' ? "Suspend" : "Activate"}
                                    >
                                      <Power className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditModal(branch)}
                                      title="Edit Tenant Details"
                                      className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-8 w-8"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openTenantAnalytics(branch)}
                                      title="View Performance Analytics"
                                      className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 h-8 w-8"
                                    >
                                      <TrendingUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openFeaturesModal(branch)}
                                      title="Manual Feature Override"
                                      className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-8 w-8"
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleImpersonate(branch.id)}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none h-8"
                                    >
                                      Log In As
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                      );
                    })}
                      {businesses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">No restaurants provisioned yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : activeTab === "plans" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 mt-4">
              {fetchingTiers ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tiers.map(tier => (
                    <div key={tier.name} className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 p-8 flex flex-col group">
                      <div className="mb-6">
                        <h3 className="text-2xl font-black capitalize text-slate-900 dark:text-white mb-2 flex justify-between items-center">
                          {tier.name}
                          <span className="text-sm font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 px-3 py-1 rounded-full">₹{parseFloat(tier.monthly_price)}/mo</span>
                        </h3>
                      </div>
                      
                      <div className="mb-4">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Monthly Order Limit</label>
                        <div className="relative">
                          <Input 
                            type="number"
                            defaultValue={tier.monthly_order_limit}
                            onChange={(e) => {
                              const newTiers = [...tiers];
                              const t = newTiers.find(x => x.name === tier.name);
                              if (t) t.monthly_order_limit = parseInt(e.target.value) || 0;
                              setTiers(newTiers);
                            }}
                            className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 font-bold pr-16 h-12 text-lg"
                          />
                          <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">Orders</span>
                        </div>
                      </div>

                      <div className="mb-8">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Monthly Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">₹</span>
                          <Input 
                            type="number"
                            defaultValue={tier.monthly_price}
                            onChange={(e) => {
                              const newTiers = [...tiers];
                              const t = newTiers.find(x => x.name === tier.name);
                              if (t) t.monthly_price = parseFloat(e.target.value) || 0;
                              setTiers(newTiers);
                            }}
                            className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 font-bold pl-8 pr-12 h-12 text-lg"
                          />
                          <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">/mo</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4 mb-8">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Included Features</h4>
                        {ALL_FEATURES.map(feat => {
                          const isIncluded = tier.included_features.includes(feat.key);
                          return (
                            <div key={feat.key} className="flex items-center gap-3">
                              <Switch 
                                checked={isIncluded}
                                onCheckedChange={(checked) => {
                                  const newTiers = [...tiers];
                                  const t = newTiers.find(x => x.name === tier.name);
                                  if (t) {
                                    if (checked) t.included_features.push(feat.key);
                                    else t.included_features = t.included_features.filter((f: string) => f !== feat.key);
                                  }
                                  setTiers(newTiers);
                                }}
                              />
                              <span className={`text-sm font-semibold ${isIncluded ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through'}`}>{feat.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        onClick={() => handleUpdatePlanTier(tier.name, tier.monthly_order_limit, tier.monthly_price, tier.included_features)}
                        disabled={savingTier === tier.name}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-zinc-900 text-white font-bold h-12 shadow-lg shadow-slate-200 dark:shadow-none"
                      >
                        {savingTier === tier.name ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Plan Configuration"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "announcements" ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 max-w-3xl mt-4 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Global Broadcast</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium">Send an instant push notification to all connected tenant dashboards and POS tablets globally.</p>

              <form onSubmit={handleSendAnnouncement} className="space-y-6">
                <div>
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Announcement Title</Label>
                  <Input
                    required
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance"
                    maxLength={50}
                    className="mt-2 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-12"
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Message</Label>
                  <textarea
                    required
                    className="w-full min-h-[120px] border border-slate-200 dark:border-zinc-800 rounded-xl p-4 mt-2 bg-slate-50 dark:bg-zinc-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    value={annMessage}
                    onChange={e => setAnnMessage(e.target.value)}
                    placeholder="Details of the announcement..."
                    maxLength={250}
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">Alert Severity</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <label className={`flex flex-col items-center gap-2 cursor-pointer p-4 rounded-xl border-2 transition-all ${annType === 'info' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700'}`}>
                      <input type="radio" name="annType" value="info" checked={annType === "info"} onChange={() => setAnnType("info")} className="hidden" />
                      <span className="text-blue-500 bg-blue-100 dark:bg-blue-500/20 p-2 rounded-full"><ShieldAlert className="w-5 h-5" /></span>
                      <span className="text-sm text-blue-600 font-bold">Info</span>
                    </label>
                    <label className={`flex flex-col items-center gap-2 cursor-pointer p-4 rounded-xl border-2 transition-all ${annType === 'warning' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700'}`}>
                      <input type="radio" name="annType" value="warning" checked={annType === "warning"} onChange={() => setAnnType("warning")} className="hidden" />
                      <span className="text-amber-500 bg-amber-100 dark:bg-amber-500/20 p-2 rounded-full"><ShieldAlert className="w-5 h-5" /></span>
                      <span className="text-sm text-amber-600 font-bold">Warning</span>
                    </label>
                    <label className={`flex flex-col items-center gap-2 cursor-pointer p-4 rounded-xl border-2 transition-all ${annType === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700'}`}>
                      <input type="radio" name="annType" value="critical" checked={annType === "critical"} onChange={() => setAnnType("critical")} className="hidden" />
                      <span className="text-red-500 bg-red-100 dark:bg-red-500/20 p-2 rounded-full"><ShieldAlert className="w-5 h-5" /></span>
                      <span className="text-sm text-red-600 font-bold">Critical</span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                  <Button type="submit" disabled={sendingAnn} className="w-full h-14 text-md font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.01]">
                    {sendingAnn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MessageSquareWarning className="w-5 h-5 mr-2" />}
                    {sendingAnn ? "Broadcasting to all nodes..." : "Deploy Global Announcement"}
                  </Button>
                </div>
              </form>
            </div>
          ) : activeTab === "ota" ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-10 rounded-3xl shadow-sm max-w-3xl mt-4 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
                <DownloadCloud className="text-indigo-600" /> Publish Global Update
              </h3>
              <p className="text-sm text-slate-500 mb-10 font-medium">
                Upload a zipped `dist` folder to push a live Over-The-Air update to all tablets across ALL tenants instantly.
              </p>

              <form onSubmit={handleUploadOta} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Version Number (e.g. 1.0.5)</label>
                  <Input
                    required
                    type="text"
                    value={otaVersion}
                    onChange={e => setOtaVersion(e.target.value)}
                    className="w-full font-bold h-12 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Release Notes</label>
                  <textarea
                    value={otaNotes}
                    onChange={e => setOtaNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                    placeholder="What's new in this version?"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Select Build Archive (.zip)</label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center bg-slate-50 dark:bg-zinc-950/50 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                    <input
                      required
                      type="file"
                      accept=".zip"
                      onChange={e => setOtaFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/10 dark:file:text-indigo-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-zinc-800">
                  <Button
                    type="submit"
                    disabled={otaUploading || !otaFile || !otaVersion}
                    className="w-full h-14 text-lg font-bold flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200 transition-all hover:scale-[1.01] shadow-xl shadow-slate-200 dark:shadow-none"
                  >
                    <UploadCloud size={24} /> {otaUploading ? "Uploading & Broadcasting..." : "Publish Update to All Tablets"}
                  </Button>
                </div>
              </form>
            </div>
          ) : activeTab === "enquiries" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Inbound Enquiries</h3>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search name, email, phone..." 
                      value={enquirySearchQuery}
                      onChange={(e) => setEnquirySearchQuery(e.target.value)}
                      className="pl-9 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 h-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={enquiryStatusFilter}
                      onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300 h-10"
                    >
                      <option value="all">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <select
                      value={enquirySortOrder}
                      onChange={(e) => setEnquirySortOrder(e.target.value)}
                      className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300 h-10"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 text-sm">
                      <th className="pb-3 font-semibold pl-2">Date</th>
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Restaurant</th>
                      <th className="pb-3 font-semibold">Contact</th>
                      <th className="pb-3 font-semibold">Message</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredEnquiries = enquiries.filter(enq => {
                        const sq = enquirySearchQuery.toLowerCase();
                        const matchesSearch = !sq || 
                          (enq.name && enq.name.toLowerCase().includes(sq)) || 
                          (enq.email && enq.email.toLowerCase().includes(sq)) || 
                          (enq.phone && enq.phone.toLowerCase().includes(sq)) || 
                          (enq.restaurant_name && enq.restaurant_name.toLowerCase().includes(sq));
                        
                        const matchesStatus = enquiryStatusFilter === 'all' || enq.status === enquiryStatusFilter;
                        
                        return matchesSearch && matchesStatus;
                      }).sort((a, b) => {
                        const dateA = new Date(a.created_at).getTime();
                        const dateB = new Date(b.created_at).getTime();
                        return enquirySortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                      });

                      if (filteredEnquiries.length === 0) {
                        return <tr><td colSpan={7} className="text-center py-6 text-slate-500 font-medium">No enquiries found</td></tr>;
                      }

                      return filteredEnquiries.map((enq) => (
                        <tr key={enq.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 pl-2 text-sm text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                             {new Date(enq.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 font-bold text-slate-900 dark:text-white text-sm">{enq.name}</td>
                          <td className="py-4 text-sm text-slate-600 dark:text-zinc-300 font-medium">{enq.restaurant_name}</td>
                          <td className="py-4 text-sm text-slate-600 dark:text-zinc-300">
                             {enq.email}<br/><span className="text-xs opacity-70">{enq.phone}</span>
                          </td>
                          <td className="py-4 text-sm text-slate-600 dark:text-zinc-300 max-w-[200px] truncate" title={enq.message}>{enq.message || "-"}</td>
                          <td className="py-4">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${enq.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : enq.status === 'Contacted' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                               {enq.status}
                             </span>
                          </td>
                          <td className="py-4">
                             <div className="flex items-center gap-2">
                               <select 
                                 className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                                 value={enq.status}
                                 onChange={(e) => updateEnquiryStatus(enq.id, e.target.value)}
                               >
                                 <option value="New">New</option>
                                 <option value="Contacted">Contacted</option>
                                 <option value="Resolved">Resolved</option>
                               </select>
                               <button 
                                 onClick={() => deleteEnquiry(enq.id)}
                                 className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                 title="Delete Enquiry"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "settings" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-sm">
                <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Platform Public Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Public Support Email</label>
                    <input
                      type="email"
                      value={saasSettings.contact_email}
                      onChange={(e) => setSaasSettings({ ...saasSettings, contact_email: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="support@classicos.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">This email will be displayed on the public landing page in the Contact Us section.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Public Contact Phone</label>
                    <input
                      type="text"
                      value={saasSettings.contact_phone}
                      onChange={(e) => setSaasSettings({ ...saasSettings, contact_phone: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="+91 9876543210"
                    />
                    <p className="text-xs text-slate-500 mt-1">This phone number will be displayed alongside the email.</p>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-full sm:w-auto px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    {settingsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Settings
                  </Button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-sm">
                <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Super Admin Credentials</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Username / Email</label>
                    <input
                      type="text"
                      value={superAdminProfile.email}
                      onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, email: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="admin@classicos.com"
                    />
                    <p className="text-xs text-slate-500 mt-1">This is the email or username you use to log in to this dashboard.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={superAdminProfile.password}
                      onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, password: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="Leave blank to keep unchanged"
                    />
                    <p className="text-xs text-slate-500 mt-1">Leave this blank if you don't want to change your password.</p>
                  </div>
                  {superAdminProfile.password && superAdminProfile.password.trim() !== "" && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={superAdminProfile.oldPassword || ""}
                        onChange={(e) => setSuperAdminProfile({ ...superAdminProfile, oldPassword: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 border-rose-200 dark:border-rose-900/50 dark:text-white"
                        placeholder="Enter current password to verify"
                      />
                      <p className="text-xs text-rose-500 mt-1">Required to set a new password.</p>
                    </div>
                  )}
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full sm:w-auto px-8 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-zinc-900 text-white font-bold shadow-lg shadow-slate-200 dark:shadow-none transition-all hover:scale-[1.01]">
                    {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Update Credentials
                  </Button>
                </div>
              </div>
            </div>
          ) : activeTab === "branch-requests" ? (
            <BranchRequestsTab token={token || ""} />
          ) : null}
        </div>
      </main>

      <Dialog open={featuresModal.isOpen} onOpenChange={(open) => !open && setFeaturesModal({ isOpen: false, business: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Features for {featuresModal.business?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {ALL_FEATURES.map((feature) => (
              <div key={feature.key} className="flex items-start space-x-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <Switch
                  id={feature.key}
                  checked={editingFeatures[feature.key] === true}
                  onCheckedChange={(checked) => setEditingFeatures({ ...editingFeatures, [feature.key]: checked })}
                />
                <div className="grid gap-1">
                  <Label htmlFor={feature.key} className="font-semibold text-base cursor-pointer">{feature.label}</Label>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeaturesModal({ isOpen: false, business: null })}>Cancel</Button>
            <Button onClick={handleSaveFeatures} disabled={savingFeatures}>
              {savingFeatures ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Features
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModal.isOpen} onOpenChange={(open) => !open && setEditModal({ isOpen: false, business: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editModal.business?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Restaurant Name</label>
              <Input required value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-50 dark:bg-zinc-950" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Subdomain Slug</label>
              <Input required value={editSlug} onChange={e => setEditSlug(e.target.value)} pattern="[a-z0-9-]+" className="bg-slate-50 dark:bg-zinc-950" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Owner Phone Number (Login ID)</label>
              <Input required value={editPhone} onChange={e => setEditPhone(e.target.value)} pattern="[0-9]{10}" className="bg-slate-50 dark:bg-zinc-950" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">New Password (Optional)</label>
              <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Leave blank to keep unchanged" className="bg-slate-50 dark:bg-zinc-950" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditModal({ isOpen: false, business: null })}>Cancel</Button>
              <Button type="submit" disabled={savingEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={tenantAnalyticsModal.isOpen} onOpenChange={(open) => !open && setTenantAnalyticsModal({ isOpen: false, business: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              {tenantAnalyticsModal.business?.name} - Performance
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            {tenantAnalyticsLoading || !tenantAnalyticsData ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                <p className="font-medium">Fetching deep analytics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Today", data: tenantAnalyticsData.daily, icon: <PieChart className="w-4 h-4" /> },
                  { label: "This Week", data: tenantAnalyticsData.weekly, icon: <TrendingUp className="w-4 h-4" /> },
                  { label: "This Month", data: tenantAnalyticsData.monthly, icon: <ShoppingBag className="w-4 h-4" /> },
                  { label: "This Year", data: tenantAnalyticsData.yearly, icon: <Building2 className="w-4 h-4" /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                      {stat.icon} {stat.label}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Orders</p>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stat.data.orders.toLocaleString()}</h4>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Revenue</p>
                        <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{stat.data.revenue.toLocaleString()}</h4>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="col-span-2 bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-2xl text-white relative overflow-hidden mt-2">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                  <p className="text-indigo-100 font-medium mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> All-Time Performance
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-indigo-200 text-sm font-medium mb-1">Lifetime Orders</p>
                      <h4 className="text-4xl font-black">{tenantAnalyticsData.allTime.orders.toLocaleString()}</h4>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-sm font-medium mb-1">Lifetime Revenue</p>
                      <h4 className="text-4xl font-black">₹{tenantAnalyticsData.allTime.revenue.toLocaleString()}</h4>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
