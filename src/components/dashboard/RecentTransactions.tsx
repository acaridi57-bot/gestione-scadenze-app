import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Transaction } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[
      iconName.split('-').map((word: string, i: number) => 
        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      ).join('')
    ] || LucideIcons.Circle;
    return IconComponent;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="glass rounded-2xl p-5 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#067d1c]">Transazioni Recenti</h3>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Nessuna transazione</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTransactions.map((transaction, index) => {
            const isIncome = transaction.type === 'entrata';
            const Icon = transaction.categories 
              ? getIcon(transaction.categories.icon)
              : isIncome ? ArrowUpRight : ArrowDownRight;

            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      isIncome ? 'bg-income/20' : 'bg-expense/20'
                    )}
                    style={transaction.categories ? { backgroundColor: `${transaction.categories.color}20` } : undefined}
                  >
                    <Icon 
                      className={cn(
                        'w-5 h-5',
                        isIncome ? 'text-income' : 'text-expense'
                      )}
                      style={transaction.categories ? { color: transaction.categories.color } : undefined}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.description || transaction.categories?.name || (isIncome ? 'Entrata' : 'Uscita')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(transaction.date), 'd MMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-sm font-semibold',
                    isIncome ? 'text-income' : 'text-expense'
                  )}>
                    {isIncome ? '+' : '-'}€{Number(transaction.amount).toFixed(2)}
                  </p>
                  {transaction.is_partial && (
                    <p className="text-xs text-muted-foreground">
                      Pagato: €{Number(transaction.paid_amount).toFixed(2)}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
