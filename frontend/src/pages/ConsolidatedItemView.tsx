import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import type { KitchenOrder } from "@/lib/apiClient";

export function ConsolidatedItemView({
  orders,
  onMarkMultipleReady,
  isMarking
}: {
  orders: KitchenOrder[];
  onMarkMultipleReady: (instances: {orderId: string, itemId: string}[]) => void;
  isMarking: boolean;
}) {
  const consolidated = useMemo(() => {
    const map = new Map<string, { name: string, note: string, total: number, instances: any[] }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.status === "ready") return;
        const key = `${item.name}|${item.note || ''}`;
        if (!map.has(key)) {
          map.set(key, { name: item.name, note: item.note || '', total: 0, instances: [] });
        }
        const entry = map.get(key)!;
        entry.total += item.quantity;
        entry.instances.push({
          orderId: order.id,
          itemId: item.id,
          quantity: item.quantity,
          customerName: order.customerName,
          token: order.token,
          elapsedMins: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  if (consolidated.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl py-12 text-center shadow-sm">
        <Package size={36} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-lg font-semibold text-muted-foreground">No pending items</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence>
        {consolidated.map((group) => {
          const isOverdue = group.instances.some(i => i.elapsedMins >= 10);
          const isWarning = group.instances.some(i => i.elapsedMins >= 5);
          const borderColor = isOverdue ? "border-destructive/60" : isWarning ? "border-amber-500/50" : "border-border";
          const bgColor = isOverdue ? "bg-destructive/5" : isWarning ? "bg-amber-500/5" : "bg-card";

          return (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={`${group.name}-${group.note}`}
              className={`border-2 rounded-2xl p-4 flex flex-col justify-between ${borderColor} ${bgColor}`}
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-lg leading-tight">{group.name}</h3>
                  <div className="bg-primary text-primary-foreground font-black text-xl px-3 py-1 rounded-xl shadow-sm shrink-0">
                    x{group.total}
                  </div>
                </div>
                {group.note && (
                  <p className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md inline-block mb-3">
                    Note: {group.note}
                  </p>
                )}
                
                <div className="space-y-1.5 mt-2 mb-4">
                  {group.instances.map((inst, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-background/50 rounded p-1.5 border border-border/50">
                      <span className="font-medium truncate mr-2">
                        <span className="text-muted-foreground">#{inst.token}</span> {inst.customerName}
                      </span>
                      <span className="font-bold shrink-0">x{inst.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={isMarking}
                onClick={() => onMarkMultipleReady(group.instances)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isMarking ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Mark All Ready
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
