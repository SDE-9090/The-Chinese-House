import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ThemeInjector from "@/components/ThemeInjector";
import AiChatbot from "@/components/AiChatbot";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const Index = lazy(() => import("./pages/Index"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TokenDisplay = lazy(() => import("./pages/TokenDisplay"));
const ItemReviewsPage = lazy(() => import("./pages/ItemReviewsPage"));
const GiftVoucher = lazy(() => import("./pages/GiftVoucher"));
const KitchenDisplay = lazy(() => import("./pages/KitchenDisplay"));
const TableOrderPage = lazy(() => import("./pages/TableOrderPage"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const MobileSetup = lazy(() => import("./pages/MobileSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SaasLanding = lazy(() => import("./pages/SaasLanding"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 size={32} className="animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

function ThemeInit() {
  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }

    // Keep tablet screen awake indefinitely
    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(err => console.error("KeepAwake failed:", err));
      CapacitorUpdater.notifyAppReady().catch(err => console.error("CapacitorUpdater notify failed:", err));
    }
  }, []);
  return null;
}

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getTenantSlug, isRootDomain } from "@/lib/apiClient";
import { Navigate } from "react-router-dom";

function RootGuard({ children }: { children: React.ReactNode }) {
  const slug = getTenantSlug();
  const native = Capacitor.isNativePlatform();
  const root = isRootDomain();

  if (native && !slug) {
    return <Navigate to="/setup" replace />;
  }

  if (root || (!native && !slug)) {
    return <PageTransition><SaasLanding /></PageTransition>;
  }

  return <>{children}</>;
}

function TenantGuard({ children }: { children: React.ReactNode }) {
  const slug = getTenantSlug();
  const root = isRootDomain();

  if (root || (!Capacitor.isNativePlatform() && !slug)) {
    return <Navigate to="/" replace />;
  }

  if (!slug) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            {/* Global Routes (No Tenant Required) */}
            <Route path="/super" element={<PageTransition><SuperAdmin /></PageTransition>} />
            <Route path="/setup" element={<PageTransition><MobileSetup /></PageTransition>} />

            {/* Tenant Protected Routes */}
            <Route path="/" element={<RootGuard><PageTransition><Index /></PageTransition></RootGuard>} />
            <Route path="/order" element={<TenantGuard><PageTransition><OrderPage /></PageTransition></TenantGuard>} />
            <Route path="/reviews" element={<TenantGuard><PageTransition><ItemReviewsPage /></PageTransition></TenantGuard>} />
            <Route path="/token-display" element={<TenantGuard><PageTransition><TokenDisplay /></PageTransition></TenantGuard>} />
            <Route path="/gift-voucher" element={<TenantGuard><PageTransition><GiftVoucher /></PageTransition></TenantGuard>} />
            <Route path="/table/:qrCode" element={<TenantGuard><PageTransition><TableOrderPage /></PageTransition></TenantGuard>} />
            <Route path="/kitchen" element={<TenantGuard><PageTransition><KitchenDisplay /></PageTransition></TenantGuard>} />
            <Route path="/dashboard" element={<TenantGuard><PageTransition><Dashboard /></PageTransition></TenantGuard>} />

            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AnimatePresence>
  );
}

function GlobalChatbot() {
  const location = useLocation();
  const { settings } = useBusinessSettings();
  
  // Explicitly hide on the SaaS branding page and Super Admin portal
  if (isRootDomain() || location.pathname.startsWith('/super') || location.pathname === '/') {
    return null;
  }

  // Hide if the tenant does not have the chatbot feature enabled
  if (!settings?.features?.chatbot) return null;

  // Hide chatbot on admin/staff pages
  const isAdminPage = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/kitchen') ||
    location.pathname.startsWith('/token-display');

  if (isAdminPage) return null;
  return <AiChatbot />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeInit />
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <ThemeInjector />
        <GlobalChatbot />
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
