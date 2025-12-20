import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Phone, Plus, Edit2, Trash2, Star, Home, Briefcase, Building } from 'lucide-react';
import { useDeliveryAddresses, DeliveryAddress } from '@/hooks/useDeliveryAddresses';

const LABEL_ICONS: Record<string, React.ReactNode> = {
  'Maison': <Home className="h-4 w-4" />,
  'Bureau': <Briefcase className="h-4 w-4" />,
  'Autre': <Building className="h-4 w-4" />
};

const LABELS = ['Maison', 'Bureau', 'Autre'];

interface AddressFormProps {
  initialData?: Partial<DeliveryAddress>;
  onSubmit: (data: { label: string; city: string; address: string; phone: string }) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const AddressForm = ({ initialData, onSubmit, onCancel, isEdit }: AddressFormProps) => {
  const [label, setLabel] = useState(initialData?.label || 'Maison');
  const [city, setCity] = useState(initialData?.city || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim() && address.trim() && phone.trim()) {
      onSubmit({ label, city, address, phone });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label selection */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Type d'adresse</label>
        <div className="flex gap-2">
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                label === l
                  ? 'border-vibrant-red bg-vibrant-red/10 text-vibrant-red'
                  : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {LABEL_ICONS[l]}
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Ville</label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ex: Douala, Yaoundé..."
          className="bg-input border-border"
          required
        />
      </div>

      {/* Address */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Adresse détaillée</label>
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Quartier, repères, description..."
          className="bg-input border-border min-h-[80px]"
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Téléphone WhatsApp</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237 6XX XX XX XX"
          className="bg-input border-border"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-vibrant-red hover:bg-vibrant-red/90 text-white"
        >
          {isEdit ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
};

const AddressManager = () => {
  const { addresses, isLoading, addAddress, updateAddress, deleteAddress, setDefault } = useDeliveryAddresses();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);

  const handleAdd = async (data: { label: string; city: string; address: string; phone: string }) => {
    await addAddress(data);
    setIsAddOpen(false);
  };

  const handleEdit = async (data: { label: string; city: string; address: string; phone: string }) => {
    if (editingAddress) {
      await updateAddress(editingAddress.id, data);
      setEditingAddress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="h-20 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address List */}
      {addresses.map((addr) => (
        <Card key={addr.id} className={`bg-card border-border ${addr.is_default ? 'ring-2 ring-vibrant-red' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {LABEL_ICONS[addr.label] || <MapPin className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-xs bg-vibrant-red/10 text-vibrant-red px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{addr.city}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{addr.address}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {addr.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!addr.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDefault(addr.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-vibrant-yellow"
                    title="Définir par défaut"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingAddress(addr)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAddress(addr.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Button */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter une adresse
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nouvelle adresse</DialogTitle>
          </DialogHeader>
          <AddressForm onSubmit={handleAdd} onCancel={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAddress} onOpenChange={(open) => !open && setEditingAddress(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier l'adresse</DialogTitle>
          </DialogHeader>
          {editingAddress && (
            <AddressForm 
              initialData={editingAddress} 
              onSubmit={handleEdit} 
              onCancel={() => setEditingAddress(null)}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      {addresses.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          Aucune adresse sauvegardée
        </p>
      )}
    </div>
  );
};

export default AddressManager;
