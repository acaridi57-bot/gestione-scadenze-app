import { useState } from 'react';
import { CreditCard, Banknote, Building2, Smartphone, Wallet, Plus, Trash2, Pencil, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaymentMethodManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const iconOptions = [
  { value: 'credit-card', label: 'Carta di credito', icon: CreditCard, emoji: '💳' },
  { value: 'banknote', label: 'Contanti', icon: Banknote, emoji: '💵' },
  { value: 'building-2', label: 'Bonifico', icon: Building2, emoji: '🏦' },
  { value: 'smartphone', label: 'Mobile', icon: Smartphone, emoji: '📱' },
  { value: 'wallet', label: 'Portafoglio', icon: Wallet, emoji: '👛' },
];

const colorOptions = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#64748b', // slate
  '#f97316', // orange
  '#06b6d4', // cyan
];

export function PaymentMethodManagementDialog({ open, onOpenChange }: PaymentMethodManagementDialogProps) {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = usePaymentMethods();
  
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('credit-card');
  const [color, setColor] = useState('#6366f1');

  const resetForm = () => {
    setName('');
    setIcon('credit-card');
    setColor('#6366f1');
    setEditingMethod(null);
    setIsAdding(false);
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setName(method.name);
    setIcon(method.icon || 'credit-card');
    setColor(method.color || '#6366f1');
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const toggleSelectForDelete = (methodId: string) => {
    const newSelected = new Set(selectedForDelete);
    if (newSelected.has(methodId)) {
      newSelected.delete(methodId);
    } else {
      newSelected.add(methodId);
    }
    setSelectedForDelete(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.size === 0) return;
    
    try {
      for (const id of selectedForDelete) {
        await deletePaymentMethod.mutateAsync(id);
      }
      toast.success(`${selectedForDelete.size} metodi di pagamento eliminati`);
      setSelectedForDelete(new Set());
      setShowBulkDeleteConfirm(false);
      if (editingMethod && selectedForDelete.has(editingMethod.id)) {
        resetForm();
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per il metodo di pagamento');
      return;
    }

    try {
      if (editingMethod) {
        await updatePaymentMethod.mutateAsync({
          id: editingMethod.id,
          name: name.trim(),
          icon,
          color,
        });
        toast.success('Metodo di pagamento aggiornato');
      } else {
        await addPaymentMethod.mutateAsync({
          name: name.trim(),
          icon,
          color,
        });
        toast.success('Metodo di pagamento aggiunto');
      }
      resetForm();
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deletePaymentMethod.mutateAsync(deleteConfirmId);
      toast.success('Metodo di pagamento eliminato');
      setDeleteConfirmId(null);
      if (editingMethod?.id === deleteConfirmId) {
        resetForm();
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const getIconEmoji = (iconValue: string | null) => {
    return iconOptions.find(i => i.value === iconValue)?.emoji || '💳';
  };

  const getIconComponent = (iconValue: string | null) => {
    const found = iconOptions.find(i => i.value === iconValue);
    return found?.icon || Wallet;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-[#067d1c]">Gestione Modalità di Pagamento</DialogTitle>
            <DialogDescription>
              Aggiungi, modifica o elimina le modalità di pagamento per le tue transazioni
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Payment Methods List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Metodi esistenti</h3>
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
                <div className="space-y-1">
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nessun metodo di pagamento configurato
                    </p>
                  ) : (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg transition-colors group",
                          editingMethod?.id === method.id
                            ? "bg-primary/10 border border-primary/30"
                            : selectedForDelete.has(method.id)
                              ? "bg-destructive/10 border border-destructive/30"
                              : "bg-secondary/50 hover:bg-secondary"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectForDelete(method.id);
                            }}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                              selectedForDelete.has(method.id)
                                ? "bg-destructive border-destructive text-destructive-foreground"
                                : "border-muted-foreground/50 hover:border-destructive"
                            )}
                          >
                            {selectedForDelete.has(method.id) && (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => handleEdit(method)}
                            title="Clicca per modificare"
                          >
                            <span 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                              style={{ backgroundColor: `${method.color || '#6366f1'}20` }}
                            >
                              {getIconEmoji(method.icon)}
                            </span>
                            <span className="text-sm font-medium">{method.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(method);
                            }}
                            title="Modifica"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(method.id);
                            }}
                            title="Elimina"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Edit/Add Form */}
            <div className="space-y-4 border-l pl-4">
              <h3 className="font-semibold text-sm">
                {editingMethod ? 'Modifica metodo' : isAdding ? 'Nuovo metodo di pagamento' : 'Seleziona un metodo'}
              </h3>

              {(editingMethod || isAdding) ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-name">Nome</Label>
                    <Input
                      id="pm-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Es: Carta di credito, PayPal..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pm-icon">Icona</Label>
                    <Select value={icon} onValueChange={setIcon}>
                      <SelectTrigger id="pm-icon">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <span>{getIconEmoji(icon)}</span>
                            <span>{iconOptions.find(i => i.value === icon)?.label}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Colore</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            color === c
                              ? "ring-2 ring-offset-2 ring-primary scale-110"
                              : "hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 rounded-lg border bg-secondary/30">
                    <Label className="text-xs text-muted-foreground">Anteprima</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {getIconEmoji(icon)}
                      </div>
                      <span className="font-medium">{name || 'Nome metodo'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 gradient-primary text-primary-foreground"
                      disabled={addPaymentMethod.isPending || updatePaymentMethod.isPending}
                    >
                      {editingMethod ? 'Aggiorna' : 'Salva'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <CreditCard className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm text-center">
                    Seleziona un metodo da modificare o<br />
                    clicca "Nuova" per crearne uno
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare metodo di pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il metodo verrà rimosso ma le transazioni esistenti non saranno modificate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {selectedForDelete.size} metodi di pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. I metodi selezionati verranno rimossi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
