import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, DollarSign, Gavel, TrendingUp, Clock, AlertTriangle, Bell, CheckCheck, XCircle, ShoppingBag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, subMonths, differenceInDays, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminNotification {
  id: string;
  message_type: string;
  message_body: string;
  is_read: boolean;
  created_at: string;
  order_id: string | null;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  activeAuctions: number;
  pendingOrders: number;
  avgDeliveryDays: number;
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  logistics_step: number;
  products?: { category: string | null } | null;
}

const COLORS = ['#E2231A', '#1E90FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeAuctions: 0,
    pendingOrders: 0,
    avgDeliveryDays: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState('30');
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch admin notifications
  const fetchAdminNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .in('message_type', ['ADMIN_NOUVELLE_COMMANDE', 'ADMIN_ANNULATION'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setAdminNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setAdminNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('message_type', ['ADMIN_NOUVELLE_COMMANDE', 'ADMIN_ANNULATION'])
      .eq('is_read', false);

    setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Real-time subscription for new notifications
  useEffect(() => {
    fetchAdminNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as AdminNotification;
          if (newNotif.message_type === 'ADMIN_NOUVELLE_COMMANDE' || newNotif.message_type === 'ADMIN_ANNULATION') {
            setAdminNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch orders with product data
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, total_amount, created_at, updated_at, logistics_step,
          products (category)
        `);

      const orders = ordersData as Order[] || [];

      // Calculate pending orders
      const pendingOrders = orders.filter(o => o.logistics_step < 4).length;

      // Calculate average delivery time for completed orders
      const deliveredOrders = orders.filter(o => o.logistics_step === 4);
      let avgDeliveryDays = 0;
      if (deliveredOrders.length > 0) {
        const totalDays = deliveredOrders.reduce((sum, order) => {
          const days = differenceInDays(new Date(order.updated_at), new Date(order.created_at));
          return sum + days;
        }, 0);
        avgDeliveryDays = Math.round(totalDays / deliveredOrders.length);
      }

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate total revenue
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);

      // Fetch active auctions
      const { count: auctionsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_auction', true)
        .gt('auction_end_date', new Date().toISOString());

      // Calculate category distribution
      const categoryMap: Record<string, number> = {};
      orders.forEach(order => {
        const category = order.products?.category || 'Autres';
        categoryMap[category] = (categoryMap[category] || 0) + Number(order.total_amount);
      });
      const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      setCategoryData(categoryChartData);

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: orders.length,
        totalUsers: usersCount || 0,
        totalRevenue,
        activeAuctions: auctionsCount || 0,
        pendingOrders,
        avgDeliveryDays
      });

      setIsLoading(false);
    };

    fetchStats();
  }, []);

  // Fetch revenue data based on period
  useEffect(() => {
    const fetchRevenueData = async () => {
      let startDate: Date;
      let groupBy: 'day' | 'month';

      if (revenuePeriod === '7') {
        startDate = subDays(new Date(), 7);
        groupBy = 'day';
      } else if (revenuePeriod === '30') {
        startDate = subDays(new Date(), 30);
        groupBy = 'day';
      } else {
        startDate = subMonths(new Date(), 12);
        groupBy = 'month';
      }

      // Fetch orders for period
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Fetch wallet recharges for period
      const { data: rechargesData } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at')
        .eq('type', 'credit')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Group data by date
      const revenueMap: Record<string, { ventes: number; recharges: number }> = {};

      ordersData?.forEach(order => {
        const dateKey = groupBy === 'day'
          ? format(new Date(order.created_at), 'dd/MM')
          : format(new Date(order.created_at), 'MMM', { locale: fr });
        
        if (!revenueMap[dateKey]) {
          revenueMap[dateKey] = { ventes: 0, recharges: 0 };
        }
        revenueMap[dateKey].ventes += Number(order.total_amount);
      });

      rechargesData?.forEach(tx => {
        const dateKey = groupBy === 'day'
          ? format(new Date(tx.created_at), 'dd/MM')
          : format(new Date(tx.created_at), 'MMM', { locale: fr });
        
        if (!revenueMap[dateKey]) {
          revenueMap[dateKey] = { ventes: 0, recharges: 0 };
        }
        revenueMap[dateKey].recharges += Number(tx.amount);
      });

      const chartData = Object.entries(revenueMap).map(([date, data]) => ({
        date,
        ventes: data.ventes,
        recharges: data.recharges
      }));

      setRevenueData(chartData);
    };

    fetchRevenueData();
  }, [revenuePeriod]);

  const statCards = [
    { label: 'Produits', value: stats.totalProducts, icon: Package, color: 'text-jinbao-blue' },
    { label: 'Commandes', value: stats.totalOrders, icon: ShoppingCart, color: 'text-green-500' },
    { label: 'En cours', value: stats.pendingOrders, icon: TrendingUp, color: 'text-yellow-500' },
    { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-purple-500' },
    { label: 'Enchères actives', value: stats.activeAuctions, icon: Gavel, color: 'text-orange-500' },
    { label: 'Revenus total', value: `${stats.totalRevenue.toLocaleString()} F`, icon: DollarSign, color: 'text-primary' },
  ];

  const isDeliveryDelayed = stats.avgDeliveryDays > 14;

  const getNotificationIcon = (type: string) => {
    if (type === 'ADMIN_NOUVELLE_COMMANDE') return <ShoppingBag className="h-5 w-5 text-green-500" />;
    if (type === 'ADMIN_ANNULATION') return <XCircle className="h-5 w-5 text-destructive" />;
    return <Bell className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de JinBao Smart Market</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            <Bell className="h-4 w-4 mr-1" />
            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Admin Notifications Panel */}
      {adminNotifications.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications Commandes
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Tout marquer lu
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {adminNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      notif.is_read ? 'bg-muted/30' : 'bg-primary/10 border border-primary/20'
                    }`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    {getNotificationIcon(notif.message_type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {notif.message_body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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

      {/* KPI Delivery Performance */}
      <Card className={`border-2 ${isDeliveryDelayed ? 'border-destructive bg-destructive/10' : 'border-green-500/30 bg-green-500/10'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isDeliveryDelayed ? (
                <AlertTriangle className="h-12 w-12 text-destructive" />
              ) : (
                <Clock className="h-12 w-12 text-green-500" />
              )}
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {isLoading ? '...' : `${stats.avgDeliveryDays} jours`}
                </p>
                <p className="text-muted-foreground">Délai moyen de livraison</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-medium ${isDeliveryDelayed ? 'text-destructive' : 'text-green-500'}`}>
                {isDeliveryDelayed ? '⚠️ Au-dessus de l\'objectif' : '✓ Dans l\'objectif'}
              </p>
              <p className="text-sm text-muted-foreground">Cible : 14 jours max</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isDeliveryDelayed ? 'bg-destructive' : 'bg-green-500'}`}
              style={{ width: `${Math.min((stats.avgDeliveryDays / 14) * 100, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-foreground">Évolution des revenus</CardTitle>
            <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="365">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} F`]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ventes"
                      name="Ventes"
                      stroke="#E2231A"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="recharges"
                      name="Recharges"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Répartition des ventes par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} F`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
