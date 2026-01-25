/**
 * JinBao AI Chat - Interactive chat with the mascot
 * Uses Mistral AI to answer questions about the JinBao platform
 * Features persistent chat history and personalized recommendations
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, MessageCircle, Minimize2, Trash2, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import mascotImage from '@/assets/jinbao-mascot.jpg';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
}

interface JinBaoChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  { key: 'q1', text: 'Comment fonctionne le système de parrainage ?' },
  { key: 'q2', text: 'Comment passer une commande ?' },
  { key: 'q3', text: 'Quels sont les modes de paiement ?' },
  { key: 'q4', text: 'Recommande-moi des produits' },
];

const JinBaoChat = ({ isOpen, onClose }: JinBaoChatProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from database
  const loadChatHistory = useCallback(async () => {
    if (!user) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: t('chat.welcomeMessage'),
        timestamp: new Date()
      }]);
      setIsLoadingHistory(false);
      return;
    }

    try {
      // Use type assertion to bypass TypeScript restriction on new table
      const { data, error } = await (supabase
        .from('jinbao_chat_history' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50) as any);

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        setMessages(loadedMessages);
      } else {
        // No history, show welcome message
        const welcomeMessage: Message = {
          id: '1',
          role: 'assistant',
          content: t('chat.welcomeMessage'),
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        // Save welcome message to history
        await saveMessageToHistory(welcomeMessage);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: t('chat.welcomeMessage'),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, t]);

  // Save message to database
  const saveMessageToHistory = async (message: Message) => {
    if (!user) return;

    try {
      // Use type assertion to bypass TypeScript restriction on new table
      await (supabase
        .from('jinbao_chat_history' as any)
        .insert({
          user_id: user.id,
          role: message.role,
          content: message.content
        }) as any);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    if (!user) return;

    try {
      // Use type assertion to bypass TypeScript restriction on new table
      await (supabase
        .from('jinbao_chat_history' as any)
        .delete()
        .eq('user_id', user.id) as any);

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('chat.welcomeMessage'),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      await saveMessageToHistory(welcomeMessage);
      setRecommendedProducts([]);
      toast.success('Historique effacé');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Load history on mount
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, loadChatHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && !isLoadingHistory) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, isLoadingHistory]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message to history
    await saveMessageToHistory(userMessage);

    try {
      // Call the edge function for AI response with user context
      const { data, error } = await supabase.functions.invoke('jinbao-chat', {
        body: { 
          message: text.trim(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          userId: user?.id
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.response || t('chat.errorMessage'),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessageToHistory(assistantMessage);

      // Update recommended products if returned
      if (data?.recommendedProducts && data.recommendedProducts.length > 0) {
        setRecommendedProducts(data.recommendedProducts);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback response if edge function fails
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getFallbackResponse(text),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
      await saveMessageToHistory(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (question: string): string => {
    const q = question.toLowerCase();
    
    if (q.includes('parrainage') || q.includes('code')) {
      return "🎁 Le système de parrainage JinBao vous permet de gagner 1000 FCFA pour chaque ami parrainé ! Votre ami reçoit aussi 500 FCFA de bonus. Rendez-vous sur votre profil pour trouver votre code de parrainage.";
    }
    if (q.includes('commande') || q.includes('commander') || q.includes('acheter')) {
      return "🛒 Pour commander sur JinBao :\n1. Ajoutez des produits à votre coupon\n2. Cliquez sur 'Voir mon coupon'\n3. Confirmez votre adresse de livraison\n4. Payez avec votre solde ou un autre moyen\n\nC'est simple et rapide !";
    }
    if (q.includes('paiement') || q.includes('payer')) {
      return "💳 JinBao accepte plusieurs modes de paiement : Mobile Money (MTN, Orange), votre solde JinBao, et le paiement à la livraison dans certaines zones.";
    }
    if (q.includes('livraison') || q.includes('suivre') || q.includes('suivi')) {
      return "📦 Suivez votre commande dans la section 'Mes commandes'. Vous recevrez des notifications à chaque étape : confirmation, préparation, expédition et livraison.";
    }
    if (q.includes('enchère') || q.includes('auction')) {
      return "🔥 Les enchères JinBao vous permettent d'obtenir des produits à prix réduit ! Placez votre offre et si vous êtes le plus offrant à la fin du temps imparti, le produit est à vous !";
    }
    if (q.includes('recommande') || q.includes('suggestion') || q.includes('produit')) {
      return "🛍️ Pour des recommandations personnalisées, connectez-vous à votre compte ! Je pourrai alors vous suggérer des produits basés sur vos achats et préférences.";
    }
    
    return "Je suis JinBao, votre assistant ! 🐼 Je peux vous aider avec vos commandes, le parrainage, les paiements et plus encore. N'hésitez pas à me poser des questions !";
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const goToProduct = (productId: string) => {
    navigate(`/product/${productId}`);
    onClose();
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-vibrant-red shadow-lg hover:scale-110 transition-transform"
        >
          <img
            src={mascotImage}
            alt="JinBao"
            className="w-full h-full object-cover object-top scale-125"
          />
          <div className="absolute -top-1 -right-1 bg-vibrant-red text-white rounded-full p-1 animate-pulse">
            <MessageCircle className="h-3 w-3" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-vibrant-red to-jinbao-red p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
            <img
              src={mascotImage}
              alt="JinBao"
              className="w-full h-full object-cover object-top scale-125"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">JinBao Assistant</h3>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {t('chat.online')}
            </p>
          </div>
          {user && (
            <button
              onClick={clearHistory}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Effacer l'historique"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[280px] p-3" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-vibrant-red text-white rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Recommended products */}
        {recommendedProducts.length > 0 && (
          <div className="px-3 pb-2 border-t border-border pt-2">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              Produits recommandés
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recommendedProducts.slice(0, 3).map((product) => (
                <button
                  key={product.id}
                  onClick={() => goToProduct(product.id)}
                  className="flex-shrink-0 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-lg px-2 py-1.5 transition-colors text-left"
                >
                  <p className="font-medium truncate max-w-[100px]">{product.name}</p>
                  <p className="text-vibrant-red font-semibold">{product.price.toLocaleString()} FCFA</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick questions */}
        {messages.length <= 1 && !isLoadingHistory && (
          <div className="px-3 pb-2">
            <p className="text-xs text-muted-foreground mb-2">{t('chat.quickQuestions')}</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.key}
                  onClick={() => handleQuickQuestion(q.text)}
                  className="text-xs bg-muted hover:bg-muted/80 text-foreground rounded-full px-2.5 py-1 transition-colors"
                >
                  {q.text.slice(0, 25)}...
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-input border-border text-sm"
              disabled={isLoading || isLoadingHistory}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || isLoadingHistory}
              className="bg-vibrant-red hover:bg-vibrant-red/90 text-white shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JinBaoChat;
