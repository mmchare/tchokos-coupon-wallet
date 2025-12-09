import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  description: string | null;
  category: string | null;
  stock_available: number;
  is_verified: boolean;
  is_auction: boolean;
  auction_end_date: string | null;
  images: string[] | null;
  video_url: string | null;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    original_price: '',
    description: '',
    category: '',
    stock_available: '1',
    is_verified: false,
    is_auction: false,
    auction_end_date: '',
    images: '',
    video_url: ''
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      original_price: '',
      description: '',
      category: '',
      stock_available: '1',
      is_verified: false,
      is_auction: false,
      auction_end_date: '',
      images: '',
      video_url: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      description: product.description || '',
      category: product.category || '',
      stock_available: product.stock_available.toString(),
      is_verified: product.is_verified,
      is_auction: product.is_auction,
      auction_end_date: product.auction_end_date?.split('T')[0] || '',
      images: product.images?.join(', ') || '',
      video_url: product.video_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      description: formData.description || null,
      category: formData.category || null,
      stock_available: parseInt(formData.stock_available),
      is_verified: formData.is_verified,
      is_auction: formData.is_auction,
      auction_end_date: formData.is_auction && formData.auction_end_date 
        ? new Date(formData.auction_end_date).toISOString() 
        : null,
      images: formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      video_url: formData.video_url || null
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de modifier le produit", variant: "destructive" });
        return;
      }

      // Log action
      await supabase.rpc('log_admin_action', {
        p_action: 'UPDATE_PRODUCT',
        p_target_type: 'product',
        p_target_id: editingProduct.id,
        p_details: { name: productData.name }
      });

      toast({ title: "Succès", description: "Produit modifié" });
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
        return;
      }

      toast({ title: "Succès", description: "Produit créé" });
    }

    setIsDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le produit", variant: "destructive" });
      return;
    }

    // Log action
    await supabase.rpc('log_admin_action', {
      p_action: 'DELETE_PRODUCT',
      p_target_type: 'product',
      p_target_id: product.id,
      p_details: { name: product.name }
    });

    toast({ title: "Succès", description: "Produit supprimé" });
    fetchProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produits</h1>
          <p className="text-muted-foreground">Gérez le catalogue de produits</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-jinbao-red hover:bg-jinbao-red/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Vérifié</TableHead>
                <TableHead>Enchère</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.price.toLocaleString()} F</TableCell>
                    <TableCell>{product.stock_available}</TableCell>
                    <TableCell>
                      <span className={product.is_verified ? "text-green-500" : "text-muted-foreground"}>
                        {product.is_verified ? "✓ Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={product.is_auction ? "text-jinbao-red" : "text-muted-foreground"}>
                        {product.is_auction ? "Oui" : "Non"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Nom du produit *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Prix (FCAF) *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Prix original (FCAF)</label>
                <Input
                  type="number"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Stock disponible</label>
                <Input
                  type="number"
                  value={formData.stock_available}
                  onChange={(e) => setFormData({ ...formData, stock_available: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium">URLs des images (séparées par des virgules)</label>
                <Textarea
                  value={formData.images}
                  onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                  placeholder="https://..., https://..."
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium">URL de la vidéo</label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_verified"
                  checked={formData.is_verified}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_verified: !!checked })}
                />
                <label htmlFor="is_verified" className="text-sm font-medium">
                  Vérifié par JinBao
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_auction"
                  checked={formData.is_auction}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_auction: !!checked })}
                />
                <label htmlFor="is_auction" className="text-sm font-medium">
                  Produit aux enchères
                </label>
              </div>

              {formData.is_auction && (
                <div className="col-span-2">
                  <label className="text-sm font-medium">Date de fin d'enchère</label>
                  <Input
                    type="datetime-local"
                    value={formData.auction_end_date}
                    onChange={(e) => setFormData({ ...formData, auction_end_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-jinbao-red hover:bg-jinbao-red/90">
                {editingProduct ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
