import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Star, Send, Smile, ShoppingBag, CheckCircle2, Gavel, Share2, Heart, MessageSquare, ChevronRight, Loader2, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useFavorites } from '@/hooks/useFavorites';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import EmojiPicker from '@/components/EmojiPicker';
import PurchaseConfirmation from '@/components/PurchaseConfirmation';
import ProductImageGallery from '@/components/ProductImageGallery';
import SimilarProducts from '@/components/SimilarProducts';
import AuctionBidPanel from '@/components/AuctionBidPanel';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import ReviewPhotoUpload from '@/components/ReviewPhotoUpload';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ProductSellerCard } from '@/components/ProductSellerCard';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  isVerifiedClient?: boolean;
  photos?: string[];
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
  sellerId?: string;
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { addToCoupon } = useCoupon();
  const { trackView, endView, trackAddToCart } = useActivityTracking();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { hasAlert, toggleAlert } = usePriceAlerts();
  const [comment, setComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [auctionBids, setAuctionBids] = useState<Record<string, Bid[]>>({});
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isProductFavorite = product ? isFavorite(product.id) : false;
  const hasPriceAlert = product ? hasAlert(product.id) : false;

  // Fetch product and reviews from Supabase
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
          title: t('common.error'),
          description: t('product.errorLoading'),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (data) {
        // Fetch reviews using public_reviews view (excludes user_id for privacy)
        const { data: reviewsData } = await supabase
          .from('public_reviews')
          .select('*')
          .eq('product_id', data.id)
          .order('created_at', { ascending: false });

        const reviews: Review[] = reviewsData ? reviewsData.map(r => ({
          id: r.id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.created_at).toLocaleDateString('fr-FR'),
          isVerifiedClient: r.is_verified_client,
          photos: (r as any).photos || []
        })) : [];

        // Calculate average rating from reviews
        const avgRating = reviews.length > 0 
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
          : 4.5;

        // Pick translated fields based on language
        const lang = i18n.language;
        let displayName = data.name;
        let displayDesc = data.description || 'Aucune description disponible.';
        if (lang === 'en') {
          displayName = (data as any).name_en || data.name;
          displayDesc = (data as any).description_en || data.description || 'No description available.';
        } else if (lang === 'zh') {
          displayName = (data as any).name_zh || data.name;
          displayDesc = (data as any).description_zh || data.description || '暂无描述';
        }

        const transformedProduct: Product = {
          id: data.id,
          name: displayName,
          price: Number(data.price),
          originalPrice: data.original_price ? Number(data.original_price) : undefined,
          category: data.category || 'Autres',
          rating: avgRating,
          images: data.images && data.images.length > 0 ? data.images : ['/placeholder.svg'],
          videoUrl: data.video_url || undefined,
          description: displayDesc,
          reviews: reviews,
          isVerified: data.is_verified || false,
          isUniqueStock: data.stock_available <= 1,
          isAuction: data.is_auction || false,
          auctionEndDate: data.auction_end_date ? new Date(data.auction_end_date) : undefined,
          startingPrice: Number(data.price),
          bids: [],
          sellerId: (data as any).seller_id || undefined
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
        
        // Track product view
        trackView(data.id);
      }

      setIsLoading(false);
    };

    fetchProduct();

    // Track time spent when leaving page
    return () => {
      if (id) endView(id);
    };
  }, [id, toast, trackView, endView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{t('product.notFound')}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          {t('product.backToHome')}
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
    
    // Track add to cart activity
    trackAddToCart(product.id);
    
    toast({
      title: t('product.addedToCoupon'),
      description: `${product.name} ${t('product.addedToCouponDesc')}`,
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

  const { user, profile } = useAuth();

  const handleSubmitComment = async () => {
    if (!comment.trim() || userRating === 0) {
      toast({
        title: t('common.error'),
        description: t('product.enterCommentAndRating'),
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: t('auth.loginRequired'),
        description: t('auth.pleaseLogin'),
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      product_id: product?.id,
      user_id: user.id,
      user_name: profile?.full_name || 'Utilisateur',
      rating: userRating,
      comment: comment.trim(),
      is_verified_client: false,
      photos: reviewPhotos
    });

    if (error) {
      console.error('Error submitting review:', error);
      toast({
        title: t('common.error'),
        description: t('product.errorSubmitReview'),
        variant: "destructive"
      });
      return;
    }

    // Add review to local state
    const newReview: Review = {
      id: crypto.randomUUID(),
      userName: profile?.full_name || 'Utilisateur',
      rating: userRating,
      comment: comment.trim(),
      date: new Date().toLocaleDateString('fr-FR'),
      isVerifiedClient: false,
      photos: reviewPhotos
    };

    setProduct(prev => prev ? {
      ...prev,
      reviews: [newReview, ...prev.reviews]
    } : null);

    toast({ title: t('product.reviewPublished'), description: t('product.thankYouReview') });
    setComment('');
    setUserRating(0);
    setReviewPhotos([]);
    setShowReviewForm(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleWhatsAppClick = () => {
    const productUrl = `${window.location.origin}/product/${id}`;
    const imageUrl = product?.images?.[0] || '';
    const message = `${t('product.whatsappHello')}

${t('product.whatsappInterested')}

🛍️ *${product.name}*
💰 ${t('product.whatsappPrice')}: ${product.price.toLocaleString()} FCFA

📷 ${t('product.whatsappPhoto')}: ${imageUrl}

🔗 ${t('product.whatsappLink')}: ${productUrl}

${t('product.moreInfo')}`;
    
    window.open(`https://wa.me/237655852010?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: t('common.linkCopied') });
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
            onClick={() => product && toggleAlert(product.id, product.price)}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
            title={hasPriceAlert ? "Désactiver l'alerte prix" : "Activer l'alerte prix"}
          >
            {hasPriceAlert ? (
              <BellOff className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </Button>
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
            onClick={() => product && toggleFavorite(product.id)}
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background"
          >
            <Heart className={`h-5 w-5 ${isProductFavorite ? 'fill-primary text-primary' : ''}`} />
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
              <span className="text-sm text-foreground">F</span>
              <span className="text-3xl font-bold text-foreground">
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
              <span className="text-primary font-medium">{t('product.auctionInProgress')}</span>
              <span className="text-muted-foreground">• {t('product.currentBid')}</span>
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
              {t('product.reviewsCount', { count: product.reviews.length })}
            </span>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2">
            {product.isVerified && (
              <div className="verified-badge">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('product.verified')}</span>
              </div>
            )}
            {product.isUniqueStock && (
              <div className="stock-warning">
                <span>{t('product.limitedStock')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description Card */}
        <ExpandableDescription 
          description={product.description} 
          title={t('product.description')} 
        />

        {/* Seller Card (marketplace sellers only) */}
        {product.sellerId && (
          <ProductSellerCard productId={product.id} sellerId={product.sellerId} />
        )}

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
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                {t('product.reviews')} ({product.reviews.length})
              </h3>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showReviewForm ? 'rotate-90' : ''}`} />
          </div>

          {/* Reviews List - Always visible */}
          {product.reviews.length > 0 ? (
            <div className="mt-4 space-y-4">
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
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    {/* Review Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {review.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`${t('product.reviewPhotoAlt')} ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('product.noReviews')}</p>
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
                  placeholder={t('product.yourComment')}
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
              
              {/* Photo Upload */}
              <ReviewPhotoUpload
                photos={reviewPhotos}
                onPhotosChange={setReviewPhotos}
                maxPhotos={3}
              />
              
              <Button 
                onClick={handleSubmitComment}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!comment.trim() || userRating === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                {t('product.submitReview')}
              </Button>
            </div>
          )}
        </div>

        {/* Forum / Discussion Link */}
        <div 
          className="bg-card rounded-2xl shadow-sm border border-border p-4 mt-3 cursor-pointer active:scale-[0.98] transition-all"
          onClick={() => navigate(`/product/${product.id}/forum`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Discussion communautaire</h3>
                <p className="text-xs text-muted-foreground">Questions, avis, partages d'expérience</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
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
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
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
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
          >
            {product.isAuction ? (
              <>
                <Gavel className="h-5 w-5 mr-2" />
                {t('product.bidNow')}
              </>
            ) : (
              t('product.buyNow')
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
          setShowPurchaseConfirmation(true);
        }}
        total={product.isAuction ? currentMaxBid : product.price}
        items={[{
          id: product.id,
          name: product.name,
          price: product.isAuction ? currentMaxBid : product.price,
          image: product.images[0],
          quantity: 1
        }]}
        productCategory={product.category}
      />

      {/* Purchase Confirmation Modal */}
      {showPurchaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-xl border border-border">
            <PurchaseConfirmation 
              productName={product.name}
              onClose={() => setShowPurchaseConfirmation(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
