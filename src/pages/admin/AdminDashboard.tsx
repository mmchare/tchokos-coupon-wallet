import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, DollarSign, Gavel, TrendingUp } from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  activeAuctions: number;
  pendingOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeAuctions: 0,
    pendingOrders: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Fetch pending orders
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .neq('logistics_step', 4);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue from completed orders
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount');
      
      const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch active auctions
      const { count: auctionsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_auction', true)
        .gt('auction_end_date', new Date().toISOString());

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        totalUsers: usersCount || 0,
        totalRevenue,
        activeAuctions: auctionsCount || 0,
        pendingOrders: pendingCount || 0
      });

      setIsLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Produits', value: stats.totalProducts, icon: Package, color: 'text-jinbao-blue' },
    { label: 'Commandes', value: stats.totalOrders, icon: ShoppingCart, color: 'text-green-500' },
    { label: 'En cours', value: stats.pendingOrders, icon: TrendingUp, color: 'text-yellow-500' },
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-purple-500' },
    { label: 'Enchères actives', value: stats.activeAuctions, icon: Gavel, color: 'text-orange-500' },
    { label: 'Revenus total', value: `${stats.totalRevenue.toLocaleString()} F`, icon: DollarSign, color: 'text-jinbao-red' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de JinBao Smart Market</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <stat.icon className={`h-8 w-8 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '...' : stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Utilisez le menu latéral pour naviguer vers les différentes sections du dashboard.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Consultez le journal d'audit pour voir l'historique des actions administratives.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
