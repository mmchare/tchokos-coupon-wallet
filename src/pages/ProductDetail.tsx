import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Star, Plus, Send, Smile, ShoppingBag, CheckCircle2, Gavel, Share2, Heart, MessageCircle, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import EmojiPicker from '@/components/EmojiPicker';
import ProductImageGallery from '@/components/ProductImageGallery';
import SimilarProducts from '@/components/SimilarProducts';
import AuctionBidPanel from '@/components/AuctionBidPanel';
import DeliveryFormModal from '@/components/DeliveryFormModal';

// Import product images
import iphoneImg from '@/assets/product-iphone-15-pro.jpg';
import samsungImg from '@/assets/product-samsung-s24.jpg';
import macbookImg from '@/assets/product-macbook-pro.jpg';
import ipadImg from '@/assets/product-ipad-air.jpg';
import powerbankImg from '@/assets/product-powerbank.jpg';
import ringLightImg from '@/assets/product-ring-light.jpg';

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

  // Mock products data
  const products: Product[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max',
      price: 350000,
      originalPrice: 850000,
      category: 'Smartphones',
      rating: 4.9,
      images: [iphoneImg, samsungImg, macbookImg, ipadImg, powerbankImg],
      videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      description: 'Le dernier iPhone avec puce A17 Pro, écran Super Retina XDR 6.7", appareil photo 48MP et châssis en titane. Disponible en plusieurs couleurs.',
      reviews: [
        { id: '1', userName: 'Yves M.', rating: 5, comment: 'Incroyable performance ! Meilleur iPhone 📱✨', date: '2024-03-20', isVerifiedClient: true },
        { id: '2', userName: 'Claire D.', rating: 5, comment: 'Qualité exceptionnelle, je recommande ! 🔥', date: '2024-03-18', isVerifiedClient: true },
      ],
      isVerified: true,
      isUniqueStock: true,
      isAuction: true,
      auctionEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startingPrice: 280000,
      bids: [
        { id: 'b1', userName: 'Patrick K.', amount: 290000, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { id: 'b2', userName: 'Marie L.', amount: 310000, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
        { id: 'b3', userName: 'Jean B.', amount: 350000, timestamp: new Date(Date.now() - 30 * 60 * 1000) },
      ],
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24 Ultra',
      price: 380000,
      originalPrice: 900000,
      category: 'Smartphones',
      rating: 4.8,
      images: [samsungImg, iphoneImg, macbookImg],
      description: 'Smartphone premium avec Snapdragon 8 Gen 3, écran AMOLED 6.8", S Pen intégré et batterie 5000mAh. Performance exceptionnelle.',
      reviews: [
        { id: '1', userName: 'Patrick L.', rating: 5, comment: 'Le meilleur Android du marché ! 🚀', date: '2024-03-19', isVerifiedClient: true },
      ],
      isVerified: true,
      isUniqueStock: true,
      isAuction: true,
      auctionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      startingPrice: 300000,
      bids: [
        { id: 'b1', userName: 'Sophie M.', amount: 320000, timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        { id: 'b2', userName: 'Marc T.', amount: 380000, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      ],
    },
    {
      id: '3',
      name: 'MacBook Pro M3',
      price: 450000,
      originalPrice: 1250000,
      category: 'Ordinateurs',
      rating: 4.9,
      images: [macbookImg, ipadImg, iphoneImg, samsungImg],
      description: 'MacBook Pro 14" avec puce M3, 16GB RAM, 512GB SSD. Performances incroyables pour les professionnels créatifs.',
      reviews: [
        { id: '1', userName: 'Sophie K.', rating: 5, comment: 'Puissance incroyable ! Parfait pour le montage 💻✨', date: '2024-03-17', isVerifiedClient: true },
        { id: '2', userName: 'Marc B.', rating: 5, comment: 'Excellent rapport qualité-prix ! 👌', date: '2024-03-15', isVerifiedClient: true },
      ],
      isVerified: true,
      isUniqueStock: false,
    },
    {
      id: '4',
      name: 'iPad Air M2',
      price: 220000,
      originalPrice: 650000,
      category: 'Tablettes',
      rating: 4.7,
      images: [ipadImg, macbookImg, iphoneImg],
      description: 'iPad Air 11" avec puce M2, écran Liquid Retina, compatible Apple Pencil. Parfait pour le travail et le divertissement.',
      reviews: [
        { id: '1', userName: 'Marie T.', rating: 5, comment: 'Parfait pour dessiner et travailler ! 🎨', date: '2024-03-16', isVerifiedClient: true },
      ],
      isVerified: true,
      isUniqueStock: true,
    },
    {
      id: '5',
      name: 'Batterie Externe Anker 30000mAh',
      price: 15000,
      originalPrice: 35000,
      category: 'Accessoires',
      rating: 4.6,
      images: [powerbankImg, ringLightImg],
      description: 'Powerbank haute capacité avec charge rapide 65W, 3 ports USB. Idéal pour recharger tous vos appareils.',
      reviews: [
        { id: '1', userName: 'Jean P.', rating: 5, comment: 'Excellent produit, charge super rapide ! ⚡', date: '2024-03-14', isVerifiedClient: true },
      ],
      isVerified: false,
      isUniqueStock: true,
    },
    {
      id: '6',
      name: 'Ring Light LED 18 pouces',
      price: 25000,
      originalPrice: 55000,
      category: 'Accessoires',
      rating: 4.5,
      images: [ringLightImg, powerbankImg],
      description: 'Éclairage LED professionnel avec trépied, contrôle de luminosité et température de couleur. Parfait pour photo et vidéo.',
      reviews: [
        { id: '1', userName: 'Laura S.', rating: 5, comment: 'Lumière parfaite pour mes vidéos ! 💡📸', date: '2024-03-13', isVerifiedClient: true },
      ],
      isVerified: true,
      isUniqueStock: false,
    },
  ];

  const product = products.find(p => p.id === id) || products[0];
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
    <div className="min-h-screen bg-background pb-24">
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
              <span className="text-sm font-medium text-foreground ml-1">{product.rating}</span>
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
                  className="absolute bottom-2 right-2 h-7 w-7"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 right-2 z-50">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                )}
              </div>
              <Button onClick={handleSubmitComment} size="sm" className="buy-button">
                <Send className="h-4 w-4 mr-2" />
                Publier
              </Button>
            </div>
          )}
        </div>

        {/* Similar Products */}
        <div className="mt-3">
          <SimilarProducts 
            currentProductId={product.id}
            products={products.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              originalPrice: p.originalPrice,
              image: p.images[0],
              rating: p.rating,
              isVerified: p.isVerified
            }))}
          />
        </div>
      </div>

      {/* Fixed Bottom Action Bar - Xianyu Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-50">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* WhatsApp Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleWhatsAppClick}
            className="h-12 w-12 rounded-full flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[hsl(142_70%_45%)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </Button>

          {/* Add to Coupon Button */}
          <Button
            variant="outline"
            onClick={handleAddToCoupon}
            className="flex-1 h-12 rounded-full border-primary text-primary hover:bg-primary/10"
          >
            <Plus className="h-5 w-5 mr-2" />
            Coupon
          </Button>

          {/* Buy Now / Bid Button */}
          {product.isAuction ? (
            <Button
              onClick={() => document.querySelector('#auction-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex-[2] h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold"
            >
              <Gavel className="h-5 w-5 mr-2" />
              Enchérir
            </Button>
          ) : (
            <Button
              onClick={() => setShowDeliveryForm(true)}
              className="flex-[2] h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Acheter
            </Button>
          )}
        </div>
      </div>

      {/* Delivery Form Modal */}
      <DeliveryFormModal
        isOpen={showDeliveryForm}
        onClose={() => setShowDeliveryForm(false)}
        onSubmit={() => setShowDeliveryForm(false)}
        total={product.price}
        items={[{
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images[0],
          quantity: 1
        }]}
      />
    </div>
  );
};

export default ProductDetail;
