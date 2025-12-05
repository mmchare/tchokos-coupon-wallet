import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Star, Plus, Send, Smile, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import EmojiPicker from '@/components/EmojiPicker';
import ProductImageGallery from '@/components/ProductImageGallery';

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
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCoupon } = useCoupon();
  const [comment, setComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRating, setUserRating] = useState(0);

  // Mock products data with multiple images
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
        { id: '1', userName: 'Yves M.', rating: 5, comment: 'Incroyable performance ! Meilleur iPhone 📱✨', date: '2024-03-20' },
        { id: '2', userName: 'Claire D.', rating: 5, comment: 'Qualité exceptionnelle, je recommande ! 🔥', date: '2024-03-18' },
      ],
      isVerified: true,
      isUniqueStock: true,
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
        { id: '1', userName: 'Patrick L.', rating: 5, comment: 'Le meilleur Android du marché ! 🚀', date: '2024-03-19' },
      ],
      isVerified: true,
      isUniqueStock: true,
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
        { id: '1', userName: 'Sophie K.', rating: 5, comment: 'Puissance incroyable ! Parfait pour le montage 💻✨', date: '2024-03-17' },
        { id: '2', userName: 'Marc B.', rating: 5, comment: 'Excellent rapport qualité-prix ! 👌', date: '2024-03-15' },
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
        { id: '1', userName: 'Marie T.', rating: 5, comment: 'Parfait pour dessiner et travailler ! 🎨', date: '2024-03-16' },
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
        { id: '1', userName: 'Jean P.', rating: 5, comment: 'Excellent produit, charge super rapide ! ⚡', date: '2024-03-14' },
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
        { id: '1', userName: 'Laura S.', rating: 5, comment: 'Lumière parfaite pour mes vidéos ! 💡📸', date: '2024-03-13' },
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

  const handleBuyNow = () => {
    toast({
      title: "Acheter maintenant",
      description: "Redirection vers le formulaire de livraison...",
    });
  };

  const handleSubmitComment = () => {
    if (!comment.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un commentaire",
        variant: "destructive"
      });
      return;
    }

    if (userRating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez donner une note",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Commentaire ajouté !",
      description: "Merci pour votre avis",
    });

    setComment('');
    setUserRating(0);
  };

  const handleEmojiSelect = (emoji: string) => {
    setComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleWhatsAppClick = () => {
    const message = `Bonjour PINBAOO, je suis intéressé(e) par le produit: ${product.name} au prix de ${product.price.toLocaleString()} F. J'aimerais avoir plus d'informations.`;
    const whatsappUrl = `https://wa.me/237690000000?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détails du produit</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Product Image Gallery & Info */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Gallery */}
                <ProductImageGallery
                  images={product.images}
                  videoUrl={product.videoUrl}
                  productName={product.name}
                  category={product.category}
                  discount={discount}
                  isVerified={product.isVerified}
                  isUniqueStock={product.isUniqueStock}
                />

                {/* Info */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{product.name}</h2>
                    <div className="flex items-center space-x-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(product.rating) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="text-muted-foreground">
                        {product.rating} ({product.reviews.length} avis)
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-foreground">
                        {product.price.toLocaleString()} F
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          {product.originalPrice.toLocaleString()} F
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button 
                      onClick={handleBuyNow}
                      className="buy-button w-full"
                    >
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      Acheter Maintenant
                    </Button>

                    <Button 
                      onClick={handleAddToCoupon}
                      className="coupon-button w-full"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Ajouter au Coupon
                    </Button>
                    
                    <Button
                      onClick={handleWhatsAppClick}
                      className="whatsapp-button w-full justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Contacter sur WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Avis des clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Reviews */}
              <div className="space-y-4">
                {product.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-accent text-accent-foreground">
                          {review.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground">{review.userName}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Review Form */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground">Laisser un avis</h3>
                
                {/* Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Votre note</label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`h-6 w-6 cursor-pointer ${
                            star <= userRating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Votre commentaire</label>
                  <div className="relative">
                    <Textarea
                      placeholder="Partagez votre expérience avec ce produit..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="bg-input border-border text-foreground placeholder-muted-foreground min-h-[100px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute bottom-2 right-2 h-8 w-8"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                    
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-2 z-50">
                        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleSubmitComment}
                  className="coupon-button w-full sm:w-auto"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publier l'avis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
