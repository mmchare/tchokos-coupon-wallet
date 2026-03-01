import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CouponProvider } from "@/contexts/CouponContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PageLoader from "@/components/PageLoader";

// Critical page - loaded immediately
import Index from "./pages/Index";

// Heavy page - lazy loaded
const ProductDetail = lazy(() => import("./pages/ProductDetail"));

// Lazy-loaded pages - loaded on demand
const ProductForum = lazy(() => import("./pages/ProductForum"));
const Auth = lazy(() => import("./pages/Auth"));
const Recharge = lazy(() => import("./pages/Recharge"));
const Profile = lazy(() => import("./pages/Profile"));
const Orders = lazy(() => import("./pages/Orders"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages - lazy loaded (reduces initial bundle significantly)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminAuctions = lazy(() => import("./pages/admin/AdminAuctions"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminCampaigns = lazy(() => import("./pages/admin/AdminCampaigns"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));

// Optimized React Query configuration for better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnReconnect: true, // Refetch on network reconnect
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <CouponProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PWAInstallPrompt />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Critical routes - not lazy loaded */}
                  <Route path="/" element={<Index />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/product/:id/forum" element={<ProductForum />} />
                  
                  {/* Lazy loaded routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/recharge" element={<Recharge />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  
                  {/* Admin Routes - all lazy loaded */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="auctions" element={<AdminAuctions />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="finance" element={<AdminFinance />} />
                    <Route path="moderation" element={<AdminModeration />} />
                    <Route path="campaigns" element={<AdminCampaigns />} />
                    <Route path="logs" element={<AdminLogs />} />
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </CouponProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
