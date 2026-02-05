import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, addYears, setDate } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { saveTransaction } from '@/lib/saveTransaction';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Transaction, useTransactions } from '@/hooks/useTransactions';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { PaymentMethodSelect } from '@/components/payment-methods/PaymentMethodSelect';
import { InstallmentPreview } from '@/components/installments/InstallmentPreview';
import { AttachmentManager } from '@/components/attachments/AttachmentManager';
import { toast } from 'sonner';

const formSchema = z.object({
  type: z.enum(['entrata', 'uscita']),
  amount: z.string().min(1, 'Inserisci un importo'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  payment_method_id: z.string().optional(),
  date: z.date(),
  recurring: z.enum(['none', 'weekly', 'monthly']),
});

type FormData = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const { updateTransaction, deleteTransaction } = useTransactions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'entrata' | 'uscita'>(transaction.type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Installment state
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [downPayment, setDownPayment] = useState(0);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(3);
  const [installmentDay, setInstallmentDay] = useState<number | undefined>(undefined);
  const [customDates, setCustomDates] = useState<Date[]>([]);
  const [isManualDates, setIsManualDates] = useState(false);

  // Check if this is already part of an installment plan
  const isPartOfPlan = !!transaction.plan_id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      category_id: transaction.category_id || '',
      payment_method_id: transaction.payment_method_id || '',
      date: new Date(transaction.date),
      recurring: transaction.recurring || 'none',
    },
  });

  const watchedAmount = form.watch('amount');
  const watchedDate = form.watch('date');

  // Calculate installment amount
  const installmentAmount = useMemo(() => {
    const total = parseFloat(watchedAmount) || 0;
    const residual = total - downPayment;
    return installmentCount > 0 ? residual / installmentCount : 0;
  }, [watchedAmount, downPayment, installmentCount]);

  // Generate default dates when installments are enabled
  useEffect(() => {
    if (enableInstallments && !isManualDates && watchedDate && installmentCount > 0) {
      const dates: Date[] = [];
      for (let i = 0; i < installmentCount; i++) {
        let dueDate = frequency === 'monthly'
          ? addMonths(watchedDate, i)
          : addYears(watchedDate, i);
        
        if (installmentDay && installmentDay >= 1 && installmentDay <= 31) {
          const maxDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate = setDate(dueDate, Math.min(installmentDay, maxDay));
        }
        
        dates.push(dueDate);
      }
      setCustomDates(dates);
    }
  }, [enableInstallments, isManualDates, watchedDate, installmentCount, frequency, installmentDay]);

  useEffect(() => {
    if (open) {
      setActiveTab(transaction.type);
      setEnableInstallments(false);
      setInstallmentCount(2);
      setFrequency('monthly');
      setDownPayment(0);
      setNotifyDaysBefore(3);
      setInstallmentDay(undefined);
      setCustomDates([]);
      setIsManualDates(false);
      form.reset({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        category_id: transaction.category_id || '',
        payment_method_id: transaction.payment_method_id || '',
        date: new Date(transaction.date),
        recurring: transaction.recurring || 'none',
      });
    }
  }, [open, transaction, form]);

  const handleDateChange = (index: number, date: Date | undefined) => {
    if (date) {
      const newDates = [...customDates];
      newDates[index] = date;
      setCustomDates(newDates);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (enableInstallments && installmentCount > 1) {
        // Delete the original transaction and create installment plan
        await deleteTransaction.mutateAsync(transaction.id);
        
        await saveTransaction({
          user_id: user.id,
          title: data.description || 'Transazione rateizzata',
          type: activeTab,
          total_amount: parseFloat(data.amount),
          date: format(data.date, 'yyyy-MM-dd'),
          category_id: data.category_id || null,
          installments: installmentCount,
          frequency,
          advance: downPayment,
          notify_days_before: notifyDaysBefore,
          installment_day: installmentDay,
          custom_dates: customDates.map(d => format(d, 'yyyy-MM-dd')),
        });
        
        await queryClient.invalidateQueries({ queryKey: ['transactions'] });
        await queryClient.invalidateQueries({ queryKey: ['reminders'] });
        await queryClient.invalidateQueries({ queryKey: ['plans'] });
        
        toast.success('Piano rate creato con successo');
      } else {
        // Regular update
        await updateTransaction.mutateAsync({
          id: transaction.id,
          type: activeTab,
          amount: parseFloat(data.amount),
          description: data.description || null,
          category_id: data.category_id || null,
          payment_method_id: data.payment_method_id || null,
          date: format(data.date, 'yyyy-MM-dd'),
          recurring: data.recurring,
        });
        
        toast.success('Transazione aggiornata');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'entrata' | 'uscita');
    form.setValue('type', value as 'entrata' | 'uscita');
    form.setValue('category_id', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Transazione</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="uscita" className="data-[state=active]:bg-expense data-[state=active]:text-expense-foreground">
                  Uscita
                </TabsTrigger>
                <TabsTrigger value="entrata" className="data-[state=active]:bg-income data-[state=active]:text-income-foreground">
                  Entrata
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <CategorySelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      type={activeTab}
                      placeholder="Seleziona categoria"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalità di pagamento</FormLabel>
                  <FormControl>
                    <PaymentMethodSelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      placeholder="Seleziona metodo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrizione opzionale..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal text-primary border-primary/30 hover:bg-primary/10',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Seleziona data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recurring"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ricorrenza</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nessuna</SelectItem>
                      <SelectItem value="weekly">Settimanale</SelectItem>
                      <SelectItem value="monthly">Mensile</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Installment section - only show if not already part of a plan */}
            {!isPartOfPlan && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-installments" className="text-sm font-medium">
                    Converti in rate
                  </Label>
                  <Switch
                    id="enable-installments"
                    checked={enableInstallments}
                    onCheckedChange={setEnableInstallments}
                  />
                </div>

                {enableInstallments && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Numero rate</Label>
                        <Select 
                          value={installmentCount.toString()} 
                          onValueChange={(v) => setInstallmentCount(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n} rate</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Frequenza</Label>
                        <Select 
                          value={frequency} 
                          onValueChange={(v) => setFrequency(v as 'monthly' | 'yearly')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensile</SelectItem>
                            <SelectItem value="yearly">Annuale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Acconto (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={downPayment || ''}
                          onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Giorno del mese</Label>
                        <Select 
                          value={installmentDay?.toString() || 'default'} 
                          onValueChange={(v) => setInstallmentDay(v === 'default' ? undefined : parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Auto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Automatico</SelectItem>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {activeTab === 'uscita' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Notifica giorni prima</Label>
                        <Select 
                          value={notifyDaysBefore.toString()} 
                          onValueChange={(v) => setNotifyDaysBefore(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 5, 7, 10, 14].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n} giorni</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <InstallmentPreview
                      dates={customDates}
                      amount={installmentAmount}
                      isManualMode={isManualDates}
                      onManualModeChange={setIsManualDates}
                      onDateChange={handleDateChange}
                      totalAmount={parseFloat(watchedAmount) || 0}
                      downPayment={downPayment}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Allegati Section */}
            <Separator className="my-4" />
            <AttachmentManager entityType="transaction" entityId={transaction.id} />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => onOpenChange(false)}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className={cn(
                  'flex-1',
                  activeTab === 'entrata' 
                    ? 'bg-income hover:bg-income/90' 
                    : 'bg-expense hover:bg-expense/90'
                )}
                disabled={isSubmitting || updateTransaction.isPending}
              >
                {isSubmitting || updateTransaction.isPending 
                  ? 'Salvando...' 
                  : enableInstallments 
                    ? 'Crea Piano Rate' 
                    : 'Salva'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
