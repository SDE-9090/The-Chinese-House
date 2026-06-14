import { motion } from "framer-motion";
import { ShoppingBag, TrendingUp, DollarSign, XCircle } from "lucide-react";
import type { Order } from "@/lib/apiClient";

interface StatsBarProps {
  orders: Order[];
}

const StatsBar = ({ orders }: StatsBarProps) => {
  const activeOrders = orders.filter((o) =>
    ["new", "preparing", "ready"].includes(o.status)
  ).length;

  const completedOrders = orders.filter(
    (o) => o.status === "completed"
  ).length;

  const cancelledOrders = orders.filter(
    (o) => o.status === "cancelled"
  ).length;

  // ✅ SAFE MONEY CALCULATION (IN PAISE)
  const totalSalesPaise = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => {
      return sum + Math.round(o.total * 100); // convert ₹ → paise safely
    }, 0);

  // convert back to rupees
  const totalSales = totalSalesPaise / 100;

  const formattedRevenue = totalSales.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const stats = [
    {
      value: activeOrders,
      label: "Active",
      icon: ShoppingBag,
      gradient: "from-primary/10 to-primary/5",
    },
    {
      value: completedOrders,
      label: "Completed",
      icon: TrendingUp,
      gradient: "from-accent/10 to-accent/5",
    },
    {
      value: cancelledOrders,
      label: "Cancelled",
      icon: XCircle,
      gradient: "from-destructive/10 to-destructive/5",
    },
    {
      value: `₹${formattedRevenue}`,
      label: "Revenue",
      icon: DollarSign,
      gradient: "from-emerald-500/10 to-emerald-500/5",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${stat.gradient} border border-border/50 rounded-2xl p-4 text-center`}
        >
          <stat.icon size={18} className="mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;