import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/hooks/useTransactions';

interface MonthlyChartProps {
  transactions: Transaction[];
}

export function MonthlyChart({ transactions }: MonthlyChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data: { day: string; entrate: number; uscite: number }[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      
      data.push({
        day: String(i),
        entrate: dayTransactions
          .filter(t => t.type === 'entrata')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        uscite: dayTransactions
          .filter(t => t.type === 'uscita')
          .reduce((sum, t) => sum + Number(t.amount), 0)
      });
    }
    
    return data;
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-card border border-border">
          <p className="text-sm text-muted-foreground mb-2">Giorno {label}</p>
          <p className="text-sm text-income">
            Entrate: €{payload[0]?.value?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-expense">
            Uscite: €{payload[1]?.value?.toFixed(2) || '0.00'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="glass rounded-2xl p-5 shadow-card"
    >
      <h3 className="text-lg font-semibold text-[#067d1c] mb-4">Andamento Mensile</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 18%)" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(240, 5%, 55%)" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(240, 5%, 55%)" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="entrate"
              stroke="hsl(142, 76%, 46%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEntrate)"
            />
            <Area
              type="monotone"
              dataKey="uscite"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUscite)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
