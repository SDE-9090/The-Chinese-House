import { useState, useEffect } from "react";
import { API_URL } from "@/lib/apiClient";
import { Network, Plus, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Branch {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  is_active: boolean;
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

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading franchise data...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Franchise Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Franchise Revenue (Today)</h3>
          <div className="text-4xl font-bold text-foreground">
            ₹{analytics?.today.total_revenue || 0}
          </div>
          <div className="text-sm text-primary font-medium mt-1">
            {analytics?.today.total_orders || 0} orders across all branches
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Franchise Revenue (All Time)</h3>
          <div className="text-4xl font-bold text-foreground">
            ₹{analytics?.allTime.total_revenue || 0}
          </div>
          <div className="text-sm text-primary font-medium mt-1">
            {analytics?.allTime.total_orders || 0} orders across all branches
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-heading">Franchise Locations</h2>
          <p className="text-muted-foreground">Manage your sub-branches and requests.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Request New Branch
        </button>
      </div>
      
      {/* Active Branches */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden mb-8 shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold flex items-center gap-2"><Network size={18} className="text-primary" /> Active Branches</h3>
        </div>
        <div className="divide-y divide-border">
          {branches.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">No active branches yet.</div>
          ) : (
            branches.map(b => (
              <div key={b.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition">
                <div>
                  <h4 className="font-bold text-foreground text-lg">{b.name}</h4>
                  <div className="text-sm text-muted-foreground">{b.slug}.classicos.com</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase">{b.subscription_tier}</span>
                  <a href={`http://${b.slug}.localhost:5173`} target="_blank" rel="noreferrer" className="p-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition" title="Go to branch dashboard">
                     <ArrowRight size={18} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Pending Requests */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold flex items-center gap-2"><Clock size={18} className="text-amber-500" /> Branch Requests</h3>
        </div>
        <div className="divide-y divide-border">
          {requests.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">No pending requests.</div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl shadow-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold font-heading mb-4 text-foreground">Request New Branch</h3>
            <p className="text-sm text-muted-foreground mb-4">Adding a new branch will incur an additional subscription fee based on the chosen tier. This request will be sent to the platform Super Admin for approval.</p>
            
            {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-500/10 rounded-xl">{error}</div>}
            
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
                    className="w-full px-4 py-2 rounded-l-xl border border-border bg-background"
                    required
                    placeholder="downtown"
                  />
                  <div className="px-4 py-2 bg-muted border border-l-0 border-border rounded-r-xl flex items-center text-muted-foreground font-medium">
                    .classicos.com
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-foreground">Manager Mobile Number</label>
                <input 
                  type="tel" 
                  value={formData.mobile} 
                  onChange={e => setFormData(p => ({ ...p, mobile: e.target.value.replace(/\\D/g, '').slice(0, 10) }))}
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
    </div>
  );
}
