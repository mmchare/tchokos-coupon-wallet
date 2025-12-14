import { Bell, Package, Megaphone, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  message_type: 'STATUT_COMMANDE' | 'CAMPAGNE';
  message_body: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
}

const NotificationsList = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead,
  unreadCount 
}: NotificationsListProps) => {
  
  if (notifications.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center">
            Aucune notification pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with Mark All as Read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-primary hover:text-primary/80"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Tout marquer lu
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.map((notification) => (
        <Card 
          key={notification.id}
          className={`border-border transition-all ${
            !notification.is_read 
              ? 'bg-primary/5 border-l-4 border-l-primary' 
              : 'bg-card'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`p-2 rounded-full flex-shrink-0 ${
                notification.message_type === 'STATUT_COMMANDE'
                  ? 'bg-jinbao-blue/10 text-jinbao-blue'
                  : 'bg-vibrant-yellow/10 text-vibrant-yellow'
              }`}>
                {notification.message_type === 'STATUT_COMMANDE' ? (
                  <Package className="h-5 w-5" />
                ) : (
                  <Megaphone className="h-5 w-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {notification.message_type === 'STATUT_COMMANDE' 
                      ? 'Commande' 
                      : 'Campagne'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {notification.message_body}
                </p>
              </div>

              {/* Mark as read button */}
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NotificationsList;
