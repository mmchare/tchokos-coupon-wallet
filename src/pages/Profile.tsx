import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Mail, Phone, MapPin, Edit2, CreditCard, ShoppingBag, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Données mockées de l'utilisateur
  const [userData, setUserData] = useState({
    name: 'Jean Tchoko',
    email: 'jean.tchoko@example.cm',
    phone: '+237 6XX XXX XXX',
    address: 'Douala, Cameroun',
    walletBalance: 125000,
    totalOrders: 12,
    memberSince: 'Janvier 2024'
  });

  const orderHistory = [
    { id: '1', date: '15 Mars 2024', items: 3, total: 85000, status: 'Livré' },
    { id: '2', date: '10 Mars 2024', items: 2, total: 60000, status: 'Livré' },
    { id: '3', date: '5 Mars 2024', items: 1, total: 45000, status: 'En cours' },
  ];

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profil mis à jour !",
      description: "Vos informations ont été enregistrées",
    });
  };

  const handleLogout = () => {
    toast({
      title: "Déconnexion",
      description: "À bientôt sur TCHOKOS !",
    });
    setTimeout(() => navigate('/auth'), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
              <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Informations personnelles */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Informations personnelles</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="text-accent hover:bg-accent/10"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? 'Enregistrer' : 'Modifier'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  Nom complet
                </label>
                <Input
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  Email
                </label>
                <Input
                  value={userData.email}
                  onChange={(e) => setUserData({...userData, email: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  Téléphone
                </label>
                <Input
                  value={userData.phone}
                  onChange={(e) => setUserData({...userData, phone: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  Adresse
                </label>
                <Input
                  value={userData.address}
                  onChange={(e) => setUserData({...userData, address: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-600 to-green-500 border-0 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Solde du portefeuille</p>
                    <p className="text-2xl font-bold">{userData.walletBalance.toLocaleString()} F</p>
                  </div>
                  <CreditCard className="h-8 w-8 opacity-80" />
                </div>
                <Button
                  onClick={() => navigate('/recharge')}
                  variant="secondary"
                  className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  Recharger
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Commandes</p>
                    <p className="text-2xl font-bold text-foreground">{userData.totalOrders}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Membre depuis</p>
                    <p className="text-xl font-bold text-foreground">{userData.memberSince}</p>
                  </div>
                  <User className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historique des commandes */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Historique des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderHistory.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted border border-border hover:border-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Commande #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                      <p className="text-sm text-muted-foreground">{order.items} article(s)</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-foreground">{order.total.toLocaleString()} F</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Livré' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
