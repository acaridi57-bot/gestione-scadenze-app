import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, Upload, ChevronRight, ChevronDown, FolderMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useCategories, Category } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICONS = [
  { value: 'circle', label: '⚪' },
  { value: 'home', label: '🏠' },
  { value: 'car', label: '🚗' },
  { value: 'utensils', label: '🍽️' },
  { value: 'shopping-bag', label: '🛍️' },
  { value: 'heart', label: '❤️' },
  { value: 'briefcase', label: '💼' },
  { value: 'plane', label: '✈️' },
  { value: 'gift', label: '🎁' },
  { value: 'music', label: '🎵' },
  { value: 'book', label: '📚' },
  { value: 'phone', label: '📱' },
  { value: 'tv', label: '📺' },
  { value: 'gamepad', label: '🎮' },
  { value: 'coffee', label: '☕' },
  { value: 'pill', label: '💊' },
  { value: 'graduation-cap', label: '🎓' },
  { value: 'dumbbell', label: '🏋️' },
  { value: 'dog', label: '🐕' },
  { value: 'baby', label: '👶' },
  { value: 'wallet', label: '💰' },
  { value: 'credit-card', label: '💳' },
  { value: 'piggy-bank', label: '🐷' },
  { value: 'receipt', label: '🧾' },
];

const COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
  const { categories, addCategory, updateCategory, deleteCategory, getSubcategories, hasSubcategories } = useCategories();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'entrata' | 'uscita'>('uscita');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const resetForm = () => {
    setName('');
    setType('uscita');
    setIcon('');
    setColor('#6366f1');
    setCustomIconUrl(null);
    setParentId(null);
    setEditingCategory(null);
    setIsAdding(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon || 'circle');
    setColor(category.color || '#6366f1');
    setCustomIconUrl(category.custom_icon_url || null);
    setParentId(category.parent_id || null);
    setIsAdding(false);
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('L\'immagine deve essere inferiore a 1MB');
      return;
    }

    setIsUploadingIcon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('category-icons')
        .getPublicUrl(fileName);

      setCustomIconUrl(publicUrl);
      setIcon('custom'); // Set icon to custom to indicate custom icon is used
      toast.success('Icona caricata con successo');
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Errore durante il caricamento dell\'icona');
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomIcon = () => {
    setCustomIconUrl(null);
    setIcon('circle');
  };

  const toggleSelectForDelete = (categoryId: string) => {
    const newSelected = new Set(selectedForDelete);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedForDelete(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.size === 0) return;
    
    try {
      for (const id of selectedForDelete) {
        await deleteCategory.mutateAsync(id);
      }
      toast.success(`${selectedForDelete.size} categorie eliminate`);
      setSelectedForDelete(new Set());
      setShowBulkDeleteConfirm(false);
      if (editingCategory && selectedForDelete.has(editingCategory.id)) {
        resetForm();
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per la categoria');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: name.trim(),
          type,
          icon: customIconUrl ? 'custom' : icon,
          color,
          custom_icon_url: customIconUrl,
          parent_id: parentId,
        });
        toast.success('Categoria aggiornata');
      } else {
        await addCategory.mutateAsync({
          name: name.trim(),
          type,
          icon: customIconUrl ? 'custom' : icon,
          color,
          custom_icon_url: customIconUrl,
          parent_id: parentId,
        });
        toast.success('Categoria aggiunta');
      }
      resetForm();
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteCategory.mutateAsync(deleteConfirmId);
      toast.success('Categoria eliminata');
      setDeleteConfirmId(null);
      if (editingCategory?.id === deleteConfirmId) {
        resetForm();
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const getIconLabel = (iconValue: string | null, customUrl?: string | null) => {
    if (iconValue === 'custom' && customUrl) {
      return <img src={customUrl} alt="Custom icon" className="w-5 h-5 rounded object-cover" />;
    }
    return ICONS.find(i => i.value === iconValue)?.label || '⚪';
  };

  // Get only parent categories (no parent_id)
  const incomeCategories = categories.filter(c => c.type === 'entrata' && !c.parent_id);
  const expenseCategories = categories.filter(c => c.type === 'uscita' && !c.parent_id);
  
  // Get parent categories for selection (exclude the currently editing category to prevent self-reference)
  const availableParentCategories = categories.filter(c => 
    !c.parent_id && // Only top-level categories can be parents
    c.type === type && // Must match the current type
    c.id !== editingCategory?.id // Exclude self
  );

  // Render a category item with its subcategories
  const renderCategoryItem = (category: Category, isSubcategory = false) => {
    const subcategories = getSubcategories(category.id);
    const hasSubs = subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-lg transition-colors group",
            isSubcategory && "ml-4 border-l-2 border-muted",
            editingCategory?.id === category.id
              ? "bg-primary/10 border border-primary/30"
              : selectedForDelete.has(category.id)
                ? "bg-destructive/10 border border-destructive/30"
                : "bg-secondary/50 hover:bg-secondary"
          )}
        >
          <div className="flex items-center gap-2">
            {hasSubs && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(category.id);
                }}
                className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {!hasSubs && !isSubcategory && <div className="w-5" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectForDelete(category.id);
              }}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                selectedForDelete.has(category.id)
                  ? "bg-destructive border-destructive text-destructive-foreground"
                  : "border-muted-foreground/50 hover:border-destructive"
              )}
            >
              {selectedForDelete.has(category.id) && (
                <Check className="w-3 h-3" />
              )}
            </button>
            <div
              className="flex items-center gap-2 cursor-pointer flex-1"
              onClick={() => handleEdit(category)}
              title="Clicca per modificare questa categoria"
            >
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm overflow-hidden"
                style={{ backgroundColor: `${category.color || '#6366f1'}20` }}
              >
                {getIconLabel(category.icon, category.custom_icon_url)}
              </span>
              <span className="text-sm font-medium">{category.name}</span>
              {hasSubs && (
                <Badge variant="outline" className="text-xs">
                  {subcategories.length} sotto
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasSubs && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-orange-500 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  // Select all subcategories for deletion
                  const newSelected = new Set(selectedForDelete);
                  subcategories.forEach(sub => newSelected.add(sub.id));
                  setSelectedForDelete(newSelected);
                  setShowBulkDeleteConfirm(true);
                }}
                title="Elimina tutte le sottocategorie"
              >
                <FolderMinus className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(category);
              }}
              title="Modifica categoria"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive/80"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(category.id);
              }}
              title="Elimina categoria"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {hasSubs && isExpanded && (
          <div className="mt-1 space-y-1">
            {subcategories.map(sub => renderCategoryItem(sub, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-[#067d1c]">Gestione Categorie</DialogTitle>
            <DialogDescription>
              Aggiungi, modifica o elimina le categorie per le tue transazioni
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Categories List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Categorie esistenti</h3>
                <div className="flex items-center gap-2">
                  {selectedForDelete.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina ({selectedForDelete.size})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleStartAdd}
                    className="gradient-primary text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nuova
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4">
                  {/* Expense Categories */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                      Uscite ({expenseCategories.length})
                    </h4>
                    <div className="space-y-1">
                      {expenseCategories.map((category) => renderCategoryItem(category))}
                    </div>
                  </div>

                  {/* Income Categories */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                      Entrate ({incomeCategories.length})
                    </h4>
                    <div className="space-y-1">
                      {incomeCategories.map((category) => renderCategoryItem(category))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Edit/Add Form */}
            <div className="space-y-4 border-l pl-4">
              <h3 className="font-semibold text-sm">
                {editingCategory ? 'Modifica categoria' : isAdding ? 'Nuova categoria' : 'Seleziona una categoria'}
              </h3>

              {(editingCategory || isAdding) ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Es: Spesa, Affitto..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={(v) => {
                      setType(v as 'entrata' | 'uscita');
                      setParentId(null); // Reset parent when type changes
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uscita">Uscita</SelectItem>
                        <SelectItem value="entrata">Entrata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria padre (opzionale)</Label>
                    <Select 
                      value={parentId || 'none'} 
                      onValueChange={(v) => setParentId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nessuna (categoria principale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna (categoria principale)</SelectItem>
                        {availableParentCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {getIconLabel(cat.icon, cat.custom_icon_url)} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Seleziona una categoria padre per creare una sottocategoria
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Icona</Label>
                    
                    {/* Custom icon upload section */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingIcon}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploadingIcon ? 'Caricamento...' : 'Carica icona'}
                      </Button>
                      
                      {customIconUrl && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg border overflow-hidden">
                            <img 
                              src={customIconUrl} 
                              alt="Custom icon" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={handleRemoveCustomIcon}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {!customIconUrl && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">Oppure scegli un'icona predefinita:</p>
                        <div className="flex flex-wrap gap-2">
                          {ICONS.map((i) => (
                            <button
                              key={i.value}
                              type="button"
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                                icon === i.value && !customIconUrl
                                  ? "bg-primary/20 ring-2 ring-primary"
                                  : "bg-secondary hover:bg-secondary/80"
                              )}
                              onClick={() => {
                                setIcon(i.value);
                                setCustomIconUrl(null);
                              }}
                            >
                              {i.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Colore</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            color === c ? "ring-2 ring-offset-2 ring-foreground" : ""
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <Label className="text-xs text-muted-foreground">Anteprima</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg overflow-hidden"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {getIconLabel(customIconUrl ? 'custom' : icon, customIconUrl)}
                      </span>
                      <span className="font-medium">{name || 'Nome categoria'}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          type === 'entrata' ? 'text-income border-income/30' : 'text-expense border-expense/30'
                        )}
                      >
                        {type === 'entrata' ? 'Entrata' : 'Uscita'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annulla
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={addCategory.isPending || updateCategory.isPending}
                      className="flex-1 gradient-primary text-primary-foreground"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {editingCategory ? 'Salva' : 'Aggiungi'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  Seleziona una categoria da modificare o clicca "Nuova" per crearne una
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (single) */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Le transazioni associate manterranno i dati esistenti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {selectedForDelete.size} categorie?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Le transazioni associate manterranno i dati esistenti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina tutte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
