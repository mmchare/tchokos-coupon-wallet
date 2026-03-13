import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Upload, X, Image, Video, Link2, Wand2, Loader2, Sparkles, icons } from 'lucide-react';
import { useCategories, useCreateCategory, AVAILABLE_ICONS, AVAILABLE_COLORS, Category } from '@/hooks/useCategories';

// Dynamic icon component
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = icons[name as keyof typeof icons];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
};

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

  // Category management with database
  const { data: dbCategories = [], isLoading: categoriesLoading } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Package');
  const [newCategoryColor, setNewCategoryColor] = useState(AVAILABLE_COLORS[0]);

  // Magic Import state
  const [magicImportMode, setMagicImportMode] = useState(false);
  const [magicImportUrl, setMagicImportUrl] = useState('');
  const [isMagicImporting, setIsMagicImporting] = useState(false);

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
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setMagicImportMode(false);
    setMagicImportUrl('');
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

  // Magic Import function
  const handleMagicImport = async () => {
    if (!magicImportUrl.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer une URL", variant: "destructive" });
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(magicImportUrl)) {
      toast({ title: "Erreur", description: "URL invalide. Utilisez un lien complet (https://...)", variant: "destructive" });
      return;
    }

    setIsMagicImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('magic-import', {
        body: { url: magicImportUrl.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        toast({ 
          title: data.duplicate ? "Produit existant" : "Erreur", 
          description: data.error, 
          variant: "destructive" 
        });
        return;
      }

      // Fill form with imported data
      const importedData = data.data;
      setFormData({
        name: importedData.name || '',
        price: importedData.price?.toString() || '',
        original_price: importedData.original_price?.toString() || '',
        description: importedData.description || '',
        category: importedData.category || '',
        stock_available: '1',
        is_verified: true,
        is_auction: false,
        auction_end_date: '',
        images: importedData.images || [],
        video_url: '',
        source_link: importedData.source_link || magicImportUrl
      });

      setMagicImportMode(false);
      toast({ 
        title: "✨ Import réussi!", 
        description: data.ai_processed 
          ? "Produit analysé et traduit par l'IA" 
          : "Produit importé (traduction manuelle requise)"
      });

    } catch (error) {
      console.error('Magic import error:', error);
      toast({ 
        title: "Erreur d'import", 
        description: error instanceof Error ? error.message : "Erreur inconnue. Veuillez remplir manuellement.", 
        variant: "destructive" 
      });
    } finally {
      setIsMagicImporting(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (newCategoryName.trim()) {
      const trimmedCategory = newCategoryName.trim();
      const existingCat = dbCategories.find(c => c.name === trimmedCategory);
      
      if (!existingCat) {
        try {
          await createCategoryMutation.mutateAsync({
            name: trimmedCategory,
            icon: newCategoryIcon,
            bg_color: newCategoryColor.bg,
            icon_color: newCategoryColor.icon
          });
          toast({ title: "Succès", description: "Catégorie créée" });
        } catch (error) {
          toast({ title: "Erreur", description: "Impossible de créer la catégorie", variant: "destructive" });
        }
      }
      
      setFormData(prev => ({ ...prev, category: trimmedCategory }));
      setNewCategoryName('');
      setNewCategoryIcon('Package');
      setNewCategoryColor(AVAILABLE_COLORS[0]);
      setShowNewCategoryInput(false);
    }
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
      const { data: insertedData, error } = await supabase
        .from('products')
        .insert(productData)
        .select('id')
        .single();

      if (error) {
        toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
        return;
      }

      toast({ title: "Succès", description: "Produit créé. Traduction en cours..." });

      // Trigger automatic translation (fire-and-forget)
      if (insertedData?.id) {
        supabase.functions.invoke('translate-product', {
          body: { productId: insertedData.id }
        }).then(({ error: translateError }) => {
          if (translateError) {
            console.error('Translation error:', translateError);
            toast({ title: "⚠️ Traduction", description: "La traduction automatique a échoué. Vous pouvez réessayer.", variant: "destructive" });
          } else {
            toast({ title: "🌍 Traduction terminée", description: "Le produit est maintenant disponible en FR, EN et ZH" });
          }
        });
      }
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
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
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
                      <span className={product.is_auction ? "text-primary" : "text-muted-foreground"}>
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
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              {!editingProduct && (
                <span className="ml-auto">
                  <Button
                    type="button"
                    variant={magicImportMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMagicImportMode(!magicImportMode)}
                    className={magicImportMode ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : ""}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Magic Import
                  </Button>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Magic Import Section */}
          {!editingProduct && magicImportMode && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-semibold">Magic Import - Xianyu/Taobao/1688</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Collez l'URL du produit chinois. L'IA va extraire, traduire et créer automatiquement la fiche produit.
              </p>
              <div className="flex gap-2">
                <Input
                  value={magicImportUrl}
                  onChange={(e) => setMagicImportUrl(e.target.value)}
                  placeholder="https://m.tb.cn/... ou https://www.xianyu.com/..."
                  className="flex-1 border-purple-500/50 focus:border-purple-500"
                  disabled={isMagicImporting}
                />
                <Button
                  type="button"
                  onClick={handleMagicImport}
                  disabled={isMagicImporting || !magicImportUrl.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {isMagicImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </div>
              {isMagicImporting && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-purple-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Extraction et traduction en cours...</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Scraping du site • Traduction IA • Upload des images
                  </p>
                </div>
              )}
            </div>
          )}

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
                <label className="text-sm font-medium text-primary">
                  🔗 Lien Source Fournisseur Chinois *
                </label>
                <Input
                  value={formData.source_link}
                  onChange={(e) => setFormData({ ...formData, source_link: e.target.value })}
                  placeholder="https://www.1688.com/... ou https://taobao.com/..."
                  className="border-primary/50 focus:border-primary"
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
                {showNewCategoryInput ? (
                  <div className="space-y-3">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nom de la catégorie..."
                    />
                    
                    {/* Icon Selection */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Icône</label>
                      <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                        <SelectTrigger className="w-full bg-background">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${newCategoryColor.bg}`}>
                              <DynamicIcon name={newCategoryIcon} className={`h-3 w-3 ${newCategoryColor.icon}`} />
                            </div>
                            <span>{AVAILABLE_ICONS.find(i => i.name === newCategoryIcon)?.label || newCategoryIcon}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50 max-h-[280px]">
                          {AVAILABLE_ICONS.map((icon) => (
                            <SelectItem key={icon.name} value={icon.name}>
                              <div className="flex items-center gap-2">
                                <DynamicIcon name={icon.name} className="h-4 w-4" />
                                <span>{icon.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Color Selection */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Couleur</label>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_COLORS.slice(0, 12).map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setNewCategoryColor(color)}
                            className={`w-6 h-6 rounded-full ${color.bg} border-2 transition-all ${
                              newCategoryColor.name === color.name 
                                ? 'border-primary scale-110' 
                                : 'border-transparent hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleAddNewCategory}
                        disabled={createCategoryMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {createCategoryMutation.isPending ? 'Création...' : 'Créer'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      if (value === '__new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        setFormData({ ...formData, category: value });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Sélectionner une catégorie">
                        {formData.category && (
                          <div className="flex items-center gap-2">
                            {dbCategories.find(c => c.name === formData.category) && (
                              <div className={`w-5 h-5 rounded flex items-center justify-center ${dbCategories.find(c => c.name === formData.category)?.bg_color}`}>
                                <DynamicIcon 
                                  name={dbCategories.find(c => c.name === formData.category)?.icon || 'Package'} 
                                  className={`h-3 w-3 ${dbCategories.find(c => c.name === formData.category)?.icon_color}`} 
                                />
                              </div>
                            )}
                            <span>{formData.category}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50 max-h-[280px]">
                      {dbCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${cat.bg_color}`}>
                              <DynamicIcon name={cat.icon} className={`h-3.5 w-3.5 ${cat.icon_color}`} />
                            </div>
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Ajouter une nouvelle catégorie</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploadingImages ? 'Upload en cours...' : 'Glissez-déposez ou cliquez pour ajouter des images'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formats acceptés: JPG, PNG, WebP, AVIF, GIF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/*"
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
              <Button type="submit" className="bg-primary hover:bg-primary/90">
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
