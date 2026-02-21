import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, MessageCircle, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CommentThread, { type Comment } from '@/components/CommentThread';

const ProductForum = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!id) return;

    // Fetch all comments for this product
    const { data, error } = await supabase
      .from('product_comments')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // Fetch user likes
    let userLikes: string[] = [];
    if (user) {
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id);
      userLikes = likesData?.map(l => l.comment_id) || [];
    }

    // Build nested comment tree
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create all comments
    (data || []).forEach((c: any) => {
      commentMap.set(c.id, {
        id: c.id,
        user_id: c.user_id,
        user_name: c.user_name,
        content: c.content,
        likes_count: c.likes_count,
        created_at: c.created_at,
        parent_id: c.parent_id,
        replies: [],
        user_has_liked: userLikes.includes(c.id),
      });
    });

    // Second pass: build tree
    commentMap.forEach((comment) => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        const parent = commentMap.get(comment.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else if (!comment.parent_id) {
        rootComments.push(comment);
      }
    });

    // Sort replies by date ascending
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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !id) {
      if (!user) {
        toast({ title: "Connectez-vous pour commenter", variant: "destructive" });
        navigate('/auth');
      }
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('product_comments').insert({
      product_id: id,
      user_id: user.id,
      user_name: profile?.full_name || 'Utilisateur',
      content: newComment.trim(),
      parent_id: null,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de poster le commentaire", variant: "destructive" });
    } else {
      setNewComment('');
      fetchComments();
    }
    setIsSubmitting(false);
  };

  // Count total comments including replies
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
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={productImage}
              alt={productName}
              className="h-10 w-10 rounded-lg object-cover border border-border flex-shrink-0"
            />
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

      {/* New Comment Form */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="space-y-2">
          <Textarea
            placeholder={user ? "Lancez une discussion, posez une question..." : "Connectez-vous pour participer..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-muted/50 border-border min-h-[70px] text-sm resize-none"
            disabled={!user}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting || !user}
              size="sm"
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Publier
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="px-4">
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
              <CommentThread
                key={comment.id}
                comment={comment}
                onReplyAdded={fetchComments}
                productId={id!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductForum;
