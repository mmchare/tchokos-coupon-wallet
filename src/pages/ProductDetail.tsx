import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Plus, Send, Smile } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import EmojiPicker from '@/components/EmojiPicker';

// Import product images
import sneakersImg from '@/assets/product-sneakers-1.jpg';
import tshirtImg from '@/assets/product-tshirt-1.jpg';
import bagImg from '@/assets/product-bag-1.jpg';
import heelsImg from '@/assets/product-heels-1.jpg';

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
  image: string;
  description: string;
  reviews: Review[];
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCoupon } = useCoupon();
  const [comment, setComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRating, setUserRating] = useState(0);

  // Mock products data
  const products: Product[] = [
    {
      id: '1',
      name: 'Sneakers Premium Noir',
      price: 45000,
      originalPrice: 60000,
      category: 'Chaussures',
      rating: 4.8,
      image: sneakersImg,
      description: 'Des sneakers premium en cuir véritable avec semelle confortable. Design moderne et élégant, parfait pour toutes occasions. Disponible en plusieurs tailles.',
      reviews: [
        { id: '1', userName: 'Marie K.', rating: 5, comment: 'Excellente qualité ! Très confortables 😍', date: '2024-03-15' },
        { id: '2', userName: 'Jean P.', rating: 4, comment: 'Bon rapport qualité-prix, design top 👌', date: '2024-03-10' },
      ]
    },
    {
      id: '2',
      name: 'T-Shirt Designer Blanc',
      price: 15000,
      category: 'Vêtements',
      rating: 4.6,
      image: tshirtImg,
      description: 'T-shirt en coton premium, coupe moderne et confortable. Idéal pour un look décontracté et stylé.',
      reviews: [
        { id: '1', userName: 'Sophie L.', rating: 5, comment: 'Super confortable ! 🔥', date: '2024-03-18' },
      ]
    },
    {
      id: '3',
      name: 'Sac à Main Cuir Premium',
      price: 75000,
      originalPrice: 95000,
      category: 'Accessoires',
      rating: 4.9,
      image: bagImg,
      description: 'Sac à main en cuir véritable, spacieux et élégant. Plusieurs compartiments pour une organisation optimale.',
      reviews: [
        { id: '1', userName: 'Alice B.', rating: 5, comment: 'Magnifique sac, très pratique ! 💼✨', date: '2024-03-20' },
        { id: '2', userName: 'Emma D.', rating: 5, comment: 'Qualité exceptionnelle, je recommande ! 👜', date: '2024-03-12' },
      ]
    },
    {
      id: '4',
      name: 'Escarpins Rouge Élégants',
      price: 55000,
      category: 'Chaussures',
      rating: 4.7,
      image: heelsImg,
      description: 'Escarpins élégants en cuir rouge, talon confortable de 8cm. Parfait pour les occasions spéciales.',
      reviews: [
        { id: '1', userName: 'Laura M.', rating: 5, comment: 'Magnifiques ! 👠❤️', date: '2024-03-14' },
      ]
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
      image: product.image,
    });
    toast({
      title: "Produit ajouté !",
      description: `${product.name} a été ajouté à votre coupon`,
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
          {/* Product Image & Info */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-64 md:h-96 object-cover rounded-lg"
                  />
                  {discount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                      -{discount}%
                    </Badge>
                  )}
                  <Badge variant="secondary" className="absolute top-2 left-2 bg-black/80 text-white">
                    {product.category}
                  </Badge>
                </div>

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

                  {/* Add to Coupon Button */}
                  <Button 
                    onClick={handleAddToCoupon}
                    className="coupon-button w-full"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter au Coupon
                  </Button>
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
