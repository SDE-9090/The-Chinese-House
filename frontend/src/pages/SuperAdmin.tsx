import React, { useEffect, useState } from "react";
import { API_URL } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Power, ShieldAlert, Settings2, DownloadCloud, UploadCloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { apiSuperAdminUploadUpdate } from "@/lib/apiClient";

export default function SuperAdmin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("super_token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<"businesses" | "ota">("businesses");

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

  const [featuresModal, setFeaturesModal] = useState<{ isOpen: boolean, business: any }>({ isOpen: false, business: null });
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [editingFeatures, setEditingFeatures] = useState<any>({});

  const ALL_FEATURES = [
    { key: 'manual_table_orders', label: 'Manual Table Orders', desc: 'Allow staff to create orders assigned to tables manually.' },
    { key: 'qr_digital_ordering', label: 'QR Digital Ordering', desc: 'Enable customers to scan QR codes and order directly from their phone.' },
    { key: 'pos_system', label: 'POS System', desc: 'Enable the counter POS interface for direct orders.' },
    { key: 'advanced_analytics', label: 'Advanced Analytics', desc: 'Unlock detailed sales and performance charts.' },
    { key: 'website_cms', label: 'Website CMS', desc: 'Allow the tenant to manage their landing page, gallery, and promotions.' },
    { key: 'coupon_engine', label: 'Coupon Engine', desc: 'Enable the creation and redemption of discount coupons.' },
    { key: 'customer_reviews', label: 'Customer Reviews', desc: 'Allow customers to submit reviews and feedback.' }
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

  useEffect(() => {
    if (token) fetchBusinesses();
  }, [token]);

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

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-lg">
          <div className="flex flex-col items-center mb-8">
            <ShieldAlert className="w-12 h-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-center">Super Admin Portal</h1>
            <p className="text-sm text-gray-500 mt-2">Global Platform Management</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Master Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Manage all multi-tenant restaurants</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("businesses")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === "businesses" ? "bg-white dark:bg-zinc-700 shadow" : "text-muted-foreground"}`}
              >
                Businesses
              </button>
              <button
                onClick={() => setActiveTab("ota")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === "ota" ? "bg-white dark:bg-zinc-700 shadow" : "text-muted-foreground"}`}
              >
                OTA Updates
              </button>
            </div>
            {activeTab === "businesses" && (
              <Button onClick={() => setShowAdd(!showAdd)}>
                <Plus className="w-4 h-4 mr-2" /> New Restaurant
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              localStorage.removeItem("super_token");
              setToken(null);
            }}>Logout</Button>
          </div>
        </div>

        {activeTab === "businesses" ? (
          <>
            {showAdd && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm mb-8 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Onboard New Restaurant</h2>
            <form onSubmit={handleCreateBusiness} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Restaurant Name</label>
                <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. The Golden Dragon" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subdomain Slug</label>
                <Input required value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. goldendragon (will be goldendragon.thechinesehouse.app)" pattern="[a-z0-9-]+" />
                <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, hyphens only.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Owner Phone Number (Login ID)</label>
                <Input required value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="10 digit number" pattern="[0-9]{10}" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Initial Password</label>
                <Input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="md:col-span-2 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Provision Restaurant"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden border border-zinc-200 dark:border-zinc-800">
          {fetching ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                  <th className="p-4 font-semibold text-sm">Restaurant Name</th>
                  <th className="p-4 font-semibold text-sm">Subdomain (Slug)</th>
                  <th className="p-4 font-semibold text-sm">Owner Phone</th>
                  <th className="p-4 font-semibold text-sm">Joined</th>
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {businesses.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4 font-medium">{b.name}</td>
                    <td className="p-4 font-mono text-sm">{b.slug}</td>
                    <td className="p-4">{b.owner_phone}</td>
                    <td className="p-4 text-sm text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openFeaturesModal(b)}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Features
                      </Button>
                      <Button 
                        variant={b.status === 'active' ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => toggleStatus(b.id, b.status)}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {b.status === 'active' ? "Suspend" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {businesses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">No restaurants provisioned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
          </>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm max-w-2xl mx-auto mt-12">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <DownloadCloud className="text-primary" /> Publish Global Update
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Upload a zipped `dist` folder to push a live Over-The-Air update to all tablets across ALL tenants instantly.
            </p>

            <form onSubmit={handleUploadOta} className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-1">Version Number (e.g. 1.0.5)</label>
                <Input 
                  required
                  type="text" 
                  value={otaVersion}
                  onChange={e => setOtaVersion(e.target.value)}
                  className="w-full font-semibold"
                  placeholder="1.0.0"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-1">Release Notes</label>
                <textarea 
                  value={otaNotes}
                  onChange={e => setOtaNotes(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                  placeholder="What's new in this version?"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-1">Select Build (.zip)</label>
                <input 
                  required
                  type="file"
                  accept=".zip"
                  onChange={e => setOtaFile(e.target.files?.[0] || null)}
                  className="w-full file:bg-primary file:text-primary-foreground file:border-none file:px-4 file:py-2 file:rounded-lg file:mr-4 file:font-bold text-sm text-muted-foreground bg-gray-50 dark:bg-zinc-800 p-2 rounded-xl"
                />
              </div>
              
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button 
                  type="submit"
                  disabled={otaUploading || !otaFile || !otaVersion}
                  className="w-full py-6 text-lg font-bold flex justify-center items-center gap-2"
                >
                  <UploadCloud size={20} /> {otaUploading ? "Uploading & Broadcasting..." : "Publish Update to All Tablets"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

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
    </div>
  );
}
