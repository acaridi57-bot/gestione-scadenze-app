import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { useReminders } from '@/hooks/useReminders';
import { useCategories } from '@/hooks/useCategories';
import { PaymentMethodSelect } from '@/components/payment-methods/PaymentMethodSelect';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, 'Inserisci un titolo'),
  description: z.string().optional(),
  amount: z.string().optional(),
  category_id: z.string().optional(),
  payment_method_id: z.string().optional(),
  due_date: z.date(),
  notify_days_before: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface AddReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReminderDialog({ open, onOpenChange }: AddReminderDialogProps) {
  const { addReminder } = useReminders();
  const { expenseCategories } = useCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      category_id: '',
      payment_method_id: '',
      due_date: new Date(),
      notify_days_before: '3',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await addReminder.mutateAsync({
        title: data.title,
        description: data.description || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        paid_amount: 0,
        category_id: data.category_id || null,
        due_date: format(data.due_date, 'yyyy-MM-dd'),
        completed: false,
        notify_days_before: parseInt(data.notify_days_before),
      });
      
      toast.success('Promemoria aggiunto con successo');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Promemoria</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Es: Rata mutuo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data scadenza</FormLabel>
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
              name="notify_days_before"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notifica giorni prima</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 giorno prima</SelectItem>
                      <SelectItem value="2">2 giorni prima</SelectItem>
                      <SelectItem value="3">3 giorni prima</SelectItem>
                      <SelectItem value="5">5 giorni prima</SelectItem>
                      <SelectItem value="7">1 settimana prima</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="flex-1 gradient-primary"
                disabled={addReminder.isPending}
              >
                {addReminder.isPending ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
