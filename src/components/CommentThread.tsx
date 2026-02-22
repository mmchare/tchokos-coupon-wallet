import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare, ChevronDown, ChevronUp, Send, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  likes_count: number;
  created_at: string;
  parent_id: string | null;
  image_url?: string | null;
  replies?: Comment[];
  user_has_liked?: boolean;
}

interface CommentThreadProps {
  comment: Comment;
  onReplyAdded: () => void;
  productId: string;
  depth?: number;
}

const CommentThread = ({ comment, onReplyAdded, productId, depth = 0 }: CommentThreadProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(depth < 1);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liked, setLiked] = useState(comment.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(comment.likes_count);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Connectez-vous pour liker", variant: "destructive" });
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', comment.id)
        .eq('user_id', user.id);
      if (!error) {
        setLiked(false);
        setLikesCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .insert({ comment_id: comment.id, user_id: user.id });
      if (!error) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !user) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('product_comments').insert({
      product_id: productId,
      user_id: user.id,
      user_name: profile?.full_name || 'Utilisateur',
      content: replyContent.trim(),
      parent_id: comment.id,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer la réponse", variant: "destructive" });
    } else {
      setReplyContent('');
      setShowReplyForm(false);
      onReplyAdded();
    }
    setIsSubmitting(false);
  };

  const maxDepth = 3;
  const replies = comment.replies || [];

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l-2 border-border' : ''}`}>
      <div className="py-3">
        {/* Comment Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {comment.user_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{comment.user_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
            {comment.content && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>}
            {comment.image_url && (
              <img
                src={comment.image_url}
                alt="Shared media"
                className="mt-2 rounded-lg max-w-[240px] max-h-[200px] object-cover border border-border cursor-pointer"
                onClick={() => window.open(comment.image_url!, '_blank')}
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  liked ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-primary' : ''}`} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </button>
              {depth < maxDepth && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  Répondre
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && user && (
          <div className="mt-3 ml-11 space-y-2">
            <Textarea
              placeholder={`Répondre à ${comment.user_name}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="bg-muted/50 border-border min-h-[60px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
                className="gap-1"
              >
                <Send className="h-3 w-3" />
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div>
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 ml-11 mb-2"
            >
              <ChevronDown className="h-3 w-3" />
              {replies.length} réponse{replies.length > 1 ? 's' : ''}
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowReplies(false)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 ml-11 mb-1"
              >
                <ChevronUp className="h-3 w-3" />
                Masquer les réponses
              </button>
              {replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  onReplyAdded={onReplyAdded}
                  productId={productId}
                  depth={depth + 1}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
