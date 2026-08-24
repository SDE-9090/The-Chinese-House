import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Smartphone, MonitorPlay, BarChart3, ChevronRight, ShieldCheck, CheckCircle2, LayoutDashboard, MonitorSmartphone, Receipt, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    // We could fetch real tiers here from the public API if we had one.
    // For the landing page, hardcoding visually is fine for maximum speed, 
    // or we can mock it here to match the database exactly.
    setTiers([
      { name: "free", price: 0, limit: "1k", features: ["POS System", "Kitchen Display", "Manual Orders"] },
      { name: "pro", price: 2999, limit: "5k", features: ["Everything in Free", "QR Digital Ordering", "Advanced Analytics", "Customer Reviews"] },
      { name: "enterprise", price: 8999, limit: "Unlimited", features: ["Everything in Pro", "Website CMS", "Coupon Engine", "Priority Support"] }
    ]);
  }, []);

  const handleDemoLogin = () => {
    const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    
    if (isLocal) {
        window.location.href = `${protocol}//the-chinese-house.localhost${port}/`;
    } else {
        // In production, we assume the classic-chinese.app root domain
        window.location.href = `https://the-chinese-house.classic-chinese.app/`;
    }
  };

  const handleSuperAdmin = () => {
    navigate("/super");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ClassicOS</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleDemoLogin} className="hidden sm:flex text-zinc-300 hover:text-white hover:bg-white/5">
              Sign In
            </Button>
            <Button onClick={handleDemoLogin} className="bg-white text-black hover:bg-zinc-200 font-bold rounded-full px-6">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-8"
          >
            <ShieldCheck className="w-4 h-4" /> Built for modern restaurants
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-8 max-w-4xl leading-[1.1]"
          >
            Ditch the paper tickets. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400">Digitize your dine-in.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12"
          >
            Everything you need to run your restaurant—POS, QR Ordering, Kitchen Displays, and Analytics—in one seamlessly connected platform.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button onClick={handleDemoLogin} size="lg" className="h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-lg w-full sm:w-auto">
              View Live Demo <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button onClick={handleSuperAdmin} size="lg" variant="outline" className="h-14 px-8 rounded-full border-zinc-700 hover:bg-zinc-800 hover:text-white font-bold text-lg w-full sm:w-auto text-zinc-300">
              God View (Admin)
            </Button>
          </motion.div>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent z-10 h-full w-full" />
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm shadow-2xl overflow-hidden">
            <div className="rounded-xl border border-white/5 bg-black overflow-hidden relative aspect-[16/9] flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 w-full h-full p-8 opacity-40">
                <div className="col-span-2 space-y-4">
                  <div className="h-12 bg-white/5 rounded-lg w-full" />
                  <div className="h-48 bg-white/5 rounded-lg w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-white/5 rounded-lg w-full" />
                    <div className="h-32 bg-white/5 rounded-lg w-full" />
                  </div>
                </div>
                <div className="col-span-1 space-y-4">
                  <div className="h-full bg-indigo-500/10 border border-indigo-500/20 rounded-lg w-full" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <MonitorSmartphone className="w-16 h-16 text-indigo-400 mb-4 opacity-50" />
                 <p className="text-zinc-500 font-medium">Interactive Demo Interface</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 border-t border-white/5 bg-zinc-950/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white">The complete ecosystem.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Stop duct-taping different software together. ClassicOS provides everything natively.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:bg-zinc-900/80"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{feat.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white">Simple, transparent pricing.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Pay as you grow. No hidden fees or surprise charges.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`p-8 rounded-3xl border ${tier.name === 'pro' ? 'bg-indigo-600/10 border-indigo-500/50 relative overflow-hidden' : 'bg-zinc-900/50 border-white/10'} flex flex-col`}
              >
                {tier.name === 'pro' && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                )}
                <h3 className="text-2xl font-bold capitalize mb-2 text-white flex items-center justify-between">
                  {tier.name}
                  {tier.name === 'pro' && <span className="text-xs font-black uppercase tracking-wider bg-indigo-500 text-white px-3 py-1 rounded-full">Most Popular</span>}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">₹{tier.price}</span>
                  <span className="text-zinc-500">/mo</span>
                </div>
                
                <div className="bg-black/20 rounded-xl p-4 mb-8 border border-white/5">
                  <div className="text-sm font-semibold text-zinc-300 mb-1">Monthly Order Limit</div>
                  <div className="text-xl font-black text-white">{tier.limit} Orders</div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {tier.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${tier.name === 'pro' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <span className="text-zinc-300">{f}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleDemoLogin}
                  className={`w-full h-12 rounded-xl font-bold text-base ${tier.name === 'pro' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 relative z-10 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-indigo-500" />
            <span className="text-lg font-bold text-white">ClassicOS</span>
          </div>
          <p className="text-zinc-500 text-sm">© {new Date().getFullYear()} ClassicOS. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <button onClick={handleSuperAdmin} className="hover:text-white transition-colors text-zinc-700">Admin Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
