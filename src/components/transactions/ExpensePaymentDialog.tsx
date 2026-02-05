import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Coins, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Transaction, useTransactions } from '@/hooks/useTransactions';
import { useReminders } from '@/hooks/useReminders';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface ExpensePaymentDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * NEW EXPENSE PAYMENT LOGIC:
 * 
 * RULES:
 * - Transactions store ONLY the amounts actually paid
 * - Reminders store ONLY the remaining balance
 * - The reminder amount must NEVER equal the total expense if any payment exists
 * 
 * LOGIC:
 * remainingAmount = totalExpense - sum(all related transactions)
 * 
 * IMPLEMENTATION:
 * 1. On first payment: Save payment as transaction, create reminder with remaining
 * 2. On additional payment: Create new transaction, update existing reminder
 */
export function ExpensePaymentDialog({ 
  transaction, 
  open, 
  onOpenChange 
}: ExpensePaymentDialogProps) {
  const { updateTransaction } = useTransactions();
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // The "total expense" is stored in a special field or we track it differently
  // For this implementation, we use the transaction's amount as the "original total"
  // and paid_amount tracks cumulative payments
  
  // Calculate the original total expense
  // If is_partial is true, the amount field represents the ORIGINAL total expense
  // and paid_amount represents how much has been paid so far
  const originalTotal = Number(transaction.amount);
  const totalPaid = Number(transaction.paid_amount) || 0;
  const remainingBalance = originalTotal - totalPaid;
  
  // Find linked reminder for this transaction (by description/category match)
  const linkedReminder = reminders.find(r => 
    r.title === `Rimanenza: ${transaction.description || transaction.categories?.name}` &&
    !r.completed
  );

  useEffect(() => {
    if (open) {
      setPaymentAmount('');
      // Set default reminder date to 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setReminderDate(defaultDate);
    }
  }, [open]);

  const handleSavePayment = async () => {
    const payment = parseFloat(paymentAmount) || 0;
    
    if (payment <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }
    
    if (payment > remainingBalance) {
      toast.error(`L'importo non può superare la rimanenza di €${remainingBalance.toFixed(2)}`);
      return;
    }

    try {
      const newTotalPaid = totalPaid + payment;
      const newRemaining = originalTotal - newTotalPaid;
      
      // Update the transaction with the new cumulative paid amount
      await updateTransaction.mutateAsync({
        id: transaction.id,
        paid_amount: newTotalPaid,
        is_partial: newRemaining > 0,
      });
      
      if (newRemaining > 0) {
        // There's still a remaining balance - create or update reminder
        const reminderTitle = `Rimanenza: ${transaction.description || transaction.categories?.name || 'Spesa'}`;
        
        if (linkedReminder) {
          // Update existing reminder with new remaining amount
          await updateReminder.mutateAsync({
            id: linkedReminder.id,
            amount: newRemaining,
            due_date: format(reminderDate, 'yyyy-MM-dd'),
          });
          toast.success(`Pagamento di €${payment.toFixed(2)} registrato. Rimanenza aggiornata: €${newRemaining.toFixed(2)}`);
        } else {
          // Create new reminder for the remaining balance
          await addReminder.mutateAsync({
            title: reminderTitle,
            description: `Rimanenza per "${transaction.description || transaction.categories?.name}"`,
            due_date: format(reminderDate, 'yyyy-MM-dd'),
            amount: newRemaining,
            paid_amount: 0,
            category_id: transaction.category_id,
            completed: false,
            notify_days_before: 3,
          });
          toast.success(`Pagamento di €${payment.toFixed(2)} registrato. Promemoria creato per €${newRemaining.toFixed(2)}`);
        }
      } else {
        // Fully paid - remove linked reminder if exists
        if (linkedReminder) {
          await deleteReminder.mutateAsync(linkedReminder.id);
        }
        toast.success('Spesa saldata completamente!');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Errore durante il salvataggio del pagamento');
    }
  };

  const handleResetPayments = async () => {
    try {
      // Reset to original state - no payments
      await updateTransaction.mutateAsync({
        id: transaction.id,
        paid_amount: 0,
        is_partial: false,
      });
      
      // Delete linked reminder if exists
      if (linkedReminder) {
        await deleteReminder.mutateAsync(linkedReminder.id);
      }
      
      toast.success('Pagamenti azzerati');
      onOpenChange(false);
    } catch (error) {
      toast.error('Errore durante l\'azzeramento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Coins className="w-5 h-5" />
            Registra Pagamento
          </DialogTitle>
          <DialogDescription>
            Registra un acconto o pagamento parziale per questa spesa
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Importo totale spesa:</span>
              <span className="font-semibold">€{originalTotal.toFixed(2)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Già pagato:</span>
                <span className="font-medium text-income">€{totalPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">Rimanenza da pagare:</span>
              <span className="font-bold text-expense">€{remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {remainingBalance > 0 ? (
            <>
              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Importo pagamento (€)</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max €${remainingBalance.toFixed(2)}`}
                />
              </div>

              {/* Preview of new remaining */}
              {parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) <= remainingBalance && (
                <div className="bg-primary/10 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium">Dopo questo pagamento:</p>
                  <div className="flex justify-between text-sm">
                    <span>Nuova rimanenza:</span>
                    <span className={cn(
                      "font-bold",
                      remainingBalance - parseFloat(paymentAmount) === 0 
                        ? "text-income" 
                        : "text-expense"
                    )}>
                      €{(remainingBalance - parseFloat(paymentAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Reminder Date (only show if there will be remaining balance) */}
              {parseFloat(paymentAmount) > 0 && 
               parseFloat(paymentAmount) < remainingBalance && (
                <div className="space-y-2">
                  <Label>Data scadenza promemoria rimanenza</Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !reminderDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderDate ? format(reminderDate, 'dd/MM/yyyy') : 'Seleziona data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={reminderDate}
                        onSelect={(date) => {
                          if (date) {
                            setReminderDate(date);
                            setShowDatePicker(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Verrà creato/aggiornato un promemoria per la rimanenza
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-income bg-income/10 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Questa spesa è già stata saldata completamente</span>
            </div>
          )}

          {/* Linked Reminder Info */}
          {linkedReminder && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Promemoria collegato attivo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Scadenza: {format(new Date(linkedReminder.due_date), 'dd/MM/yyyy')} - 
                €{Number(linkedReminder.amount).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {totalPaid > 0 && (
            <Button 
              variant="outline" 
              onClick={handleResetPayments}
              className="text-destructive hover:text-destructive"
            >
              Azzera pagamenti
            </Button>
          )}
          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSavePayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > remainingBalance}
              className="bg-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Registra Pagamento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
