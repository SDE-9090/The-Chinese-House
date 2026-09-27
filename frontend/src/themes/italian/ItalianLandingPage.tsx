import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Clock, Phone, Utensils, Star, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

const ItalianLandingPage = () => {
  const { settings } = useBusinessSettings();
  const content = settings?.landingPageContent;
  const businessName = settings?.restaurantName || "Modern Italian Cafe";

  return (
    <div className="bg-background text-foreground font-theme-body min-h-screen selection:bg-primary/20">
      
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="font-theme-heading text-2xl font-bold tracking-tight text-primary">
            {businessName}
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
            <a href="#about" className="hover:text-primary transition-colors">La Storia</a>
            <a href="#menu" className="hover:text-primary transition-colors">Il Menu</a>
            <a href="#visit" className="hover:text-primary transition-colors">Visita</a>
          </div>
          <Link 
            to="/order" 
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-theme font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Order Online
          </Link>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 z-10"
          >
            <span className="text-primary font-semibold tracking-widest uppercase text-sm">
              Autentico sapore italiano
            </span>
            <h1 className="font-theme-heading text-5xl md:text-7xl font-bold leading-[1.1] text-foreground">
              Taste the True <br className="hidden md:block"/>
              Soul of <span className="text-primary italic">Italy.</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-md leading-relaxed">
              Handcrafted pasta, wood-fired pizza, and an atmosphere that feels like a warm Roman evening.
            </p>
            <div className="pt-4 flex items-center gap-4">
              <Link 
                to="/order" 
                className="bg-primary text-primary-foreground px-8 py-4 rounded-theme font-semibold hover:-translate-y-1 transition-transform flex items-center gap-2"
              >
                View Menu <ArrowRight size={18} />
              </Link>
              <a href="#visit" className="px-8 py-4 font-semibold text-foreground hover:text-primary transition-colors">
                Find Us
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-[2rem] -rotate-3 scale-105" />
            <img 
              src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=1200" 
              alt="Fresh Italian Food"
              className="relative w-full h-[500px] object-cover rounded-[2rem] shadow-2xl"
            />
            
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-background p-6 rounded-theme shadow-xl border border-border flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Utensils size={24} />
              </div>
              <div>
                <p className="font-theme-heading font-bold text-lg">{content?.italian_hero_badge_title || "100% Fresh"}</p>
                <p className="text-sm text-muted-foreground">{content?.italian_hero_badge_subtitle || "Made daily in-house"}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── ABOUT SECTION (MASONRY-LIKE) ─── */}
      <section id="about" className="py-24 bg-card px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16 items-center">
            <div className="md:col-span-5 space-y-6">
              <h2 className="font-theme-heading text-4xl md:text-5xl font-bold">
                {content?.italian_history_title || "La Nostra Storia"}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {content?.italian_history_desc || "Born from a passion for authentic Italian culinary traditions. We bring the vibrant flavors of the Mediterranean to your table. Every dish is a testament to our dedication to quality, using only the finest imported olive oils, tomatoes, and locally sourced fresh ingredients."}
              </p>
              <div className="pt-4 grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-3xl text-primary font-theme-heading mb-1">{content?.italian_stats_years || "10+"}</h4>
                  <p className="text-sm text-muted-foreground">Years of Heritage</p>
                </div>
                <div>
                  <h4 className="font-bold text-3xl text-primary font-theme-heading mb-1">{content?.italian_stats_dishes || "50+"}</h4>
                  <p className="text-sm text-muted-foreground">Artisanal Dishes</p>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&q=80&w=600" 
                alt="Chef cooking"
                className="w-full h-64 md:h-80 object-cover rounded-theme mt-8"
              />
              <img 
                src="https://images.unsplash.com/photo-1600803907087-f56d462fd26b?auto=format&fit=crop&q=80&w=600" 
                alt="Pizza"
                className="w-full h-64 md:h-80 object-cover rounded-theme"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED DISHES ─── */}
      <section id="menu" className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <span className="text-primary font-semibold tracking-widest uppercase text-sm">Specials</span>
          <h2 className="font-theme-heading text-4xl md:text-5xl font-bold mt-4">{content?.italian_menu_title || "Chef's Recommendations"}</h2>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { name: "Truffle Tagliatelle", desc: "Handmade pasta, wild mushrooms, fresh black truffle shavings.", price: "₹850", img: "https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&q=80&w=600" },
            { name: "Margherita Verace", desc: "San Marzano tomatoes, fresh mozzarella di bufala, basil.", price: "₹650", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=600" },
            { name: "Classic Tiramisu", desc: "Espresso soaked ladyfingers, mascarpone cream, cocoa.", price: "₹450", img: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=600" }
          ].map((item, i) => (
            <div key={i} className="group bg-card rounded-theme overflow-hidden border border-border hover:border-primary/50 transition-colors">
              <div className="relative h-64 overflow-hidden">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-theme-heading text-2xl font-bold">{item.name}</h3>
                  <span className="text-primary font-bold">{item.price}</span>
                </div>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <Link to="/order" className="inline-flex items-center gap-2 border-2 border-primary text-primary px-8 py-3 rounded-theme font-semibold hover:bg-primary hover:text-primary-foreground transition-all">
            See Full Menu
          </Link>
        </div>
      </section>

      {/* ─── INFO & FOOTER ─── */}
      <footer id="visit" className="bg-[#1A1814] text-[#E8E6E1] py-20 px-6 border-t-[8px] border-primary">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 md:gap-8">
          
          <div className="space-y-6">
            <h3 className="font-theme-heading text-3xl font-bold text-white">{businessName}</h3>
            <p className="text-[#A3A19C] leading-relaxed max-w-sm">
              {content?.italian_footer_desc || "Bringing the authentic taste and warmth of a true Italian trattoria straight to your neighborhood."}
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary cursor-pointer transition-colors">
                <Instagram size={20} />
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary cursor-pointer transition-colors">
                <Facebook size={20} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-theme-heading text-xl font-bold text-white uppercase tracking-widest">Visit Us</h4>
            <div className="space-y-4 text-[#A3A19C]">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary shrink-0 mt-1" size={20} />
                <p>123 Culinary Avenue, Food District<br/>City, State 12345</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-primary shrink-0" size={20} />
                <p>+91 98765 43210</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-theme-heading text-xl font-bold text-white uppercase tracking-widest">Hours</h4>
            <div className="space-y-4 text-[#A3A19C]">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Mon - Thu</span>
                <span>11:00 AM - 10:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Fri - Sun</span>
                <span>11:00 AM - 11:30 PM</span>
              </div>
            </div>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center text-sm text-[#A3A19C]">
          <p>© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ItalianLandingPage;
