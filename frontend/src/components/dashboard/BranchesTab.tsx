import { useState, useEffect } from "react";
import { API_URL } from "@/lib/apiClient";
import { Network, Plus, CheckCircle2, Clock, XCircle, ArrowRight, MoreVertical, Power, Edit2, LogIn, Activity, DollarSign, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Branch {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  is_active: boolean;
  today_revenue: string;
  today_orders: string;
  all_time_revenue: string;
  all_time_orders: string;
  active_orders_count: string;
}

interface BranchRequest {
  id: string;
  requested_name: string;
  requested_slug: string;
  requested_tier: string;
  status: string;
  created_at: string;
}

interface Analytics {
  today: { total_orders: number; total_revenue: number };
  allTime: { total_orders: number; total_revenue: number };
}

export function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [requests, setRequests] = useState<BranchRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", slug: "", tier: "pro", mobile: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  let displayHost = "yourdomain.com";
  if (typeof window !== "undefined") {
    displayHost = window.location.host;
    if (displayHost.includes(".localhost")) {
      displayHost = displayHost.substring(displayHost.indexOf(".localhost") + 1);
    } else if (displayHost.split('.').length > 1 && !displayHost.startsWith('localhost') && !displayHost.startsWith('127.0.0.1')) {
      displayHost = displayHost.split('.').slice(1).join('.');
    }
  }

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editFormData, setEditFormData] = useState({ slug: "", tier: "" });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("admin_auth_token") || document.cookie.split("; ").find(r => r.startsWith("admin_auth_token="))?.split("=")[1];
      const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
      
      const [bRes, rRes, aRes] = await Promise.all([
        fetch(`${API_URL}/admin/branches`, { headers }),
        fetch(`${API_URL}/admin/branch-requests`, { headers }),
        fetch(`${API_URL}/admin/franchise-analytics`, { headers })
      ]);
      
      if (bRes.ok) setBranches(await bRes.json());
      if (rRes.ok) setRequests(await rRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
      
    } catch (err) {
      console.error("Failed to load franchise data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      const token = localStorage.getItem("admin_auth_token") || document.cookie.split("; ").find(r => r.startsWith("admin_auth_token="))?.split("=")[1];
      const res = await fetch(`${API_URL}/admin/branch-requests`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }
      
      setShowModal(false);
      setFormData({ name: "", slug: "", tier: "pro", mobile: "", password: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImpersonate = async (branchId: string, slug: string) => {
    try {
      const token = localStorage.getItem("admin_auth_token") || document.cookie.split("; ").find(r => r.startsWith("admin_auth_token="))?.split("=")[1];
      const res = await fetch(`${API_URL}/admin/impersonate-branch`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ branchId })
      });
      
      if (!res.ok) throw new Error("Failed to impersonate branch");
      const data = await res.json();
      
      // Open in new tab with token in URL hash so the app can pick it up
      let baseHost = window.location.host;
      if (baseHost.includes(".localhost")) {
        baseHost = baseHost.substring(baseHost.indexOf(".localhost") + 1);
      }
      const branchUrl = `${window.location.protocol}//${slug}.${baseHost}/dashboard#impersonate=${data.token}`;
      window.open(branchUrl, '_blank');
    } catch (err) {
      console.error(err);
      alert("Error impersonating branch");
    }
    setActiveDropdown(null);
  };

  const handleToggleStatus = async (branchId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} this branch?`)) return;
    try {
      const token = localStorage.getItem("admin_auth_token") || document.cookie.split("; ").find(r => r.startsWith("admin_auth_token="))?.split("=")[1];
      const res = await fetch(`${API_URL}/admin/branches/${branchId}/toggle-status`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
    setActiveDropdown(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("admin_auth_token") || document.cookie.split("; ").find(r => r.startsWith("admin_auth_token="))?.split("=")[1];
      const res = await fetch(`${API_URL}/admin/branches/${editBranch.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update branch");
      }
      setEditBranch(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading franchise data...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Franchise Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
             <DollarSign size={16} className="text-green-500" /> Franchise Revenue (Today)
          </h3>
          <div className="text-4xl font-bold text-foreground">
            ₹{analytics?.today.total_revenue || 0}
          </div>
          <div className="text-sm text-primary font-medium mt-1">
            {analytics?.today.total_orders || 0} orders across all branches
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
             <DollarSign size={16} className="text-blue-500" /> Franchise Revenue (All Time)
          </h3>
          <div className="text-4xl font-bold text-foreground">
            ₹{analytics?.allTime.total_revenue || 0}
          </div>
          <div className="text-sm text-primary font-medium mt-1">
            {analytics?.allTime.total_orders || 0} orders across all branches
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">Franchise Locations</h2>
          <p className="text-muted-foreground">Manage your sub-branches, analytics, and settings.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Request New Branch
        </button>
      </div>
      
      {/* Active Branches Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {branches.map(b => (
          <div key={b.id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col relative group">
             {/* Header */}
             <div className="p-5 border-b border-border bg-muted/20 flex items-start justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${b.is_active ? 'bg-green-500' : 'bg-red-500'} shadow-sm`} title={b.is_active ? "Online" : "Suspended"} />
                      <h4 className="font-bold text-foreground text-lg leading-none truncate pr-2">{b.name}</h4>
                   </div>
                   <div className="text-xs text-muted-foreground font-medium">{b.slug}.{displayHost}</div>
                </div>
                
                <div className="relative">
                  <button onClick={() => setActiveDropdown(activeDropdown === b.id ? null : b.id)} className="p-2 -mr-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition">
                     <MoreVertical size={18} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === b.id && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl z-10 py-2 overflow-hidden"
                      >
                         <button onClick={() => handleImpersonate(b.id, b.slug)} className="w-full text-left px-4 py-2.5 text-sm font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition flex items-center gap-2">
                           <LogIn size={16} /> Login As Branch
                         </button>
                         <button onClick={() => { setEditBranch(b); setEditFormData({ slug: b.slug, tier: b.subscription_tier }); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition flex items-center gap-2">
                           <Edit2 size={16} /> Edit Settings
                         </button>
                         <div className="h-px bg-border my-1" />
                         <button onClick={() => handleToggleStatus(b.id, b.is_active)} className={`w-full text-left px-4 py-2.5 text-sm font-bold transition flex items-center gap-2 ${b.is_active ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'}`}>
                           <Power size={16} /> {b.is_active ? 'Suspend Branch' : 'Activate Branch'}
                         </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
             </div>
             
             {/* Stats */}
             <div className="p-5 flex-1 grid grid-cols-2 gap-4">
                <div>
                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Today Rev</div>
                   <div className="text-xl font-bold text-foreground flex items-center gap-1">₹{b.today_revenue}</div>
                </div>
                <div>
                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Rev</div>
                   <div className="text-xl font-bold text-foreground flex items-center gap-1">₹{b.all_time_revenue}</div>
                </div>
                <div>
                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Today Orders</div>
                   <div className="text-lg font-bold text-foreground">{b.today_orders}</div>
                </div>
                <div>
                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Orders</div>
                   <div className="text-lg font-bold text-foreground">{b.all_time_orders}</div>
                </div>
             </div>

             {/* Footer Status */}
             <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                   <Activity size={16} className={parseInt(b.active_orders_count) > 0 ? "text-primary" : "text-muted-foreground"} />
                   <span className="text-sm font-bold text-foreground">{b.active_orders_count} Active Orders</span>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">{b.subscription_tier}</span>
             </div>
          </div>
        ))}
        {branches.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-3xl">
             <Network size={48} className="mx-auto text-muted-foreground/30 mb-4" />
             <p className="text-lg font-bold text-foreground">No active branches</p>
             <p className="text-muted-foreground">Approve requests or create a new branch to get started.</p>
          </div>
        )}
      </div>
      
      {/* Pending Requests Table (Unchanged) */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold flex items-center gap-2"><Clock size={18} className="text-amber-500" /> Branch Requests</h3>
        </div>
        <div className="divide-y divide-border">
          {requests.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">No pending requests.</div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/10 transition gap-4">
                <div>
                  <h4 className="font-bold text-foreground">{r.requested_name}</h4>
                  <div className="text-sm text-muted-foreground">Requested: {r.requested_slug} | Tier: {r.requested_tier}</div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'pending' && <span className="flex items-center gap-1 text-amber-500 text-sm font-bold bg-amber-500/10 px-3 py-1 rounded-full"><Clock size={14} /> Pending Approval</span>}
                  {r.status === 'approved' && <span className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full"><CheckCircle2 size={14} /> Approved</span>}
                  {r.status === 'rejected' && <span className="flex items-center gap-1 text-red-500 text-sm font-bold bg-red-500/10 px-3 py-1 rounded-full"><XCircle size={14} /> Rejected</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl shadow-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold font-heading mb-4 text-foreground">Request New Branch</h3>
            
            {error && <div className="p-3 mb-4 text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-foreground">Branch Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 mt-1 rounded-xl border border-border bg-background"
                  required
                  placeholder="e.g. Golden Wok Downtown"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-foreground">Subdomain Slug</label>
                <div className="flex mt-1">
                  <input 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="w-full px-4 py-2 rounded-l-xl border border-border bg-background outline-none focus:border-primary transition"
                    required
                    placeholder="downtown"
                  />
                  <div className="px-4 py-2 bg-muted border border-l-0 border-border rounded-r-xl flex items-center text-muted-foreground font-medium">
                    .{displayHost}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-foreground">Manager Mobile Number</label>
                <input 
                  type="tel" 
                  value={formData.mobile} 
                  onChange={e => setFormData(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full px-4 py-2 mt-1 rounded-xl border border-border bg-background"
                  required
                  placeholder="e.g. 9876543210"
                  minLength={10}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-sm font-bold text-foreground">Manager Password</label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-2 mt-1 rounded-xl border border-border bg-background"
                  required
                  placeholder="Password for the branch"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-foreground">Subscription Tier</label>
                <select 
                  value={formData.tier} 
                  onChange={e => setFormData(p => ({ ...p, tier: e.target.value }))}
                  className="w-full px-4 py-2 mt-1 rounded-xl border border-border bg-background"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editBranch && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-card border border-border rounded-3xl shadow-2xl p-6 w-full max-w-sm"
           >
             <h3 className="text-xl font-bold font-heading mb-4 text-foreground flex items-center gap-2"><Edit2 size={20} /> Edit {editBranch.name}</h3>
             
             {error && <div className="p-3 mb-4 text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
             
             <form onSubmit={handleEditSubmit} className="space-y-4">
               <div>
                 <label className="text-sm font-bold text-foreground">Subdomain Slug</label>
                 <div className="flex mt-1">
                   <input 
                     type="text" 
                     value={editFormData.slug} 
                     onChange={e => setEditFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                     className="w-full px-4 py-2 rounded-l-xl border border-border bg-background outline-none focus:border-primary transition"
                     required
                     placeholder="downtown"
                   />
                   <div className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-xl flex items-center text-xs text-muted-foreground font-medium">
                     .{displayHost}
                   </div>
                 </div>
               </div>
               
               <div>
                 <label className="text-sm font-bold text-foreground">Subscription Tier</label>
                 <select 
                   value={editFormData.tier} 
                   onChange={e => setEditFormData(p => ({ ...p, tier: e.target.value }))}
                   className="w-full px-4 py-2 mt-1 rounded-xl border border-border bg-background"
                 >
                   <option value="starter">Starter</option>
                   <option value="pro">Pro</option>
                   <option value="enterprise">Enterprise</option>
                 </select>
               </div>
               
               <div className="flex items-center gap-3 mt-6">
                 <button type="button" onClick={() => { setEditBranch(null); setError(""); }} className="flex-1 py-3 text-muted-foreground font-bold hover:bg-muted rounded-xl transition">Cancel</button>
                 <button type="submit" disabled={submitting} className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                   {submitting ? "Saving..." : "Save Changes"}
                 </button>
               </div>
             </form>
           </motion.div>
         </div>
      )}
    </div>
  );
}
