import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UpcomingInstallments() {
  const navigate = useNavigate();
  const { transactions } = useTransactions();

  const upcomingInstallments = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    // Filter installment transactions due in next 7 days that are not paid
    return transactions
      .filter(t => {
        if (!t.plan_id || !t.installment_index) return false;
        
        const dueDate = new Date(t.date);
        const isPaid = t.is_partial === true || (Number(t.paid_amount) >= Number(t.amount));
        
        // Include if not paid and due within next 7 days (or overdue)
        return !isPaid && isBefore(dueDate, nextWeek);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const totalAmount = useMemo(() => {
    return upcomingInstallments.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [upcomingInstallments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getDaysUntil = (dateStr: string) => {
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(dateStr));
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyClass = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days < 0) return 'text-destructive bg-destructive/10 border-destructive/30';
    if (days <= 2) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-500/30';
    return 'text-primary bg-primary/5 border-primary/20';
  };

  if (upcomingInstallments.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Rate in Scadenza
              {upcomingInstallments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {upcomingInstallments.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/plans')}
              className="text-primary hover:bg-primary/10"
            >
              Vai ai Piani
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Total Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-expense/10 border border-expense/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-expense" />
              <span className="text-sm font-medium">Totale da pagare (7 giorni)</span>
            </div>
            <span className="text-lg font-bold text-expense">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Installments List (max 5) */}
          <div className="space-y-2">
            {upcomingInstallments.slice(0, 5).map((installment, index) => {
              const daysUntil = getDaysUntil(installment.date);
              const urgencyClass = getUrgencyClass(installment.date);
              
              return (
                <motion.div
                  key={installment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    urgencyClass
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {installment.description || 'Rata'}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Rata {installment.installment_index}/{installment.installment_total}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(installment.date), 'dd MMM yyyy', { locale: it })}</span>
                      <span className="font-medium">
                        {daysUntil < 0 
                          ? `(scaduta da ${Math.abs(daysUntil)} giorni)` 
                          : daysUntil === 0 
                            ? '(oggi!)' 
                            : `(tra ${daysUntil} giorni)`
                        }
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-base ml-3">
                    {formatCurrency(Number(installment.amount))}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Show more link */}
          {upcomingInstallments.length > 5 && (
            <Button
              variant="link"
              className="w-full text-primary"
              onClick={() => navigate('/plans')}
            >
              Vedi tutte le {upcomingInstallments.length} rate →
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
