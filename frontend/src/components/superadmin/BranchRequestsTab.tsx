import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, Store } from "lucide-react";
import { API_URL } from "@/lib/apiClient";

export function BranchRequestsTab({ token }: { token: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/super/branch-requests`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch branch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/super/branch-requests/${id}/${action}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      
      fetchRequests(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-medium">
          {error}
        </div>
      )}
      
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Branch Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Headquarters (Parent)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requested Tier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No branch requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store size={16} className="text-indigo-500" /> {r.requested_name}
                      </div>
                      <div className="text-sm text-slate-500">{r.requested_slug}.classicos.com</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{r.parent_name}</div>
                      <div className="text-sm text-slate-500">{r.parent_slug}.classicos.com</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                        {r.requested_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'pending' && <span className="flex w-max items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold rounded-full"><Clock size={14} /> Pending</span>}
                      {r.status === 'approved' && <span className="flex w-max items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 text-xs font-bold rounded-full"><CheckCircle2 size={14} /> Approved</span>}
                      {r.status === 'rejected' && <span className="flex w-max items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 text-xs font-bold rounded-full"><XCircle size={14} /> Rejected</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={actioningId === r.id}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={actioningId === r.id}
                            className="px-4 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none transition disabled:opacity-50"
                          >
                            {actioningId === r.id ? 'Processing...' : 'Approve & Provision'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
