import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Clock, TrendingUp, AlertCircle, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Bid {
  id: string;
  userName: string;
  amount: number;
  timestamp: Date;
}

interface AuctionBidPanelProps {
  productId: string;
  productName: string;
  startingPrice: number;
  currentMaxBid: number;
  auctionEndDate: Date;
  bids: Bid[];
  onPlaceBid: (amount: number) => void;
}

const AuctionBidPanel = ({
  productId,
  productName,
  startingPrice,
  currentMaxBid,
  auctionEndDate,
  bids,
  onPlaceBid,
}: AuctionBidPanelProps) => {
  const { toast } = useToast();
  const [bidAmount, setBidAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = auctionEndDate.getTime();
      const difference = end - now;

      if (difference > 0) {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [auctionEndDate]);

  // Prepare chart data
  const chartData = bids.map((bid, index) => ({
    name: `Offre ${index + 1}`,
    montant: bid.amount,
    time: bid.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }));

  // Add starting point
  const fullChartData = [
    { name: 'Départ', montant: startingPrice, time: 'Début' },
    ...chartData,
  ];

  const handlePlaceBid = () => {
    const amount = parseInt(bidAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    if (amount <= currentMaxBid) {
      toast({
        title: "Offre trop basse",
        description: `Votre offre doit être supérieure à ${currentMaxBid.toLocaleString()} FCFA`,
        variant: "destructive",
      });
      return;
    }

    onPlaceBid(amount);
    setBidAmount('');
    toast({
      title: "Offre placée !",
      description: `Votre offre de ${amount.toLocaleString()} FCFA a été enregistrée`,
    });
  };

  const minimumBid = currentMaxBid + 1000;
  const isAuctionEnded = new Date() > auctionEndDate;

  return (
    <Card id="auction-panel" className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Enchère en cours
          </CardTitle>
          <Badge className="bg-primary text-primary-foreground animate-pulse">
            <Flame className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Countdown Timer */}
        <div className="bg-muted rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Temps restant</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: timeRemaining.days, label: 'Jours' },
              { value: timeRemaining.hours, label: 'Heures' },
              { value: timeRemaining.minutes, label: 'Min' },
              { value: timeRemaining.seconds, label: 'Sec' },
            ].map((item) => (
              <div key={item.label} className="bg-background rounded-lg p-2 sm:p-3">
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {item.value.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-sm text-muted-foreground mb-1">Prix de départ</div>
            <div className="text-lg font-semibold text-foreground">
              {startingPrice.toLocaleString()} F
            </div>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
            <div className="text-sm text-primary mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Offre maximale
            </div>
            <div className="text-lg font-bold text-primary">
              {currentMaxBid.toLocaleString()} F
            </div>
          </div>
        </div>

        {/* Bid History Chart */}
        {fullChartData.length > 1 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-jinbao-blue" />
              Courbe des enchères
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fullChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} F`, 'Montant']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="montant"
                    stroke="hsl(226, 100%, 56%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(226, 100%, 56%)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(356, 82%, 50%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Bids List */}
        {bids.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Dernières offres</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {bids.slice(-5).reverse().map((bid) => (
                <div 
                  key={bid.id} 
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-foreground font-medium">{bid.userName}</span>
                  <span className="text-primary font-bold">
                    {bid.amount.toLocaleString()} F
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Place Bid Form */}
        {!isAuctionEnded ? (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Offre minimum : {minimumBid.toLocaleString()} FCFA</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`${minimumBid.toLocaleString()} FCFA ou plus`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="flex-1 bg-input border-border"
              />
              <Button 
                onClick={handlePlaceBid}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                <Gavel className="h-4 w-4 mr-2" />
                Enchérir
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-muted-foreground font-medium">
              Cette enchère est terminée
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionBidPanel;
