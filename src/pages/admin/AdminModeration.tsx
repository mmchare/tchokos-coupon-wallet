import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

const AdminModeration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Modération</h1>
        <p className="text-muted-foreground">Modération des avis utilisateurs</p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Module de modération
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ce module permettra de modérer les avis et commentaires des utilisateurs.
              Il sera disponible une fois que le système d'avis sera implémenté.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminModeration;
