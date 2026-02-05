import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, addYears, setDate } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { CategorySelect } from '@/components/categories/CategorySelect';
import { PaymentMethodSelect } from '@/components/payment-methods/PaymentMethodSelect';
import { InstallmentPreview } from '@/components/installments/InstallmentPreview';
import { toast } from 'sonner';
import { saveTransaction } from '@/lib/saveTransaction';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

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

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'entrata' | 'uscita'>('uscita');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Installment state
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<string>('2');
  const [installmentFrequency, setInstallmentFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [downPayment, setDownPayment] = useState<string>('');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<string>('3');
  const [installmentDay, setInstallmentDay] = useState<string>('');
  const [isManualDates, setIsManualDates] = useState(false);
  const [customDates, setCustomDates] = useState<Date[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'uscita',
      amount: '',
      description: '',
      category_id: '',
      payment_method_id: '',
      date: new Date(),
      recurring: 'none',
    },
  });

  const watchAmount = form.watch('amount');
  const watchDate = form.watch('date');
  
  // Calculate installment amount
  const installmentAmount = useMemo(() => {
    const total = parseFloat(watchAmount) || 0;
    const advance = parseFloat(downPayment) || 0;
    const count = parseInt(installmentCount) || 1;
    
    if (total <= 0 || count <= 0) return 0;
    
    const residual = total - advance;
    if (residual <= 0) return 0;
    
    return residual / count;
  }, [watchAmount, downPayment, installmentCount]);

  // Generate default dates when installment settings change (only in auto mode)
  useEffect(() => {
    if (!isInstallment) return;
    if (isManualDates && customDates.length > 0) return; // Don't override manual dates
    
    const count = parseInt(installmentCount) || 1;
    const baseDate = watchDate || new Date();
    const day = installmentDay && installmentDay !== 'default' ? parseInt(installmentDay) : null;
    
    const dates: Date[] = [];
    for (let i = 0; i < count; i++) {
      let dueDate = installmentFrequency === 'monthly'
        ? addMonths(baseDate, i)
        : addYears(baseDate, i);
      
      if (day) {
        const maxDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
        dueDate = setDate(dueDate, Math.min(day, maxDay));
      }
      
      dates.push(dueDate);
    }
    
    setCustomDates(dates);
  }, [isInstallment, installmentCount, installmentFrequency, installmentDay, watchDate, isManualDates]);

  const handleCustomDateChange = (index: number, date: Date | undefined) => {
    if (!date) return;
    const newDates = [...customDates];
    newDates[index] = date;
    setCustomDates(newDates);
  };

  const handleManualModeChange = (manual: boolean) => {
    setIsManualDates(manual);
    // If switching to auto, regenerate dates
    if (!manual) {
      const count = parseInt(installmentCount) || 1;
      const baseDate = watchDate || new Date();
      const day = installmentDay && installmentDay !== 'default' ? parseInt(installmentDay) : null;
      
      const dates: Date[] = [];
      for (let i = 0; i < count; i++) {
        let dueDate = installmentFrequency === 'monthly'
          ? addMonths(baseDate, i)
          : addYears(baseDate, i);
        
        if (day) {
          const maxDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
          dueDate = setDate(dueDate, Math.min(day, maxDay));
        }
        
        dates.push(dueDate);
      }
      setCustomDates(dates);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user?.id) {
      toast.error('Devi effettuare il login');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await saveTransaction({
        user_id: user.id,
        title: data.description || (activeTab === 'entrata' ? 'Entrata' : 'Uscita'),
        type: activeTab,
        total_amount: parseFloat(data.amount),
        date: format(data.date, 'yyyy-MM-dd'),
        category_id: data.category_id || null,
        payment_method_id: data.payment_method_id || null,
        recurring: isInstallment ? 'none' : data.recurring,
        installments: isInstallment ? parseInt(installmentCount) : undefined,
        frequency: isInstallment ? installmentFrequency : undefined,
        advance: isInstallment && downPayment ? parseFloat(downPayment) : 0,
        notify_days_before: isInstallment ? parseInt(notifyDaysBefore) : undefined,
        installment_day: isInstallment && !isManualDates && installmentDay && installmentDay !== 'default' ? parseInt(installmentDay) : undefined,
        custom_dates: isInstallment ? customDates.map(d => format(d, 'yyyy-MM-dd')) : undefined,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      
      toast.success(
        isInstallment 
          ? `Piano rate creato: ${installmentCount} rate da €${installmentAmount.toFixed(2)}` 
          : 'Transazione aggiunta con successo'
      );
      
      // Reset form and state
      form.reset();
      setIsInstallment(false);
      setInstallmentCount('2');
      setInstallmentFrequency('monthly');
      setDownPayment('');
      setNotifyDaysBefore('3');
      setInstallmentDay('');
      setIsManualDates(false);
      setCustomDates([]);
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

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset installment state when closing
      setIsInstallment(false);
      setInstallmentCount('2');
      setInstallmentFrequency('monthly');
      setDownPayment('');
      setNotifyDaysBefore('3');
      setInstallmentDay('');
      setIsManualDates(false);
      setCustomDates([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Transazione</DialogTitle>
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
                  <FormLabel>Importo Totale (€)</FormLabel>
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

            {/* Installment Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-secondary/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="installment-toggle" className="text-sm font-medium">
                  Pagamento rateizzato
                </Label>
                <Switch
                  id="installment-toggle"
                  checked={isInstallment}
                  onCheckedChange={setIsInstallment}
                />
              </div>

              {isInstallment && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Numero Rate</Label>
                      <Select value={installmentCount} onValueChange={setInstallmentCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'rata' : 'rate'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Frequenza</Label>
                      <Select value={installmentFrequency} onValueChange={(v) => setInstallmentFrequency(v as 'monthly' | 'yearly')}>
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

                  {!isManualDates && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Giorno del mese per le rate - opzionale</Label>
                      <Select value={installmentDay} onValueChange={setInstallmentDay}>
                        <SelectTrigger>
                          <SelectValue placeholder="Usa data iniziale" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Usa data iniziale</SelectItem>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>
                              Giorno {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Acconto iniziale (€) - opzionale</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Notifica giorni prima</Label>
                    <Select value={notifyDaysBefore} onValueChange={setNotifyDaysBefore}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 giorno prima</SelectItem>
                        <SelectItem value="3">3 giorni prima</SelectItem>
                        <SelectItem value="5">5 giorni prima</SelectItem>
                        <SelectItem value="7">7 giorni prima</SelectItem>
                        <SelectItem value="14">14 giorni prima</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Installment Preview with Auto/Manual toggle */}
                  {watchAmount && parseFloat(watchAmount) > 0 && customDates.length > 0 && (
                    <InstallmentPreview
                      dates={customDates}
                      amount={installmentAmount}
                      isManualMode={isManualDates}
                      onManualModeChange={handleManualModeChange}
                      onDateChange={handleCustomDateChange}
                      totalAmount={parseFloat(watchAmount) || 0}
                      downPayment={parseFloat(downPayment) || 0}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => handleDialogClose(false)}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
