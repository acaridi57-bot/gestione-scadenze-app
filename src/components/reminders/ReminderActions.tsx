import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Pencil, 
  MessageCircle, 
  CalendarPlus, 
  Check, 
  Trash2,
  Calendar as CalendarIcon,
  Coins,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Reminder, useReminders } from '@/hooks/useReminders';
import { useTransactions } from '@/hooks/useTransactions';
import { toast } from 'sonner';
import { EditReminderDialog } from './EditReminderDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { openInCalendar, CalendarEvent } from '@/lib/calendar-utils';
import { useProFeature } from '@/hooks/useProFeature';
import { ProFeatureGate } from '@/components/pro/ProFeatureGate';

interface ReminderActionsProps {
  reminder: Reminder;
}

export function ReminderActions({ reminder }: ReminderActionsProps) {
  const { user } = useAuth();
  const { updateReminder, deleteReminder, toggleCompleted } = useReminders();
  const { addTransaction } = useTransactions();
  const { isPro, showGate, featureName, checkProFeature, closeGate, setShowGate } = useProFeature();
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [accontoOpen, setAccontoOpen] = useState(false);
  const [accontoAmount, setAccontoAmount] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>(new Date(reminder.due_date));
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savedNumber, setSavedNumber] = useState('');

  const handleWhatsAppClick = () => {
    if (checkProFeature('Notifiche WhatsApp')) {
      setWhatsappOpen(true);
    }
  };

  // Load saved WhatsApp number from profile
  useEffect(() => {
    const loadWhatsAppNumber = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('whatsapp_number')
        .eq('id', user.id)
        .single();
      
      if (data?.whatsapp_number) {
        setSavedNumber(data.whatsapp_number);
        setWhatsappNumber(data.whatsapp_number);
      }
    };
    
    loadWhatsAppNumber();
  }, [user?.id]);

  const handleDelete = async () => {
    try {
      await deleteReminder.mutateAsync(reminder.id);
      toast.success('Promemoria eliminato');
      setDeleteOpen(false);
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleReschedule = async () => {
    if (!newDate) return;
    
    try {
      await updateReminder.mutateAsync({
        id: reminder.id,
        due_date: format(newDate, 'yyyy-MM-dd'),
      });
      toast.success('Data aggiornata');
      setRescheduleOpen(false);
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleToggleComplete = async () => {
    try {
      await toggleCompleted.mutateAsync({ 
        id: reminder.id, 
        completed: !reminder.completed 
      });
      toast.success(reminder.completed ? 'Segnato come da pagare' : 'Segnato come pagato');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleOpenAcconto = () => {
    setAccontoAmount(String(reminder.paid_amount || 0));
    setAccontoOpen(true);
  };

  /**
   * NEW EXPENSE PAYMENT LOGIC FOR REMINDERS:
   * 
   * When saving a payment (acconto) on a reminder:
   * 1. Create a transaction for the payment amount
   * 2. Update the reminder's amount to the new remaining balance
   * 3. If fully paid, mark reminder as completed
   */
  const handleSaveAcconto = async () => {
    try {
      const payment = parseFloat(accontoAmount) || 0;
      const currentReminderAmount = Number(reminder.amount) || 0;
      
      if (payment <= 0) {
        toast.error('Inserisci un importo valido');
        return;
      }
      
      if (payment > currentReminderAmount) {
        toast.error(`L'importo non può superare €${currentReminderAmount.toFixed(2)}`);
        return;
      }

      const newRemaining = currentReminderAmount - payment;
      
      // Create a transaction for this payment
      await addTransaction.mutateAsync({
        type: 'uscita',
        amount: payment, // Transaction stores ONLY the paid amount
        paid_amount: payment, // Fully paid for this transaction
        description: `Pagamento: ${reminder.title}`,
        category_id: reminder.category_id,
        payment_method_id: null,
        date: format(new Date(), 'yyyy-MM-dd'),
        start_date: null,
        end_date: null,
        is_partial: false,
        recurring: 'none',
        attachment_url: null,
        plan_id: null,
        installment_index: null,
        installment_total: null,
      });
      
      if (newRemaining > 0) {
        // Update reminder with new remaining amount
        await updateReminder.mutateAsync({
          id: reminder.id,
          amount: newRemaining,
          paid_amount: 0, // Reset paid_amount since we're tracking via amount
        });
        toast.success(`Pagamento di €${payment.toFixed(2)} registrato. Rimanenza: €${newRemaining.toFixed(2)}`);
      } else {
        // Fully paid - mark reminder as completed
        await updateReminder.mutateAsync({
          id: reminder.id,
          amount: 0,
          paid_amount: 0,
          completed: true,
        });
        toast.success('Promemoria saldato completamente!');
      }
      
      setAccontoOpen(false);
    } catch {
      toast.error('Errore durante il salvataggio');
    }
  };

  const currentPaid = Number(reminder.paid_amount) || 0;
  const hasPartialPayment = reminder.amount && currentPaid > 0 && currentPaid < Number(reminder.amount);

  const formatPhoneNumber = (number: string): string => {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // If starts with 0, assume Italian number and add 39
    if (cleaned.startsWith('0')) {
      cleaned = '39' + cleaned.substring(1);
    }
    // If doesn't start with country code, assume Italian
    else if (!cleaned.startsWith('39') && cleaned.length <= 10) {
      cleaned = '39' + cleaned;
    }
    
    return cleaned;
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Inserisci un numero WhatsApp');
      return;
    }

    const formattedNumber = formatPhoneNumber(whatsappNumber);
    
    // Save number to profile if different from saved
    if (user?.id && whatsappNumber !== savedNumber) {
      await supabase
        .from('profiles')
        .update({ whatsapp_number: whatsappNumber })
        .eq('id', user.id);
      setSavedNumber(whatsappNumber);
    }

    // Build message
    const dueDate = format(new Date(reminder.due_date), 'dd MMMM yyyy', { locale: it });
    const amountText = reminder.amount 
      ? `\n💰 Importo: ${formatCurrency(Number(reminder.amount))}`
      : '';
    
    const message = `📅 *Promemoria Scadenza*\n\n` +
      `📌 *${reminder.title}*\n` +
      `${reminder.description ? `📝 ${reminder.description}\n` : ''}` +
      `📆 Scadenza: ${dueDate}${amountText}\n\n` +
      `⚠️ Non dimenticare questa scadenza!`;

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    
    // Close dialog first
    setWhatsappOpen(false);
    
    // Use window.open with specific features to avoid COOP issues
    // The 'noopener,noreferrer' prevents the new window from accessing the opener
    setTimeout(() => {
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      // Fallback: if popup is blocked or fails, try direct navigation
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Create a visible link for the user to click manually
        toast.info('Clicca il link per aprire WhatsApp', {
          action: {
            label: 'Apri WhatsApp',
            onClick: () => {
              window.open(whatsappUrl, '_blank');
            }
          },
          duration: 10000,
        });
      } else {
        toast.success('WhatsApp aperto');
      }
    }, 150);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const handleAddToCalendar = () => {
    const dueDate = new Date(reminder.due_date);
    // Set the event at 9:00 AM on the due date
    dueDate.setHours(9, 0, 0, 0);

    const amountText = reminder.amount 
      ? ` - Importo: ${formatCurrency(Number(reminder.amount))}`
      : '';

    const event: CalendarEvent = {
      title: `📅 ${reminder.title}`,
      description: `${reminder.description || ''}${amountText}`,
      startDate: dueDate,
      reminder: (reminder.notify_days_before || 3) * 24 * 60, // Convert days to minutes
    };

    openInCalendar(event);
    toast.success('File calendario scaricato. Aprilo per aggiungerlo al Calendario.');
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Edit */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-primary hover:text-primary/80"
          onClick={() => setEditOpen(true)}
          title="Modifica promemoria"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* WhatsApp Notification */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-income hover:text-income/80 relative"
          onClick={handleWhatsAppClick}
          title="Invia promemoria via WhatsApp"
        >
          <MessageCircle className="w-4 h-4" />
          {!isPro && (
            <Crown className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-amber-500" />
          )}
        </Button>

        {/* Add to Calendar */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-blue-500 hover:text-blue-400"
          onClick={handleAddToCalendar}
          title="Aggiungi al Calendario"
        >
          <CalendarIcon className="w-4 h-4" />
        </Button>

        {/* Reschedule */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-expense hover:text-expense/80"
          onClick={() => setRescheduleOpen(true)}
          title="Cambia data scadenza"
        >
          <CalendarPlus className="w-4 h-4" />
        </Button>

        {/* Acconto */}
        {reminder.amount && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${hasPartialPayment ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
            onClick={handleOpenAcconto}
            title="Gestisci acconto"
          >
            <Coins className="w-4 h-4" />
          </Button>
        )}

        {/* Mark Complete */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${reminder.completed ? 'text-income' : 'text-muted-foreground hover:text-income'}`}
          onClick={handleToggleComplete}
          title={reminder.completed ? 'Segna come da pagare' : 'Segna come pagato'}
        >
          <Check className="w-4 h-4" />
        </Button>

        {/* Delete */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive/80"
          onClick={() => setDeleteOpen(true)}
          title="Elimina promemoria"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <EditReminderDialog 
        reminder={reminder}
        open={editOpen} 
        onOpenChange={setEditOpen} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo promemoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{reminder.title}". Questa azione non può essere annullata.
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia data scadenza</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={newDate}
              onSelect={setNewDate}
              initialFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleReschedule}
              disabled={!newDate || updateReminder.isPending}
              className="gradient-primary"
            >
              {updateReminder.isPending ? 'Salvando...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Notification Dialog */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invia promemoria WhatsApp</DialogTitle>
            <DialogDescription>
              Inserisci il numero WhatsApp a cui inviare il promemoria
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Numero WhatsApp</Label>
              <Input
                id="whatsapp-number"
                type="tel"
                placeholder="Es: 3331234567 o +39 333 1234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Il numero viene salvato per usi futuri
              </p>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <p className="font-medium">{reminder.title}</p>
              {reminder.description && (
                <p className="text-sm text-muted-foreground">{reminder.description}</p>
              )}
              <p className="text-sm">
                Scadenza: {format(new Date(reminder.due_date), 'dd/MM/yyyy')}
              </p>
              {reminder.amount && (
                <p className="text-sm font-medium text-expense">
                  Importo: {formatCurrency(Number(reminder.amount))}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSendWhatsApp}
              disabled={!whatsappNumber.trim()}
              className="bg-income hover:bg-income/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Apri WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acconto/Payment Dialog */}
      {reminder.amount && Number(reminder.amount) > 0 && (
        <Dialog open={accontoOpen} onOpenChange={setAccontoOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Registra Pagamento
              </DialogTitle>
              <DialogDescription>
                Registra un pagamento per questo promemoria. Verrà creata una transazione e aggiornata la rimanenza.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Importo da pagare:</span>
                  <span className="font-bold text-expense">€{Number(reminder.amount).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="acconto-reminder">Importo pagamento (€)</Label>
                <Input
                  id="acconto-reminder"
                  type="number"
                  step="0.01"
                  min="0"
                  max={Number(reminder.amount)}
                  value={accontoAmount}
                  onChange={(e) => setAccontoAmount(e.target.value)}
                  placeholder={`Max €${Number(reminder.amount).toFixed(2)}`}
                />
              </div>

              {parseFloat(accontoAmount) > 0 && parseFloat(accontoAmount) <= Number(reminder.amount) && (
                <div className="bg-primary/10 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium">Dopo questo pagamento:</p>
                  <div className="flex justify-between text-sm">
                    <span>Nuova rimanenza:</span>
                    <span className={`font-bold ${
                      Number(reminder.amount) - parseFloat(accontoAmount) === 0 
                        ? 'text-income' 
                        : 'text-expense'
                    }`}>
                      €{(Number(reminder.amount) - parseFloat(accontoAmount)).toFixed(2)}
                    </span>
                  </div>
                  {Number(reminder.amount) - parseFloat(accontoAmount) === 0 && (
                    <p className="text-xs text-income mt-1">
                      ✓ Il promemoria verrà segnato come completato
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAccontoOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={handleSaveAcconto} 
                className="bg-primary"
                disabled={!accontoAmount || parseFloat(accontoAmount) <= 0 || parseFloat(accontoAmount) > Number(reminder.amount)}
              >
                Registra Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pro Feature Gate */}
      <ProFeatureGate 
        open={showGate} 
        onOpenChange={setShowGate} 
        feature={featureName} 
      />
    </>
  );
}
