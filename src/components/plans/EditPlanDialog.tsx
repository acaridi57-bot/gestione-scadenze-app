import { useState, useEffect } from 'react';
import { format, setDate } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Save, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PlanWithProgress } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { PaymentMethodSelect } from '@/components/payment-methods/PaymentMethodSelect';

interface EditPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanWithProgress | null;
}

interface EditableInstallment {
  id: string;
  amount: number;
  date: Date;
  installment_index: number | null;
  is_paid: boolean;
  isNew?: boolean;
}

export function EditPlanDialog({ open, onOpenChange, plan }: EditPlanDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [installments, setInstallments] = useState<EditableInstallment[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [applyDayToAll, setApplyDayToAll] = useState<string>('');

  useEffect(() => {
    if (plan && open) {
      setPlanTitle(plan.title);
      setInstallments(
        plan.transactions
          .sort((a, b) => (a.installment_index || 0) - (b.installment_index || 0))
          .map(t => ({
            id: t.id,
            amount: Number(t.amount),
            date: new Date(t.date),
            installment_index: t.installment_index,
            is_paid: t.is_partial === true || (Number(t.paid_amount) >= Number(t.amount)),
          }))
      );
      setDeletedIds([]);
      setApplyDayToAll('');
    }
  }, [plan, open]);

  const handleAmountChange = (index: number, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index].amount = parseFloat(value) || 0;
    setInstallments(newInstallments);
  };

  const handleDateChange = (index: number, date: Date | undefined) => {
    if (!date) return;
    const newInstallments = [...installments];
    newInstallments[index].date = date;
    setInstallments(newInstallments);
  };

  const handleAddInstallment = () => {
    const lastInstallment = installments[installments.length - 1];
    const newDate = lastInstallment 
      ? new Date(lastInstallment.date.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days
      : new Date();
    
    const maxIndex = Math.max(...installments.map(i => i.installment_index || 0), 0);
    
    setInstallments([
      ...installments,
      {
        id: `new-${Date.now()}`,
        amount: lastInstallment?.amount || 100,
        date: newDate,
        installment_index: maxIndex + 1,
        is_paid: false,
        isNew: true,
      }
    ]);
  };

  const handleApplyDayToAll = (dayValue: string) => {
    setApplyDayToAll(dayValue);
    
    if (!dayValue) return;
    
    const day = parseInt(dayValue);
    if (day < 1 || day > 28) return;
    
    // Apply the day to all unpaid installments
    const updatedInstallments = installments.map(inst => {
      if (inst.is_paid) return inst;
      return {
        ...inst,
        date: setDate(inst.date, day)
      };
    });
    
    setInstallments(updatedInstallments);
    toast.success(`Giorno ${day} applicato a tutte le rate non pagate`);
  };

  const handleRemoveInstallment = (index: number) => {
    const installment = installments[index];
    
    // Don't allow removing if it's already paid
    if (installment.is_paid) {
      toast.error('Non puoi eliminare una rata già pagata');
      return;
    }
    
    // Track deleted IDs for existing installments
    if (!installment.isNew) {
      setDeletedIds([...deletedIds, installment.id]);
    }
    
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return installments.reduce((sum, i) => sum + i.amount, 0);
  };

  const handleSave = async () => {
    if (!plan || !user?.id) return;
    
    setIsSubmitting(true);
    
    try {
      // 1. Update plan total amount and title
      const newTotal = calculateTotal();
      const { error: planError } = await supabase
        .from('plans')
        .update({ 
          total_amount: newTotal,
          title: planTitle,
          installments: installments.length
        })
        .eq('id', plan.id);
      
      if (planError) throw planError;

      // 2. Delete removed installments
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .in('id', deletedIds);
        
        if (deleteError) throw deleteError;
        
        // Also delete corresponding reminders
        for (const id of deletedIds) {
          const tx = plan.transactions.find(t => t.id === id);
          if (tx) {
            await supabase
              .from('reminders')
              .delete()
              .ilike('title', `%${plan.title}%Rata ${tx.installment_index}%`);
          }
        }
      }

      // 3. Update existing and create new installments
      for (let i = 0; i < installments.length; i++) {
        const inst = installments[i];
        const dateStr = format(inst.date, 'yyyy-MM-dd');
        const newIndex = i + 1; // Reindex from 1
        
        if (inst.isNew) {
          // Create new transaction
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'uscita',
            amount: inst.amount,
            date: dateStr,
            description: `${planTitle} – Rata ${newIndex}/${installments.length}`,
            category_id: null,
            plan_id: plan.id,
            installment_index: newIndex,
            installment_total: installments.length,
            is_partial: false,
            paid_amount: 0,
          });
          
          // Create reminder for new installment
          await supabase.from('reminders').insert({
            user_id: user.id,
            title: `${planTitle} – Rata ${newIndex}/${installments.length}`,
            description: `Pagamento rata ${newIndex} di ${installments.length} del piano "${planTitle}"`,
            amount: inst.amount,
            due_date: dateStr,
            notify_days_before: 3,
            completed: false,
            paid_amount: 0,
          });
        } else {
          // Update existing transaction
          await supabase
            .from('transactions')
            .update({
              amount: inst.amount,
              date: dateStr,
              description: `${planTitle} – Rata ${newIndex}/${installments.length}`,
              installment_index: newIndex,
              installment_total: installments.length,
            })
            .eq('id', inst.id);
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      
      toast.success('Piano rate aggiornato con successo');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifica Piano Rate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Plan Title */}
          <div className="space-y-2">
            <Label>Titolo Piano</Label>
            <Input
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Nome del piano"
            />
          </div>

          <Separator />

          {/* Summary */}
          <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Totale Piano</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rate</p>
              <p className="text-xl font-bold">{installments.length}</p>
            </div>
          </div>

          {/* Apply Day to All */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Applica giorno del mese a tutte le rate
            </Label>
            <Select value={applyDayToAll} onValueChange={handleApplyDayToAll}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona giorno..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <SelectItem key={day} value={day.toString()}>
                    Giorno {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cambia il giorno di scadenza per tutte le rate non ancora pagate
            </p>
          </div>

          <Separator />

          {/* Installments List */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <Label>Rate</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInstallment}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                Aggiungi Rata
              </Button>
            </div>
            
            <ScrollArea className="h-[220px] pr-4">
              <div className="space-y-3">
                {installments.map((inst, index) => (
                  <div
                    key={inst.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      inst.is_paid ? "bg-income/5 border-income/20" : "bg-secondary/20 border-border",
                      inst.isNew && "border-primary/30 border-dashed"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {inst.installment_index === 0 ? 'Acconto' : `Rata ${index + 1}`}
                        </span>
                        {inst.is_paid && (
                          <Badge variant="outline" className="text-xs text-income border-income/30">
                            Pagata
                          </Badge>
                        )}
                        {inst.isNew && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">
                            Nuova
                          </Badge>
                        )}
                      </div>
                      {!inst.is_paid && installments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveInstallment(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Importo (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={inst.amount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                          disabled={inst.is_paid}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Scadenza</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={inst.is_paid}
                              className={cn(
                                "w-full h-9 justify-start text-left font-normal",
                                !inst.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(inst.date, 'dd/MM/yy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={inst.date}
                              onSelect={(date) => handleDateChange(index, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSubmitting || installments.length === 0}
            >
              {isSubmitting ? 'Salvando...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
