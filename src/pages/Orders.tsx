import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, ShoppingBag, Loader2, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TrackingJinBaoCard from '@/components/TrackingJinBaoCard';
import NotificationsList from '@/components/NotificationsList';
import { useNotifications } from '@/hooks/useNotifications';

interface Order {
  id: string;
  status: string;
  logistics_step: number;
  total_amount: number;
  city: string;
  delivery_address: string;
  whatsapp_number: string;
  created_at: string;
  product_id: string | null;
  product_name: string | null;
  product_image: string | null;
  product?: {
    name: string;
    images: string[] | null;
  } | null;
}

const Orders = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('redirectAfterAuth', '/orders');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(name, images)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Realtime subscription for live order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filterOrders = (status: string) => {
    if (status === 'all') return orders;
    if (status === 'active') return orders.filter(o => o.logistics_step < 4 && o.status !== 'cancelled');
    if (status === 'delivered') return orders.filter(o => o.logistics_step === 4 || o.status === 'delivered');
    return orders;
  };

  const filteredOrders = filterOrders(activeTab);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-jinbao-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-jinbao-red" />
              <h1 className="text-2xl font-bold text-foreground">{t('orders.title')}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="notifications" className="data-[state=active]:bg-jinbao-red data-[state=active]:text-white relative">
              <Bell className="h-4 w-4 mr-1" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-jinbao-red data-[state=active]:text-white">
              {t('orders.all')} ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-jinbao-red data-[state=active]:text-white">
              {t('orders.active')}
            </TabsTrigger>
            <TabsTrigger value="delivered" className="data-[state=active]:bg-jinbao-red data-[state=active]:text-white">
              {t('orders.delivered')}
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0">
            <NotificationsList
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              unreadCount={unreadCount}
            />
          </TabsContent>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-jinbao-red mb-4" />
              <p className="text-muted-foreground">{t('orders.loadingOrders')}</p>
            </div>
          ) : activeTab === 'notifications' ? null : filteredOrders.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {activeTab === 'all' ? t('orders.empty') : 
                   activeTab === 'active' ? t('orders.noActiveOrders') : 
                   t('orders.noDeliveredOrders')}
                </h3>
                <p className="text-muted-foreground text-center mb-6">
                  {activeTab === 'all' 
                    ? t('orders.noOrdersYet')
                    : activeTab === 'active'
                    ? t('orders.allDelivered')
                    : t('orders.activeWillAppear')}
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-jinbao-red hover:bg-jinbao-red/90 text-white"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  {t('orders.discoverProducts')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TabsContent value={activeTab} className="space-y-4 mt-0">
              {filteredOrders.map((order) => (
                <OrderTrackingCard 
                  key={order.id} 
                  order={order} 
                  onOrderCancelled={fetchOrders}
                />
              ))}
            </TabsContent>
          )}
        </Tabs>

        {/* Delivery Info */}
        <Card className="mt-6 bg-jinbao-blue/10 border-jinbao-blue/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-jinbao-blue" />
              <div>
                <p className="font-semibold text-foreground">{t('orders.deliveryTime')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('orders.deliveryTimeDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Orders;
