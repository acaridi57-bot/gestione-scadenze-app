import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant: 'income' | 'expense' | 'balance';
  delay?: number;
}

export function StatCard({ title, value, icon: Icon, variant, delay = 0 }: StatCardProps) {
  const gradientClass = {
    income: 'gradient-income',
    expense: 'gradient-expense',
    balance: 'gradient-primary'
  }[variant];

  const iconBgClass = {
    income: 'bg-income/20',
    expense: 'bg-expense/20',
    balance: 'bg-primary/20'
  }[variant];

  const iconColorClass = {
    income: 'text-income',
    expense: 'text-expense',
    balance: 'text-primary'
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-2xl p-5 shadow-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', iconBgClass)}>
          <Icon className={cn('w-5 h-5', iconColorClass)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}
