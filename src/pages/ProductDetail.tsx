import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Star, Send, Smile, ShoppingBag, CheckCircle2, Gavel, Share2, Heart, MessageCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import EmojiPicker from '@/components/EmojiPicker';
import ProductImageGallery from '@/components/ProductImageGallery';
import SimilarProducts from '@/components/SimilarProducts';
import AuctionBidPanel from '@/components/AuctionBidPanel';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  isVerifiedClient?: boolean;
}

interface Bid {
  id: string;
  userName: string;
  amount: number;
  timestamp: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  images: string[];
  videoUrl?: string;
  description: string;
  reviews: Review[];
  isVerified: boolean;
  isUniqueStock: boolean;
  isAuction?: boolean;
  auctionEndDate?: Date;
  startingPrice?: number;
  bids?: Bid[];
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCoupon } = useCoupon();
  const [comment, setComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [auctionBids, setAuctionBids] = useState<Record<string, Bid[]>>({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch product from Supabase
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le produit",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (data) {
        const transformedProduct: Product = {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          originalPrice: data.original_price ? Number(data.original_price) : undefined,
          category: data.category || 'Autres',
          rating: 4.5 + Math.random() * 0.5, // Placeholder until reviews system
          images: data.images && data.images.length > 0 ? data.images : ['/placeholder.svg'],
          videoUrl: data.video_url || undefined,
          description: data.description || 'Aucune description disponible.',
          reviews: [], // Placeholder until reviews system
          isVerified: data.is_verified || false,
          isUniqueStock: data.stock_available <= 1,
          isAuction: data.is_auction || false,
          auctionEndDate: data.auction_end_date ? new Date(data.auction_end_date) : undefined,
          startingPrice: Number(data.price),
          bids: []
        };

        // Fetch bids if auction
        if (data.is_auction) {
          const { data: bidsData } = await supabase
            .from('bids')
            .select('id, amount, created_at, user_id')
            .eq('product_id', data.id)
            .order('created_at', { ascending: false });

          if (bidsData && bidsData.length > 0) {
            transformedProduct.bids = bidsData.map((bid, index) => ({
              id: bid.id,
              userName: `Enchérisseur ${index + 1}`,
              amount: Number(bid.amount),
              timestamp: new Date(bid.created_at)
            }));
          }
        }

        setProduct(transformedProduct);
      }

      setIsLoading(false);
    };

    fetchProduct();
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vibrant-red" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Produit non trouvé</p>
        <Button onClick={() => navigate('/')} variant="outline">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCoupon = () => {
    addToCoupon({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
    });
    toast({
      title: "Produit ajouté !",
      description: `${product.name} a été ajouté à votre coupon`,
    });
  };

  const handlePlaceBid = (amount: number) => {
    const newBid: Bid = {
      id: `b${Date.now()}`,
      userName: 'Vous',
      amount,
      timestamp: new Date(),
    };
    
    setAuctionBids(prev => ({
      ...prev,
      [product.id]: [...(prev[product.id] || product.bids || []), newBid],
    }));
  };

  const currentBids = auctionBids[product.id] || product.bids || [];
  const currentMaxBid = currentBids.length > 0 
    ? Math.max(...currentBids.map(b => b.amount)) 
    : (product.startingPrice || product.price);

  const handleSubmitComment = () => {
    if (!comment.trim() || userRating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un commentaire et une note",
        variant: "destructive"
      });
      return;
    }
    toast({ title: "Avis publié !", description: "Merci pour votre retour" });
    setComment('');
    setUserRating(0);
    setShowReviewForm(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleWhatsAppClick = () => {
    const message = `Bonjour JinBao, je suis intéressé(e) par le produit: ${product.name} au prix de ${product.price.toLocaleString()} F. J'aimerais avoir plus d'informations.`;
    window.open(`https://wa.me/237690000000?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Lien copié !" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto overflow-x-hidden">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFavorite(!isFavorite)}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Full-Width Image Gallery */}
      <div className="w-full">
        <ProductImageGallery
          images={product.images}
          videoUrl={product.videoUrl}
          productName={product.name}
          category={product.category}
          discount={discount}
          isVerified={product.isVerified}
          isUniqueStock={product.isUniqueStock}
        />
      </div>

      {/* Product Info Section */}
      <div className="px-4 -mt-4 relative z-10">
        {/* Price Card - Xianyu Style */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-4 space-y-4">
          {/* Price Row */}
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-vibrant-red">F</span>
              <span className="text-3xl font-bold text-vibrant-red">
                {product.isAuction ? currentMaxBid.toLocaleString() : product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.originalPrice.toLocaleString()} F
                </span>
              )}
            </div>
            {discount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                -{discount}%
              </span>
            )}
          </div>

          {/* Auction Badge */}
          {product.isAuction && (
            <div className="flex items-center gap-2 text-sm">
              <Gavel className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">Enchère en cours</span>
              <span className="text-muted-foreground">• Offre actuelle</span>
            </div>
          )}

          {/* Product Name */}
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {product.name}
          </h1>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-vibrant-yellow text-vibrant-yellow'
                      : 'text-muted'
                  }`}
                />
              ))}
              <span className="text-sm font-medium text-foreground ml-1">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              {product.reviews.length} avis
            </span>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            {product.isVerified && (
              <div className="verified-badge">
                <CheckCircle2 className="h-4 w-4" />
                <span>Vérifié JinBao</span>
              </div>
            )}
            {product.isUniqueStock && (
              <div className="stock-warning">
                <span>Stock limité</span>
              </div>
            )}
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mt-3">
          <h3 className="font-semibold text-foreground mb-2">Description</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Auction Panel */}
        {product.isAuction && product.auctionEndDate && (
          <div className="mt-3">
            <AuctionBidPanel
              productId={product.id}
              productName={product.name}
              startingPrice={product.startingPrice || product.price}
              currentMaxBid={currentMaxBid}
              auctionEndDate={product.auctionEndDate}
              bids={currentBids}
              onPlaceBid={handlePlaceBid}
            />
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mt-3">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                Avis ({product.reviews.length})
              </h3>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showReviewForm ? 'rotate-90' : ''}`} />
          </div>

          {/* Reviews List - Always visible */}
          {product.reviews.length > 0 ? (
            <div className="mt-4 space-y-3">
              {product.reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {review.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{review.userName}</span>
                      <div className="flex items-center">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-vibrant-yellow text-vibrant-yellow" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Aucun avis pour ce produit</p>
          )}

          {/* Review Form - Collapsible */}
          {showReviewForm && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setUserRating(star)}>
                    <Star
                      className={`h-6 w-6 ${
                        star <= userRating ? 'fill-vibrant-yellow text-vibrant-yellow' : 'text-muted'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="relative">
                <Textarea
                  placeholder="Votre avis..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-muted/50 border-border min-h-[80px] pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-2 top-2 h-8 w-8"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute right-0 top-12 z-50">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                )}
              </div>
              <Button 
                onClick={handleSubmitComment}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!comment.trim() || userRating === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Publier l'avis
              </Button>
            </div>
          )}
        </div>

        {/* Similar Products */}
        <div className="mt-6">
          <SimilarProducts currentProductId={product.id} category={product.category} />
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {/* WhatsApp Button */}
          <Button
            onClick={handleWhatsAppClick}
            variant="outline"
            size="icon"
            className="h-12 w-12 flex-shrink-0 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Add to Coupon Button */}
          <Button
            onClick={handleAddToCoupon}
            variant="outline"
            size="icon"
            className="h-12 w-12 flex-shrink-0 border-primary text-primary hover:bg-primary hover:text-white"
          >
            <ShoppingBag className="h-5 w-5" />
          </Button>

          {/* Buy/Bid Button */}
          <Button
            onClick={() => setShowDeliveryForm(true)}
            className="flex-1 h-12 bg-vibrant-red hover:bg-vibrant-red/90 text-white font-semibold text-base"
          >
            {product.isAuction ? (
              <>
                <Gavel className="h-5 w-5 mr-2" />
                Enchérir maintenant
              </>
            ) : (
              'Acheter maintenant'
            )}
          </Button>
        </div>
      </div>

      {/* Delivery Form Modal */}
      <DeliveryFormModal
        isOpen={showDeliveryForm}
        onClose={() => setShowDeliveryForm(false)}
        onSubmit={(data) => {
          setShowDeliveryForm(false);
          toast({
            title: "Commande confirmée !",
            description: `Votre commande de ${product.name} a été enregistrée.`
          });
        }}
        total={product.isAuction ? currentMaxBid : product.price}
        items={[{
          id: product.id,
          name: product.name,
          price: product.isAuction ? currentMaxBid : product.price,
          image: product.images[0],
          quantity: 1
        }]}
      />
    </div>
  );
};

export default ProductDetail;
