import { useState, useEffect } from "react";
import { apiAdminGetWaitlist, apiAdminUpdateWaitlistStatus, apiAdminNotifyWaitlist, apiPublicJoinWaitlist, WaitlistEntry, getTenantSlug } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, CheckCircle, Bell, X, Users, Clock, Plus, Timer, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WaitlistManagerProps {
  onSeatCustomer: (entry: WaitlistEntry) => void;
}

export default function WaitlistManager({ onSeatCustomer }: WaitlistManagerProps) {
  const [queue, setQueue] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSize, setNewSize] = useState("2");
  const [adding, setAdding] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await apiAdminGetWaitlist();
      setQueue(data);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to load waitlist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleNotify = async (id: string) => {
    toast({ title: "Sending WhatsApp..." });
    try {
      await apiAdminNotifyWaitlist(id);
      toast({ title: "Customer notified!" });
      fetchQueue();
    } catch (err: any) {
      toast({ title: err.message || "Failed to notify", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: 'seated' | 'cancelled') => {
    try {
      await apiAdminUpdateWaitlistStatus(id, status);
      if (status === 'seated') {
        const entry = queue.find(q => q.id === id);
        if (entry) onSeatCustomer(entry);
      }
      fetchQueue();
    } catch (err: any) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setAdding(true);
    try {
      const slug = getTenantSlug();
      if (!slug) throw new Error("No tenant slug found");
      await apiPublicJoinWaitlist(slug, {
        name: newName,
        phone: `91${newPhone.replace(/[^0-9]/g, '').slice(0, 10)}`,
        party_size: parseInt(newSize, 10)
      });
      toast({ title: "Added to waitlist" });
      setNewName("");
      setNewPhone("");
      setShowAdd(false);
      fetchQueue();
    } catch (err: any) {
      toast({ title: err.message || "Failed to add", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;
  }

  const renderAddForm = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <UserPlus size={16} className="text-primary" /> 
          Add Walk-in Customer
        </h4>
        <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full">
          <X size={14}/>
        </button>
      </div>
      <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Customer Name" 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 h-11"
            required
          />
        </div>
        <div className="w-full sm:w-48">
          <Input 
            type="tel" 
            placeholder="Phone (10 digits)" 
            value={newPhone} 
            onChange={e => setNewPhone(e.target.value)} 
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 h-11"
            required
          />
        </div>
        <div className="w-full sm:w-28 relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <Input 
            type="number" 
            placeholder="Size" 
            value={newSize} 
            onChange={e => setNewSize(e.target.value)} 
            className="w-full pl-9 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 h-11"
            min="1"
            required
          />
        </div>
        <Button type="submit" disabled={adding} className="w-full sm:w-32 h-11 shadow-sm font-semibold">
          {adding ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
          Add to Queue
        </Button>
      </form>
    </motion.div>
  );

  if (queue.length === 0) {
    return (
      <div className="space-y-4">
        <AnimatePresence>
          {!showAdd ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button onClick={() => setShowAdd(true)} variant="outline" className="w-full mb-2 h-12 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-primary hover:border-primary transition-all">
                <Plus size={18} className="mr-2" /> Add Walk-in Customer
              </Button>
            </motion.div>
          ) : renderAddForm()}
        </AnimatePresence>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800"
        >
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-sm mb-4">
            <Sparkles className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
          </div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Queue is Empty</h3>
          <p className="text-sm">No customers are currently waiting for a table.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {!showAdd ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
            <Button onClick={() => setShowAdd(true)} variant="outline" className="w-full mb-2 h-12 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-primary hover:text-primary transition-all">
              <Plus size={18} className="mr-2" /> Add Walk-in Customer
            </Button>
          </motion.div>
        ) : renderAddForm()}
      </AnimatePresence>
      
      <div className="space-y-3">
        <AnimatePresence>
          {queue.map((entry, index) => {
            const waitTime = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 60000);
            const isOverdue = waitTime > entry.quoted_wait_minutes;
            
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                key={entry.id} 
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Left Accent Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOverdue ? 'bg-red-500' : 'bg-primary'}`}></div>
                
                <div className="flex gap-4 items-center w-full sm:w-auto pl-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0
                    ${isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-primary/10 text-primary'}`}
                  >
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg flex items-center gap-2">
                      {entry.customer_name} 
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700">
                        <Users size={12} /> {entry.party_size}
                      </span>
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm">
                      <span className="text-zinc-500 font-medium tracking-tight">
                        {entry.customer_phone}
                      </span>
                      
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>
                      
                      <span className={`flex items-center gap-1.5 font-semibold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-500'}`}>
                        <Timer size={14} /> 
                        {waitTime}m waiting 
                        <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-0.5">/ {entry.quoted_wait_minutes}m</span>
                      </span>
                    </div>

                    <AnimatePresence>
                      {entry.status === 'notified' && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-0.5 rounded-md"
                        >
                          <CheckCircle size={12} /> Notified via WhatsApp
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                  {entry.status === 'waiting' && (
                    <Button 
                      onClick={() => handleNotify(entry.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none gap-2 h-9 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Bell size={14} /> Notify
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => onSeatCustomer(entry)}
                    size="sm"
                    className="flex-1 sm:flex-none gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <CheckCircle size={14} /> Seat
                  </Button>

                  <Button 
                    onClick={() => {
                      if(confirm("Cancel this waitlist entry?")) {
                        handleStatusChange(entry.id, 'cancelled');
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Cancel Walk-in"
                  >
                    <X size={16} />
                  </Button>
                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
