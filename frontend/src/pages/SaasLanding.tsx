import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Smartphone, MonitorPlay, BarChart3, ChevronRight, ShieldCheck, CheckCircle2, LayoutDashboard, MonitorSmartphone, Receipt, Users, ArrowRight, TrendingUp, ChevronDown, Sparkles, Plus, Search, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from "@/components/ThemeToggle";
import { API_URL } from '@/lib/apiClient';
import { Loader2 } from 'lucide-react';

const FEATURES = [
  {
    icon: MonitorSmartphone,
    title: "Lightning Fast POS",
    description: "Built for speed during rush hours. Processes orders in seconds with zero lag."
  },
  {
    icon: Smartphone,
    title: "QR Digital Ordering",
    description: "Customers order & pay directly from their phones. Waitstaff focus on hospitality, not order taking."
  },
  {
    icon: MonitorPlay,
    title: "Smart Kitchen Display",
    description: "Real-time ticket routing. No more lost paper tickets or missed modifications."
  },
  {
    icon: BarChart3,
    title: "God-Mode Analytics",
    description: "Track revenue, staff performance, and top-selling items from anywhere in the world."
  }
];

export default function SaasLanding() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pos'>('overview');
  const [posCart, setPosCart] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  
  const [contactInfo, setContactInfo] = useState({ contact_email: "", contact_phone: "" });
  const [formData, setFormData] = useState({ name: "", restaurant_name: "", email: "", phone: "", message: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSendToKitchen = () => {
    if (posCart.length === 0) return;
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);

      setTimeout(() => {
        setSendSuccess(false);
        setPosCart([]);
      }, 1500);
    }, 1200);
  };

  useEffect(() => {
    // We could fetch real tiers here from the public API if we had one.
    // For the landing page, hardcoding visually is fine for maximum speed, 
    // or we can mock it here to match the database exactly.
    setTiers([
      { name: "free", price: 0, limit: "1k", features: ["POS System", "Kitchen Display", "Manual Orders"] },
      { name: "pro", price: 2999, limit: "5k", features: ["Everything in Free", "QR Digital Ordering", "Advanced Analytics", "Customer Reviews"] },
      { name: "enterprise", price: 8999, limit: "Unlimited", features: ["Everything in Pro", "Website CMS", "Coupon Engine", "Priority Support"] }
    ]);

    // Fetch SAAS Contact Info
    const fetchContactInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/public/saas-settings`);
        const data = await res.json();
        if (data) setContactInfo(data);
      } catch (err) {
        console.error("Failed to fetch saas settings", err);
      }
    };
    fetchContactInfo();
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("submitting");
    try {
      const res = await fetch(`${API_URL}/public/saas-enquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to submit");
      setFormStatus("success");
      setFormData({ name: "", restaurant_name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error("Failed to submit enquiry", err);
      setFormStatus("error");
    }
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0B] text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative transition-colors duration-300">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 dark:bg-violet-600/20 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ClassicOS</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it works</a>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={scrollToPricing} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold rounded-full px-6">
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-8"
          >
            <ShieldCheck className="w-4 h-4" /> Built for modern restaurants
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-8 max-w-4xl leading-[1.1] text-slate-900 dark:text-white"
          >
            Ditch the paper tickets. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400">Digitize your dine-in.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mb-12"
          >
            Everything you need to run your restaurant—POS, QR Ordering, Kitchen Displays, and Analytics—in one seamlessly connected platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button onClick={scrollToPricing} size="lg" className="h-14 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold text-lg w-full sm:w-auto">
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-20 relative mx-auto max-w-5xl px-4 sm:px-0"
        >
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 p-2 sm:p-3 backdrop-blur-sm shadow-2xl relative z-10">
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A0A0B] overflow-hidden relative h-[550px] sm:h-auto sm:aspect-[16/10] flex text-left shadow-inner">

              {/* Real-looking Sidebar */}
              <div className="hidden sm:flex sm:w-64 border-r border-slate-100 dark:border-white/5 p-3 sm:p-4 flex-col gap-2 sm:gap-4 bg-slate-50/50 dark:bg-transparent">
                <div className="flex items-center gap-3 mb-2 sm:mb-6 px-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 shadow-md shadow-indigo-500/20 flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="font-bold text-slate-800 dark:text-white leading-tight">ClassicOS</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer hover:text-indigo-500">
                      Downtown Branch <ChevronDown className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('overview')}
                  className={`h-10 sm:h-11 w-full rounded-xl flex items-center justify-center sm:justify-start px-0 sm:px-3 border transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-transparent border-transparent opacity-80 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  <LayoutDashboard className={`w-5 h-5 sm:mr-3 ${activeTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span className={`hidden sm:block text-sm font-semibold ${activeTab === 'overview' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-zinc-300'}`}>Overview</span>
                </div>

                <div
                  onClick={() => setActiveTab('pos')}
                  className={`h-10 sm:h-11 w-full rounded-xl flex items-center justify-center sm:justify-start px-0 sm:px-3 border transition-all cursor-pointer ${activeTab === 'pos' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-transparent border-transparent opacity-80 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  <Receipt className={`w-5 h-5 sm:mr-3 ${activeTab === 'pos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span className={`hidden sm:block text-sm font-semibold ${activeTab === 'pos' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-zinc-300'}`}>Live Orders / POS</span>
                </div>

                <div className="h-10 sm:h-11 w-full bg-transparent rounded-xl flex items-center justify-center sm:justify-start px-0 sm:px-3 opacity-80 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-not-allowed">
                  <Users className="w-5 h-5 text-slate-500 dark:text-zinc-400 sm:mr-3" />
                  <span className="hidden sm:block text-sm font-medium text-slate-600 dark:text-zinc-300">Customers</span>
                </div>
              </div>

              {/* Real-looking Main Content */}
              <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 lg:gap-8 bg-[#F8FAFC] dark:bg-black/20 overflow-hidden relative">
                {/* Header */}
                <div className="flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                      {activeTab === 'overview' ? "Today's Performance" : "Point of Sale"}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">Tuesday, October 24th</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-1.5 rounded-full shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">System Online</span>
                    </div>
                    <div className="h-9 w-9 sm:h-10 sm:w-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                      A
                    </div>
                  </div>
                </div>

                {activeTab === 'overview' ? (
                  <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
                      {[
                        { label: "Total Revenue", value: "₹45,231", icon: <TrendingUp className="w-4 h-4" />, bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", trend: "+12%" },
                        { label: "Active Orders", value: "24", icon: <Receipt className="w-4 h-4" />, bg: "bg-indigo-100 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", trend: "+4" },
                        { label: "Avg Ticket Size", value: "₹850", icon: <div className="w-2 h-2 rounded-full bg-slate-400" />, bg: "bg-slate-100 dark:bg-slate-500/20", text: "text-slate-600 dark:text-slate-400", trend: "-" },
                        { label: "Total Customers", value: "142", icon: <Users className="w-4 h-4" />, bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", trend: "+18%" }
                      ].map((stat, i) => (
                        <div key={i} className={`h-24 sm:h-28 bg-white dark:bg-zinc-900/60 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${i === 3 ? 'hidden sm:flex' : ''}`}>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400">{stat.label}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.bg} ${stat.text}`}>
                              {stat.icon}
                            </div>
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{stat.value}</span>
                            {stat.trend !== "-" && (
                              <span className={`text-xs font-bold mb-1 ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {stat.trend}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Main Area: Chart & Orders */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
                      <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900/60 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 sm:p-5 flex flex-col gap-3 shadow-sm relative overflow-hidden">
                        {/* AI Insight Widget */}
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3 flex items-start sm:items-center gap-3 shrink-0">
                          <div className="bg-indigo-500 text-white rounded-full p-1.5 shrink-0 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-snug">
                            <span className="font-bold">AI Insight:</span> Dim Sum demand spikes 30% on Fridays. We recommend ordering +15% more inventory today.
                          </p>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Hourly Revenue</h3>
                          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Today</span>
                        </div>
                        <div className="flex-1 flex items-end gap-2 sm:gap-3 w-full relative">
                          {/* Fake Chart Lines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                            <div className="w-full border-b border-slate-800 dark:border-white" />
                            <div className="w-full border-b border-slate-800 dark:border-white" />
                            <div className="w-full border-b border-slate-800 dark:border-white" />
                          </div>
                          {[30, 45, 35, 60, 50, 85, 70, 95, 65, 80, 100, 75].map((h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: "20%" }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 2, delay: i * 0.05, repeat: Infinity, repeatType: 'reverse', repeatDelay: 1 }}
                              className={`flex-1 rounded-t-sm sm:rounded-t-md z-10 transition-all duration-300 ${i === 7 || i === 10 ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-indigo-300 dark:bg-indigo-500/50'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="col-span-1 lg:col-span-1 bg-white dark:bg-zinc-900/60 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 sm:p-5 flex flex-col gap-3 shadow-sm overflow-hidden max-h-[250px] lg:max-h-full">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 shrink-0">Recent Orders</h3>
                        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                          {[
                            { table: "T4", item: "Kung Pao Chicken", price: "₹450", bg: "bg-indigo-500", text: "text-white", border: "border-indigo-600", dot: "bg-indigo-500", status: "Cooking" },
                            { table: "T7", item: "Spring Rolls", price: "₹180", bg: "bg-amber-500", text: "text-white", border: "border-amber-600", dot: "bg-amber-500", status: "Served" },
                            { table: "T2", item: "Dim Sum Basket", price: "₹620", bg: "bg-rose-500", text: "text-white", border: "border-rose-600", dot: "bg-rose-500", status: "New" },
                            { table: "T9", item: "Hakka Noodles", price: "₹250", bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600", dot: "bg-emerald-500", status: "Paid" },
                            { table: "T1", item: "Manchow Soup", price: "₹150", bg: "bg-sky-500", text: "text-white", border: "border-sky-600", dot: "bg-sky-500", status: "Cooking" },
                            { table: "T5", item: "Peking Duck", price: "₹1200", bg: "bg-purple-500", text: "text-white", border: "border-purple-600", dot: "bg-purple-500", status: "New" },
                            { table: "T3", item: "Fried Rice", price: "₹220", bg: "bg-orange-500", text: "text-white", border: "border-orange-600", dot: "bg-orange-500", status: "Served" },
                            { table: "T8", item: "Chop Suey", price: "₹340", bg: "bg-cyan-500", text: "text-white", border: "border-cyan-600", dot: "bg-cyan-500", status: "Cooking" }
                          ].map((order, i) => (
                            <div key={i} className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 p-2.5 sm:p-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm group shrink-0">
                              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${order.bg} flex-shrink-0 flex items-center justify-center ${order.text} font-black text-xs border ${order.border} shadow-md group-hover:scale-105 transition-transform`}>
                                {order.table}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{order.item}</p>
                                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${order.dot}`} />
                                  {order.status} • {i === 0 ? 'Just now' : `${i * 2 + 1}m ago`}
                                </p>
                              </div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">
                                {order.price}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex gap-4 sm:gap-6 min-h-0 overflow-hidden">
                    {/* POS Items Grid */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pb-4">
                        {[
                          { id: 1, name: "Kung Pao Chicken", price: 450, category: "Main", img: "bg-red-100 dark:bg-red-500/20" },
                          { id: 2, name: "Dim Sum Basket", price: 620, category: "Starter", img: "bg-amber-100 dark:bg-amber-500/20" },
                          { id: 3, name: "Spring Rolls", price: 180, category: "Starter", img: "bg-orange-100 dark:bg-orange-500/20" },
                          { id: 4, name: "Hakka Noodles", price: 250, category: "Noodles", img: "bg-emerald-100 dark:bg-emerald-500/20" },
                          { id: 5, name: "Manchow Soup", price: 150, category: "Soup", img: "bg-sky-100 dark:bg-sky-500/20" },
                          { id: 6, name: "Peking Duck", price: 1200, category: "Main", img: "bg-purple-100 dark:bg-purple-500/20" },
                          { id: 7, name: "Fried Rice", price: 220, category: "Main", img: "bg-lime-100 dark:bg-lime-500/20" },
                          { id: 8, name: "Chop Suey", price: 340, category: "Main", img: "bg-cyan-100 dark:bg-cyan-500/20" },
                          { id: 9, name: "Chilli Paneer", price: 280, category: "Starter", img: "bg-pink-100 dark:bg-pink-500/20" }
                        ].map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setPosCart([...posCart, item])}
                            className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group flex flex-col h-full"
                          >
                            <div className={`w-full aspect-video rounded-lg ${item.img} mb-2 flex items-center justify-center overflow-hidden relative`}>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                              <ChefHat className="w-6 h-6 text-black/20 dark:text-white/20" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.name}</p>
                              <div className="flex justify-between items-end mt-2">
                                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{item.category}</span>
                                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">₹{item.price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* POS Cart Sidebar */}
                    <div className="w-48 sm:w-64 bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col shadow-sm shrink-0 overflow-hidden hidden sm:flex">
                      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">Current Order</span>
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded-full">Table 4</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
                        {posCart.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 px-2 py-8">
                            <Receipt className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-xs font-medium text-slate-500">Tap items on the left to add to order.</p>
                          </div>
                        ) : (
                          posCart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm group">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-4 h-4 bg-slate-100 dark:bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">1</div>
                                <span className="text-slate-700 dark:text-zinc-300 font-medium truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-slate-800 dark:text-white">₹{item.price}</span>
                                <X
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newCart = [...posCart];
                                    newCart.splice(idx, 1);
                                    setPosCart(newCart);
                                  }}
                                  className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer hidden group-hover:block transition-colors"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="text-slate-500 dark:text-zinc-400 font-medium">Subtotal</span>
                          <span className="text-slate-700 dark:text-zinc-300 font-bold">₹{posCart.reduce((sum, i) => sum + i.price, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3 text-sm">
                          <span className="text-slate-500 dark:text-zinc-400 font-medium">Taxes</span>
                          <span className="text-slate-700 dark:text-zinc-300 font-bold">₹{Math.round(posCart.reduce((sum, i) => sum + i.price, 0) * 0.05)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-base">
                          <span className="text-slate-800 dark:text-white font-black">Total</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg">₹{Math.round(posCart.reduce((sum, i) => sum + i.price, 0) * 1.05)}</span>
                        </div>
                        <Button
                          onClick={handleSendToKitchen}
                          disabled={posCart.length === 0 || isSending || sendSuccess}
                          className={`w-full font-bold h-10 shadow-md transition-all ${sendSuccess
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                        >
                          {isSending ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </span>
                          ) : sendSuccess ? (
                            "Sent! ✅"
                          ) : (
                            "Send to Kitchen"
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Flying Ticket Animation */}
                    <AnimatePresence>
                      {isSending && (
                        <motion.div
                          initial={{ opacity: 0, x: 0, y: 0, scale: 0.5, rotate: 0 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            x: [0, -200, -500, -800],
                            y: [0, -50, 20, 100],
                            scale: [0.5, 1.2, 1, 0.5],
                            rotate: [0, -10, 10, -20]
                          }}
                          transition={{ duration: 1.2, ease: "easeInOut" }}
                          className="absolute right-10 bottom-10 z-[100] bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-zinc-700 flex flex-col items-center justify-center pointer-events-none"
                        >
                          <Receipt className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-1" />
                          <span className="text-[10px] font-black text-slate-800 dark:text-white">ORDER #492</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Notification Pills - MOVED OUTSIDE CLIPPING CONTAINER */}
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:flex absolute -right-12 top-24 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl p-4 items-center gap-4 backdrop-blur-xl z-30"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/30">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="text-left pr-2">
              <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-tight">New Order</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">₹850 • Table 4</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [5, -5, 5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:flex absolute -left-12 bottom-32 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-2xl p-4 items-center gap-4 backdrop-blur-xl z-30"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-left pr-2">
              <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-tight">Revenue Spike</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">+24% vs last hour</p>
            </div>
          </motion.div>

          {/* Tablet Mockup - KDS */}
          <motion.div
            initial={{ opacity: 0, x: 20, rotate: -10 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="hidden xl:flex absolute -left-32 top-8 w-72 h-[380px] bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] z-0 overflow-hidden flex-col"
          >
            <div className="p-3 border-b border-slate-800 bg-black/40 flex justify-between items-center text-white shrink-0">
              <span className="font-bold text-sm flex items-center gap-2"><MonitorPlay className="w-4 h-4 text-orange-500" /> Kitchen Display</span>
              <span className="text-[10px] bg-red-500 px-2 py-0.5 rounded-full font-black animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]">4 RUSH</span>
            </div>
            <div className="flex-1 p-3 grid grid-cols-2 gap-3 bg-[#0A0A0B] overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`rounded-xl border p-2.5 flex flex-col gap-2 relative overflow-hidden ${i === 1 || i === 2 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-800 bg-slate-800/30'}`}>
                  {i === 1 && <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />}
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-xs">T{i * 3}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${i === 1 || i === 2 ? 'bg-red-500 text-white' : 'text-slate-400 bg-slate-800'}`}>{i * 4}m</span>
                  </div>
                  <div className="space-y-1.5 mt-1">
                    <div className="h-1.5 w-full bg-white/20 rounded-full" />
                    <div className="h-1.5 w-[85%] bg-white/20 rounded-full" />
                    {i % 2 === 0 && <div className="h-1.5 w-[60%] bg-white/20 rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Trusted By Marquee */}
      <section className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black overflow-hidden relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center mb-8">
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Powering over 10,000+ orders daily across India</p>
        </div>

        {/* Marquee Container */}
        <div className="relative w-full flex overflow-x-hidden">
          {/* Gradient Masks for smooth fade on edges */}
          <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-white dark:from-black to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-white dark:from-black to-transparent z-10" />

          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex flex-nowrap items-center gap-12 sm:gap-24 px-12 shrink-0 w-max"
          >
            {[
              "The Chinese House", "Spicy Dragon", "Mumbai Spice", "Noodle Bowl", "Dim Sum Delight", "Wok & Roll", "Golden Dragon",
              // Duplicate for seamless loop
              "The Chinese House", "Spicy Dragon", "Mumbai Spice", "Noodle Bowl", "Dim Sum Delight", "Wok & Roll", "Golden Dragon"
            ].map((name, i) => (
              <div key={i} className="text-xl sm:text-2xl font-black text-slate-300 dark:text-zinc-800 shrink-0 uppercase tracking-wider">
                {name}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Helps Workflow */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-zinc-950 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">How ClassicOS transforms your restaurant.</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">A seamless flow from the customer's phone to the kitchen, and straight into your pocket.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Customer Orders", desc: "Guests scan a QR code at their table to view the beautiful digital menu and order instantly without waiting for a waiter.", icon: <Smartphone className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />, bg: "bg-indigo-50 dark:bg-indigo-500/10" },
              { step: "2", title: "Kitchen Cooks", desc: "The order routes immediately to the Kitchen Display System. Chefs see what to cook and how long it's been waiting.", icon: <MonitorPlay className="w-8 h-8 text-rose-500 dark:text-rose-400" />, bg: "bg-rose-50 dark:bg-rose-500/10" },
              { step: "3", title: "You Grow", desc: "Every transaction, inventory update, and table turnover is synced to your admin dashboard in real-time.", icon: <TrendingUp className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />, bg: "bg-emerald-50 dark:bg-emerald-500/10" }
            ].map((workflow, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative p-8 rounded-3xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 flex flex-col items-center text-center shadow-sm"
              >
                <div className={`w-16 h-16 rounded-2xl ${workflow.bg} flex items-center justify-center mb-6 relative z-10`}>
                  {workflow.icon}
                </div>
                <div className="absolute top-4 left-6 text-6xl font-black text-slate-100 dark:text-white/5 select-none pointer-events-none">0{workflow.step}</div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">{workflow.title}</h3>
                <p className="text-slate-600 dark:text-zinc-400 relative z-10">{workflow.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">The complete ecosystem.</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">Stop duct-taping different software together. ClassicOS provides everything natively.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 rounded-3xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-zinc-900/80"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{feat.title}</h3>
                <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hardware Agnostic Showcase */}
      <section className="py-24 px-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6 text-slate-900 dark:text-white">Use the hardware you already own.</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg mb-8">No need to buy expensive, proprietary POS terminals. ClassicOS runs perfectly on any iPad, Android tablet, Windows laptop, or even your smartphone. Zero upfront hardware costs.</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-4 py-2 rounded-lg font-bold text-slate-700 dark:text-zinc-300">
                <MonitorSmartphone className="w-5 h-5 text-indigo-500" /> Tablets
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-4 py-2 rounded-lg font-bold text-slate-700 dark:text-zinc-300">
                <Smartphone className="w-5 h-5 text-rose-500" /> Phones
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 px-4 py-2 rounded-lg font-bold text-slate-700 dark:text-zinc-300">
                <MonitorPlay className="w-5 h-5 text-emerald-500" /> Laptops
              </div>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 rounded-full blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-3xl p-4 border-4 border-slate-800 aspect-square flex flex-col shadow-2xl">
                <div className="flex-1 bg-[#0A0A0B] rounded-xl flex items-center justify-center p-4">
                  <div className="w-full h-full bg-slate-800/50 rounded-lg flex flex-col p-3 gap-2">
                    <div className="h-4 w-1/2 bg-slate-700 rounded" />
                    <div className="grid grid-cols-2 gap-2 flex-1 mt-2">
                      <div className="bg-indigo-500/20 rounded" />
                      <div className="bg-indigo-500/20 rounded" />
                      <div className="bg-indigo-500/20 rounded" />
                      <div className="bg-indigo-500/20 rounded" />
                    </div>
                  </div>
                </div>
                <div className="text-center mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest">iPad / Android</div>
              </div>
              <div className="grid grid-rows-2 gap-4">
                <div className="bg-slate-900 rounded-3xl p-3 border-4 border-slate-800 flex flex-col shadow-xl">
                  <div className="flex-1 bg-[#0A0A0B] rounded-lg flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
                  </div>
                  <div className="text-center mt-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Mobile</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-xl flex items-center justify-center flex-col gap-2">
                  <MonitorPlay className="w-8 h-8 text-indigo-500" />
                  <span className="font-bold text-slate-800 dark:text-white text-sm">Desktop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-zinc-950 relative z-10 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">Why switch to ClassicOS?</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">See how we stack up against traditional, legacy systems.</p>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-100 dark:bg-black/40 border-b border-slate-200 dark:border-white/10 p-6">
              <div className="font-bold text-slate-500 dark:text-zinc-400">Feature</div>
              <div className="font-black text-slate-800 dark:text-white text-center">Traditional POS</div>
              <div className="font-black text-indigo-600 dark:text-indigo-400 text-center">ClassicOS</div>
            </div>
            {[
              { f: "Upfront Hardware Cost", o: "₹50,000+", c: "₹0 (Use your own devices)" },
              { f: "3rd Party Commissions", o: "Up to 30%", c: "0% Flat" },
              { f: "System Updates", o: "Paid, requires technician", c: "Free, automatic cloud updates" },
              { f: "Kitchen Display System", o: "Extra ₹15,000 setup", c: "Included in every plan" },
              { f: "Remote Access", o: "Store only", c: "Access anywhere via mobile" }
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 p-6 items-center ${i !== 4 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                <div className="font-semibold text-slate-800 dark:text-zinc-200 text-sm sm:text-base">{row.f}</div>
                <div className="text-center flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400 font-medium text-sm sm:text-base">
                  <X className="w-4 h-4 hidden sm:block" /> {row.o}
                </div>
                <div className="text-center flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 hidden sm:block" /> {row.c}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">Got questions?</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg">Everything you need to know about the product.</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { q: "Do I need to buy special hardware?", a: "No! ClassicOS runs in the browser or as a PWA, meaning you can use any iPad, Android tablet, smartphone, or Windows PC you already own." },
              { q: "How long does it take to set up?", a: "You can be fully set up in under 15 minutes. Just upload your menu, connect your Stripe account, and start taking orders instantly." },
              { q: "What happens if my internet goes down?", a: "ClassicOS has a robust offline mode for the POS. It will continue taking orders and sync them to the cloud automatically once your connection is restored." },
              { q: "Am I locked into a contract?", a: "Never. We believe in earning your business every month. You can cancel your subscription at any time with zero penalty." }
            ].map((faq, i) => (
              <div
                key={i}
                className="border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-6 flex justify-between items-center focus:outline-none"
                >
                  <span className="font-bold text-slate-900 dark:text-white text-lg">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-indigo-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-slate-600 dark:text-zinc-400">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">Simple, transparent pricing.</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">Pay as you grow. No hidden fees or surprise charges.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`p-8 rounded-3xl border ${tier.name === 'pro' ? 'bg-indigo-50 dark:bg-indigo-600/10 border-indigo-500/50 relative overflow-hidden' : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/10'} flex flex-col`}
              >
                {tier.name === 'pro' && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                )}
                <h3 className="text-2xl font-bold capitalize mb-2 text-slate-900 dark:text-white flex items-center justify-between">
                  {tier.name}
                  {tier.name === 'pro' && <span className="text-xs font-black uppercase tracking-wider bg-indigo-500 text-white px-3 py-1 rounded-full">Most Popular</span>}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₹{tier.price}</span>
                  <span className="text-slate-500 dark:text-zinc-500">/mo</span>
                </div>

                <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 mb-8 border border-slate-200 dark:border-white/5">
                  <div className="text-sm font-semibold text-slate-600 dark:text-zinc-300 mb-1">Monthly Order Limit</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">{tier.limit} Orders</div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {tier.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${tier.name === 'pro' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                      <span className="text-slate-600 dark:text-zinc-300">{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={scrollToPricing}
                  className={`w-full h-12 rounded-xl font-bold text-base ${tier.name === 'pro' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'}`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Sales / Support Section */}
      <section className="py-24 px-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 relative z-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900/80 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col md:flex-row">
           <div className="w-full md:w-2/5 bg-indigo-600 dark:bg-indigo-900 p-8 sm:p-12 text-white flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black mb-4">Let's talk.</h3>
                <p className="text-indigo-100 mb-8 opacity-90">Ready to digitize your restaurant? Fill out the form and our team will get back to you within 24 hours.</p>
                <div className="space-y-4">
                  {contactInfo.contact_email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="font-medium text-sm sm:text-base text-indigo-50">{contactInfo.contact_email}</span>
                    </div>
                  )}
                  {contactInfo.contact_phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-indigo-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <span className="font-medium text-sm sm:text-base text-indigo-50">{contactInfo.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>
           </div>
           <div className="w-full md:w-3/5 p-8 sm:p-12">
              {formStatus === "success" ? (
                 <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                       <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-600 dark:text-zinc-400">Thank you for your interest. Our sales team will contact you shortly.</p>
                 </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="John Doe" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Restaurant Name</label>
                        <input required type="text" value={formData.restaurant_name} onChange={e => setFormData({...formData, restaurant_name: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Golden Dragon" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Email</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="john@example.com" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Phone</label>
                        <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="+91 99999 99999" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Message (Optional)</label>
                     <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none dark:text-white" placeholder="Tell us about your requirements..."></textarea>
                  </div>
                  {formStatus === "error" && (
                    <p className="text-red-500 text-sm font-medium">Failed to submit. Please try again.</p>
                  )}
                  <Button type="submit" disabled={formStatus === "submitting"} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base mt-4 transition-all">
                    {formStatus === "submitting" ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</> : "Submit Enquiry"}
                  </Button>
                </form>
              )}
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 dark:border-white/10 relative z-10 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-indigo-500" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">ClassicOS</span>
          </div>
          <p className="text-slate-500 dark:text-zinc-500 text-sm">© {new Date().getFullYear()} ClassicOS. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-zinc-500">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
