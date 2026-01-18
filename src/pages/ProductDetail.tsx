import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Send, Smile, ShoppingBag, CheckCircle2, Gavel, Share2, Heart, MessageSquare, ChevronRight, Loader2, Bell, BellOff, Home, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addToCoupon } = useCoupon();
  const { trackView, trackAddToCart } = useActivityTracking();
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
        const { data: reviewsData } = await supabase
          .from('reviews')
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

        const avgRating = reviews.length > 0 
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
          : 4.5;

        const transformedProduct: Product = {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          originalPrice: data.original_price ? Number(data.original_price) : undefined,
          category: data.category || 'Autres',
          rating: avgRating,
          images: data.images && data.images.length > 0 ? data.images : ['/placeholder.svg'],
          videoUrl: data.video_url || undefined,
          description: data.description || 'Aucune description disponible.',
          reviews: reviews,
          isVerified: data.is_verified || false,
          isUniqueStock: data.stock_available <= 1,
          isAuction: data.is_auction || false,
          auctionEndDate: data.auction_end_date ? new Date(data.auction_end_date) : undefined,
          startingPrice: Number(data.price),
          bids: []
        };

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
        trackView(data.id);
      }

      setIsLoading(false);
    };

    fetchProduct();
  }, [id, toast, trackView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vibrant-red" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile Floating Header (Overlay) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
           {/* Actions in mobile header */}
           <Button
             variant="ghost"
             size="icon"
             onClick={handleShare}
             className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background shadow-sm"
           >
             <Share2 className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <main className="container mx-auto px-0 md:px-6 py-0 md:py-8">
        {/* Desktop Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary flex items-center gap-1">
             <Home className="h-4 w-4" /> Home
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link to={`/catalog?category=${product.category}`} className="hover:text-primary">
            {product.category}
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[300px]">{product.name}</span>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-10 lg:gap-16 items-start">
          
          {/* Left Column: Gallery */}
          <div className="w-full relative">
            <div className="md:rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
               <ProductImageGallery
                images={product.images}
                videoUrl={product.videoUrl}
                productName={product.name}
                category={product.category}
              />
            </div>
            
            {/* Desktop: Similar products below gallery or info? user preference. Typically below everything. */}
          </div>

          {/* Right Column: Product Info */}
          <div className="px-4 md:px-0 -mt-6 md:mt-0 relative z-10 md:z-0 space-y-6">
            
            {/* Product Header Card (Mobile overlap style maintained on mobile, standard on desktop) */}
            <div className="bg-card md:bg-transparent md:shadow-none md:border-0 rounded-3xl md:rounded-none shadow-lg border border-border p-5 md:p-0 space-y-4">
              
              {/* Title & Reviews */}
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-4 text-sm">
                   <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-vibrant-yellow text-vibrant-yellow" />
                      <span className="font-bold">{product.rating.toFixed(1)}</span>
                   </div>
                   <span className="text-gray-400">•</span>
                   <span className="text-gray-500 hover:text-primary cursor-pointer underline-offset-4 hover:underline">
                      {product.reviews.length} {t('product.reviews')}
                   </span>
                   {product.isVerified && (
                     <>
                       <span className="text-gray-400">•</span>
                       <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                         <CheckCircle2 className="h-4 w-4" />
                       </div>
                     </>
                   )}
                </div>
              </div>

              {/* Price Block */}
              <div className="flex items-end justify-between md:justify-start md:gap-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                 <div className="flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-extrabold text-vibrant-red">
                      {product.isAuction ? currentMaxBid.toLocaleString() : product.price.toLocaleString()}
                      <span className="text-base md:text-xl font-medium ml-1">FCFA</span>
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm md:text-base text-gray-400 line-through">
                        {product.originalPrice.toLocaleString()} F
                      </span>
                    )}
                 </div>
                 {discount > 0 && (
                   <Badge variant="destructive" className="text-sm px-3 py-1">
                     -{discount}%
                   </Badge>
                 )}
              </div>

              {/* Auctions Panel */}
              {product.isAuction && product.auctionEndDate && (
                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900">
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

              {/* Desktop Actions */}
              <div className="hidden md:flex flex-col gap-3 pt-2">
                 <div className="flex gap-4">
                    <Button 
                      onClick={handleAddToCoupon}
                      variant="outline" 
                      size="lg" 
                      className="flex-1 h-14 text-base border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                       <ShoppingBag className="h-5 w-5 mr-2" />
                       {t('product.addToCoupon')}
                    </Button>
                    <Button 
                      onClick={() => setShowDeliveryForm(true)}
                      size="lg" 
                      className="flex-[2] h-14 text-base bg-vibrant-red hover:bg-vibrant-red/90 text-white shadow-lg shadow-red-200 dark:shadow-none"
                    >
                       {product.isAuction ? t('product.bidNow') : t('product.buyNow')}
                    </Button>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="ghost" className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleWhatsAppClick}>
                       <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                       WhatsApp
                     </Button>
                     <Button variant="ghost" onClick={handleShare} className="flex-1">
                       <Share2 className="h-5 w-5 mr-2" /> {t('common.share')}
                     </Button>
                     <Button variant="ghost" onClick={() => product && toggleFavorite(product.id)} className="flex-1">
                        <Heart className={`h-5 w-5 mr-2 ${isProductFavorite ? 'fill-vibrant-red text-vibrant-red' : ''}`} /> 
                        {isProductFavorite ? 'Saved' : 'Save'}
                     </Button>
                 </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-2xl md:rounded-xl shadow-sm border border-border p-5">
              <h3 className="font-semibold text-lg text-foreground mb-3">{t('product.description')}</h3>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-card rounded-2xl md:rounded-xl shadow-sm border border-border p-5">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                <h3 className="font-semibold text-lg text-foreground">
                  {t('product.reviews')} ({product.reviews.length})
                </h3>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showReviewForm ? 'rotate-90' : ''}`} />
              </div>

               {/* Reviews List */}
               {product.reviews.length > 0 ? (
                <div className="mt-6 space-y-6">
                  {product.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold">
                          {review.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-gray-900 dark:text-gray-100">{review.userName}</span>
                           <span className="text-xs text-gray-400">{review.date}</span>
                        </div>
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-vibrant-yellow text-vibrant-yellow' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                        {review.photos && review.photos.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {review.photos.map((photo, idx) => (
                              <img key={idx} src={photo} alt="Review" className="w-16 h-16 rounded-md object-cover border" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {product.reviews.length > 3 && (
                     <Button variant="link" className="w-full text-brand-primary">View all reviews</Button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">{t('product.noReviews')}</p>
              )}

              {/* Review Form */}
              {showReviewForm && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="flex justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setUserRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                        <Star className={`h-8 w-8 ${star <= userRating ? 'fill-vibrant-yellow text-vibrant-yellow' : 'text-gray-200'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Textarea
                      placeholder={t('product.yourComment')}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border-0 focus-visible:ring-1 focus-visible:ring-primary min-h-[100px] resize-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-2 bottom-2"
                    >
                      <Smile className="h-5 w-5 text-gray-400 hover:text-primary" />
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute right-0 bottom-12 z-50">
                        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                      </div>
                    )}
                  </div>
                  <ReviewPhotoUpload photos={reviewPhotos} onPhotosChange={setReviewPhotos} maxPhotos={3} />
                  <Button onClick={handleSubmitComment} className="w-full" disabled={!comment.trim() || userRating === 0}>
                    {t('product.submitReview')}
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Similar Products - Full Width Section */}
        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold mb-6 px-4 md:px-0">{t('product.similarProducts')}</h2>
          <SimilarProducts currentProductId={product.id} category={product.category} />
        </div>
      </main>

      {/* Mobile Footer / Desktop Footer */}
      <div className="hidden md:block mt-20">
         <Footer />
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 z-40 px-4 pb-safe">
        <div className="flex items-center gap-3">
          <Button onClick={handleWhatsAppClick} variant="outline" size="icon" className="h-11 w-11 rounded-full border-green-500 text-green-500">
             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          </Button>
          <Button onClick={handleAddToCoupon} variant="outline" size="icon" className="h-11 w-11 rounded-full border-primary text-primary">
             <ShoppingBag className="h-5 w-5" />
          </Button>
          <Button 
            onClick={() => setShowDeliveryForm(true)}
            className="flex-1 h-11 rounded-full bg-vibrant-red hover:bg-vibrant-red/90 text-white font-bold"
          >
            {product.isAuction ? t('product.bidNow') : t('product.buyNow')}
          </Button>
        </div>
      </div>

      <DeliveryFormModal
        isOpen={showDeliveryForm}
        onClose={() => setShowDeliveryForm(false)}
        onSubmit={(data) => {
          setShowDeliveryForm(false);
          setShowPurchaseConfirmation(true);
        }}
        total={product.isAuction ? currentMaxBid : product.price}
        items={[{ id: product.id, name: product.name, price: product.isAuction ? currentMaxBid : product.price, image: product.images[0], quantity: 1 }]}
      />
      {showPurchaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-xl border border-border">
            <PurchaseConfirmation productName={product.name} onClose={() => setShowPurchaseConfirmation(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
