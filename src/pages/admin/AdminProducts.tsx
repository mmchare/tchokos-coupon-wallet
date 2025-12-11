import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Upload, X, Image, Video, Link2 } from 'lucide-react';

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
  source_link: string | null;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
    images: [] as string[],
    video_url: '',
    source_link: ''
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
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
      images: [],
      video_url: '',
      source_link: ''
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
      images: product.images || [],
      video_url: product.video_url || '',
      source_link: product.source_link || ''
    });
    setIsDialogOpen(true);
  };

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('product-media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const url = await uploadFile(file, 'image');
      if (url) {
        uploadedUrls.push(url);
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      toast({ title: "Succès", description: `${uploadedUrls.length} image(s) uploadée(s)` });
    }

    setUploadingImages(false);
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('video/')) {
      toast({ title: "Erreur", description: "Le fichier doit être une vidéo", variant: "destructive" });
      return;
    }

    setUploadingVideo(true);
    const url = await uploadFile(file, 'video');
    
    if (url) {
      setFormData(prev => ({ ...prev, video_url: url }));
      toast({ title: "Succès", description: "Vidéo uploadée" });
    } else {
      toast({ title: "Erreur", description: "Erreur lors de l'upload", variant: "destructive" });
    }

    setUploadingVideo(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate source_link (required)
    if (!formData.source_link) {
      toast({ 
        title: "Erreur", 
        description: "Le lien source fournisseur chinois est obligatoire", 
        variant: "destructive" 
      });
      return;
    }

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
      images: formData.images.length > 0 ? formData.images : [],
      video_url: formData.video_url || null,
      source_link: formData.source_link
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
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>
                      {product.source_link ? (
                        <a
                          href={product.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-jinbao-blue hover:underline flex items-center gap-1"
                        >
                          <Link2 className="h-3 w-3" />
                          Voir
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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

              {/* Source Link - Required */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-jinbao-red">
                  🔗 Lien Source Fournisseur Chinois *
                </label>
                <Input
                  value={formData.source_link}
                  onChange={(e) => setFormData({ ...formData, source_link: e.target.value })}
                  placeholder="https://www.1688.com/... ou https://taobao.com/..."
                  className="border-jinbao-red/50 focus:border-jinbao-red"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ce lien est obligatoire pour permettre l'achat chez le fournisseur après commande client.
                </p>
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

              {/* Image Upload Section */}
              <div className="col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Photos du produit
                </label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-jinbao-red bg-jinbao-red/10' 
                      : 'border-border hover:border-jinbao-red/50'
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploadingImages ? 'Upload en cours...' : 'Glissez-déposez ou cliquez pour ajouter des images'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                </div>

                {/* Image Previews */}
                {formData.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="h-20 w-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Upload Section */}
              <div className="col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Vidéo du produit
                </label>
                
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="flex-1"
                  >
                    {uploadingVideo ? 'Upload en cours...' : 'Uploader une vidéo'}
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleVideoUpload(e.target.files)}
                    className="hidden"
                  />
                </div>
                
                {formData.video_url && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded">
                    <Video className="h-4 w-4 text-jinbao-blue" />
                    <span className="text-sm truncate flex-1">{formData.video_url}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, video_url: '' })}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
