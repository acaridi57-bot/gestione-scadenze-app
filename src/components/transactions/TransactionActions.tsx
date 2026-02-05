import { useState } from 'react';
import { 
  Pencil, 
  Trash2,
  Check,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Transaction, useTransactions } from '@/hooks/useTransactions';
import { useReminders } from '@/hooks/useReminders';
import { toast } from 'sonner';
import { EditTransactionDialog } from './EditTransactionDialog';
import { ExpensePaymentDialog } from './ExpensePaymentDialog';

interface TransactionActionsProps {
  transaction: Transaction;
}

export function TransactionActions({ transaction }: TransactionActionsProps) {
  const { updateTransaction, deleteTransaction } = useTransactions();
  const { reminders, deleteReminder } = useReminders();
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Check if fully paid: paid_amount equals or exceeds the total amount
  const isPaid = Number(transaction.paid_amount) >= Number(transaction.amount);
  const currentPaid = Number(transaction.paid_amount) || 0;
  const hasPartialPayment = currentPaid > 0 && currentPaid < Number(transaction.amount);

  // Find linked reminder for this transaction
  const linkedReminderTitle = `Rimanenza: ${transaction.description || transaction.categories?.name}`;
  const linkedReminder = reminders.find(r => 
    r.title === linkedReminderTitle && !r.completed
  );

  const handleDelete = async () => {
    try {
      // Also delete linked reminder if exists
      if (linkedReminder) {
        await deleteReminder.mutateAsync(linkedReminder.id);
      }
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success('Transazione eliminata');
      setDeleteOpen(false);
    } catch {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleTogglePaid = async () => {
    try {
      if (isPaid) {
        // Unmark as paid - reset to no payments
        await updateTransaction.mutateAsync({
          id: transaction.id,
          is_partial: false,
          paid_amount: 0,
        });
        toast.success('Segnato come da pagare');
      } else {
        // Mark as fully paid
        await updateTransaction.mutateAsync({
          id: transaction.id,
          is_partial: false, // Not partial anymore when fully paid
          paid_amount: Number(transaction.amount),
        });
        
        // Delete linked reminder since fully paid
        if (linkedReminder) {
          await deleteReminder.mutateAsync(linkedReminder.id);
        }
        
        toast.success('Segnato come saldato');
      }
    } catch {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  // Only show payment dialog for expenses (uscite), not for income
  const isExpense = transaction.type === 'uscita';

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Edit */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-primary hover:text-primary/80"
          onClick={() => setEditOpen(true)}
          title="Modifica transazione"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* Payment/Acconto - only for expenses */}
        {isExpense && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${hasPartialPayment ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
            onClick={() => setPaymentDialogOpen(true)}
            title="Registra pagamento"
          >
            <Coins className="w-4 h-4" />
          </Button>
        )}

        {/* Mark as Paid */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${isPaid ? 'text-income' : 'text-muted-foreground hover:text-income'}`}
          onClick={handleTogglePaid}
          title={isPaid ? 'Segna come da pagare' : 'Segna come pagato'}
        >
          <Check className="w-4 h-4" />
        </Button>

        {/* Delete */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive/80"
          onClick={() => setDeleteOpen(true)}
          title="Elimina transazione"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <EditTransactionDialog 
        transaction={transaction}
        open={editOpen} 
        onOpenChange={setEditOpen} 
      />

      {/* Payment Dialog - uses new logic */}
      {isExpense && (
        <ExpensePaymentDialog
          transaction={transaction}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa transazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{transaction.description || transaction.categories?.name}". Questa azione non può essere annullata.
              {linkedReminder && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ Verrà eliminato anche il promemoria collegato per la rimanenza.
                </span>
              )}
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
    </>
  );
}
