import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, ShoppingBag, Trophy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatBalance } from '@/lib/formatBalance';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  sellerId: string;
}

export const SellerStats = ({ sellerId }: Props) => {
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ id: string; name: string; sales: number; revenue: number }[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    load();
  }, [sellerId]);

  const load = async () => {
    setLoading(true);
    const since = subDays(new Date(), 30).toISOString();

    // Escrows for revenue
    const { data: escrows } = await supabase
      .from('seller_escrow')
      .select('net_amount, gross_amount, created_at, order_id')
      .eq('seller_id', sellerId)
      .gte('created_at', since);

    // Build daily chart
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      buckets[d] = 0;
    }
    (escrows || []).forEach((e) => {
      const d = format(new Date(e.created_at), 'yyyy-MM-dd');
      if (buckets[d] !== undefined) buckets[d] += Number(e.net_amount);
    });
    setChartData(
      Object.entries(buckets).map(([date, revenue]) => ({
        date: format(new Date(date), 'd MMM', { locale: fr }),
        revenue,
      }))
    );

    // Products + sales
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .eq('seller_id', sellerId);
    const productIds = (products || []).map((p) => p.id);

    let salesByProduct: Record<string, { sales: number; revenue: number }> = {};
    let viewsCount = 0;
    let salesCount = 0;

    if (productIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('product_id, total_amount')
        .in('product_id', productIds);
      (orders || []).forEach((o) => {
        if (!o.product_id) return;
        salesByProduct[o.product_id] = salesByProduct[o.product_id] || { sales: 0, revenue: 0 };
        salesByProduct[o.product_id].sales += 1;
        salesByProduct[o.product_id].revenue += Number(o.total_amount);
      });
      salesCount = (orders || []).length;

      const { count: vCount } = await supabase
        .from('user_activity')
        .select('*', { count: 'exact', head: true })
        .in('product_id', productIds)
        .eq('activity_type', 'view');
      viewsCount = vCount || 0;
    }

    setTotalViews(viewsCount);
    setConversionRate(viewsCount > 0 ? (salesCount / viewsCount) * 100 : 0);

    const top = (products || [])
      .map((p) => ({
        id: p.id,
        name: p.name,
        sales: salesByProduct[p.id]?.sales || 0,
        revenue: salesByProduct[p.id]?.revenue || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
    setTopProducts(top);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-4 h-4" /> Vues (total)
            </div>
            <p className="text-lg font-bold mt-1">{totalViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4" /> Conversion
            </div>
            <p className="text-lg font-bold mt-1">{conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Revenus 30 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                  formatter={(v: number) => formatBalance(v)}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Top produits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune vente pour le moment</p>
          ) : (
            topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-muted-foreground w-5">#{i + 1}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />{p.sales}
                </span>
                <span className="font-semibold text-primary">{formatBalance(p.revenue)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
