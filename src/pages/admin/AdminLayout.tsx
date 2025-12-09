import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Gavel, 
  MessageSquare,
  DollarSign,
  FileText,
  Menu,
  X,
  ArrowLeft,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { path: '/admin/products', icon: Package, label: 'Produits' },
  { path: '/admin/orders', icon: ShoppingCart, label: 'Commandes' },
  { path: '/admin/auctions', icon: Gavel, label: 'Enchères' },
  { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { path: '/admin/moderation', icon: MessageSquare, label: 'Modération' },
  { path: '/admin/finance', icon: DollarSign, label: 'Finance' },
  { path: '/admin/campaigns', icon: Send, label: 'Campagnes' },
  { path: '/admin/logs', icon: FileText, label: 'Journal d\'audit' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase.rpc('is_admin');
      if (data !== true) {
        navigate('/');
        return;
      }
      setIsAdmin(true);
    };

    if (!loading) {
      checkAdmin();
    }
  }, [user, loading, navigate]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-jinbao-red border-t-transparent"></div>
      </div>
    );
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-bold text-jinbao-red">JinBao Admin</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border hidden lg:block">
              <h1 className="text-xl font-bold text-jinbao-red">JinBao Admin</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4 lg:mt-0">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                    isActive(item.path, item.exact)
                      ? "bg-jinbao-red text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Back to App */}
            <div className="p-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'app
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:min-h-screen">
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
