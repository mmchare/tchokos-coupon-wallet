import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, MessageCircle, Loader2, Users, Image, Smile, Sticker } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CommentThread, { type Comment } from '@/components/CommentThread';
import EmojiPicker from '@/components/EmojiPicker';
import GifStickerPicker from '@/components/GifStickerPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ProductForum = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('product_comments')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    let userLikes: string[] = [];
    if (user) {
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id);
      userLikes = likesData?.map(l => l.comment_id) || [];
    }

    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    (data || []).forEach((c: any) => {
      commentMap.set(c.id, {
        id: c.id,
        user_id: c.user_id,
        user_name: c.user_name,
        content: c.content,
        likes_count: c.likes_count,
        created_at: c.created_at,
        parent_id: c.parent_id,
        image_url: c.image_url,
        replies: [],
        user_has_liked: userLikes.includes(c.id),
      });
    });

    commentMap.forEach((comment) => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        const parent = commentMap.get(comment.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else if (!comment.parent_id) {
        rootComments.push(comment);
      }
    });

    const sortReplies = (comments: Comment[]) => {
      comments.forEach(c => {
        if (c.replies && c.replies.length > 0) {
          c.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          sortReplies(c.replies);
        }
      });
    };
    sortReplies(rootComments);
    setComments(rootComments);
  }, [id, user]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('products')
        .select('name, images')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        setProductName(data.name);
        setProductImage(data.images?.[0] || '/placeholder.svg');
      }
    };

    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchProduct(), fetchComments()]);
      setIsLoading(false);
    };

    init();
  }, [id, fetchComments]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image trop grande", description: "Max 5 Mo", variant: "destructive" });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `forum/${id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-media').upload(path, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data } = supabase.storage.from('product-media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmitComment = async () => {
    if ((!newComment.trim() && !selectedImage) || !user || !id) {
      if (!user) {
        toast({ title: "Connectez-vous pour commenter", variant: "destructive" });
        navigate('/auth');
      }
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;

    if (selectedImage) {
      setIsUploading(true);
      imageUrl = await uploadImage(selectedImage);
      setIsUploading(false);
      if (!imageUrl) {
        toast({ title: "Erreur upload", description: "Impossible d'envoyer l'image", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from('product_comments').insert({
      product_id: id,
      user_id: user.id,
      user_name: profile?.full_name || 'Utilisateur',
      content: newComment.trim(),
      parent_id: null,
      image_url: imageUrl,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de poster le commentaire", variant: "destructive" });
    } else {
      setNewComment('');
      setSelectedImage(null);
      setImagePreview(null);
      fetchComments();
    }
    setIsSubmitting(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  const handleStickerSelect = (sticker: string) => {
    setNewComment(prev => prev + sticker);
  };

  const countAll = (comments: Comment[]): number => {
    return comments.reduce((acc, c) => acc + 1 + countAll(c.replies || []), 0);
  };
  const totalComments = countAll(comments);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={productImage} alt={productName} className="h-10 w-10 rounded-lg object-cover border border-border flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">Discussion</h1>
              <p className="text-xs text-muted-foreground truncate">{productName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span>{totalComments}</span>
          </div>
        </div>
      </header>

      {/* Comments List - scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Aucune discussion</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Soyez le premier à lancer une discussion sur ce produit !
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <CommentThread key={comment.id} comment={comment} onReplyAdded={fetchComments} productId={id!} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Input Bar */}
      <div className="sticky bottom-0 z-40 bg-card border-t border-border px-3 py-2 safe-area-bottom">
        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
            <button
              onClick={() => { setSelectedImage(null); setImagePreview(null); }}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/gif"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={!user}>
              <Image className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!user}>
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-0 border-0 shadow-none bg-transparent">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!user}>
                  <Sticker className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-0 border-0 shadow-none bg-transparent">
                <GifStickerPicker onSelect={handleStickerSelect} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Text input */}
          <Textarea
            placeholder={user ? "Votre message..." : "Connectez-vous..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-muted/50 border-border min-h-[40px] max-h-[120px] text-sm resize-none flex-1 py-2"
            disabled={!user}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />

          {/* Send */}
          <Button
            onClick={handleSubmitComment}
            disabled={(!newComment.trim() && !selectedImage) || isSubmitting || !user}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductForum;
