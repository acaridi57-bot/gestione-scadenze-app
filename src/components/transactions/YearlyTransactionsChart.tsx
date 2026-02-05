import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Transaction } from '@/hooks/useTransactions';
import { format, getYear, getMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface YearlyTransactionsChartProps {
  transactions: Transaction[];
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function YearlyTransactionsChart({ transactions }: YearlyTransactionsChartProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [compareYear, setCompareYear] = useState<string>('none');

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      years.add(getYear(new Date(t.date)));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Process data for chart
  const chartData = useMemo(() => {
    const data = MONTHS.map((month, index) => ({
      month,
      entrate: 0,
      uscite: 0,
      entrateConfronto: 0,
      usciteConfronto: 0,
    }));

    transactions.forEach(t => {
      const date = new Date(t.date);
      const year = getYear(date);
      const monthIndex = getMonth(date);
      const amount = Number(t.amount);

      if (year === parseInt(selectedYear)) {
        if (t.type === 'entrata') {
          data[monthIndex].entrate += amount;
        } else {
          data[monthIndex].uscite += amount;
        }
      }

      if (compareYear !== 'none' && year === parseInt(compareYear)) {
        if (t.type === 'entrata') {
          data[monthIndex].entrateConfronto += amount;
        } else {
          data[monthIndex].usciteConfronto += amount;
        }
      }
    });

    return data;
  }, [transactions, selectedYear, compareYear]);

  // Calculate totals
  const totals = useMemo(() => {
    const selectedYearTransactions = transactions.filter(
      t => getYear(new Date(t.date)) === parseInt(selectedYear)
    );
    
    const entrate = selectedYearTransactions
      .filter(t => t.type === 'entrata')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const uscite = selectedYearTransactions
      .filter(t => t.type === 'uscita')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    let entrateConfronto = 0;
    let usciteConfronto = 0;

    if (compareYear !== 'none') {
      const compareYearTransactions = transactions.filter(
        t => getYear(new Date(t.date)) === parseInt(compareYear)
      );
      entrateConfronto = compareYearTransactions
        .filter(t => t.type === 'entrata')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      usciteConfronto = compareYearTransactions
        .filter(t => t.type === 'uscita')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    return {
      entrate,
      uscite,
      bilancio: entrate - uscite,
      entrateConfronto,
      usciteConfronto,
      bilancioConfronto: entrateConfronto - usciteConfronto,
    };
  }, [transactions, selectedYear, compareYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (availableYears.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card mb-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#067d1c]" />
            <CardTitle className="text-lg text-[#067d1c]">Andamento Annuale</CardTitle>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Anno:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] text-primary border-primary/30 hover:bg-primary/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confronta:</span>
              <Select value={compareYear} onValueChange={setCompareYear}>
                <SelectTrigger className="w-[100px] text-primary border-primary/30 hover:bg-primary/10">
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {availableYears
                    .filter(y => y.toString() !== selectedYear)
                    .map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart */}
        <div className="h-[300px] w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickFormatter={(value) => `€${value/1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: 10 }}
              />
              <Bar 
                dataKey="entrate" 
                name={`Entrate ${selectedYear}`}
                fill="hsl(160, 60%, 35%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="uscite" 
                name={`Uscite ${selectedYear}`}
                fill="hsl(16, 80%, 55%)" 
                radius={[4, 4, 0, 0]}
              />
              {compareYear !== 'none' && (
                <>
                  <Bar 
                    dataKey="entrateConfronto" 
                    name={`Entrate ${compareYear}`}
                    fill="hsl(160, 60%, 55%)" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.6}
                  />
                  <Bar 
                    dataKey="usciteConfronto" 
                    name={`Uscite ${compareYear}`}
                    fill="hsl(16, 80%, 70%)" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.6}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-income/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-income" />
              <span className="text-sm text-muted-foreground">Entrate {selectedYear}</span>
            </div>
            <p className="text-xl font-bold text-income">{formatCurrency(totals.entrate)}</p>
            {compareYear !== 'none' && (
              <p className="text-xs text-muted-foreground mt-1">
                {compareYear}: {formatCurrency(totals.entrateConfronto)}
              </p>
            )}
          </div>
          
          <div className="bg-expense/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-expense" />
              <span className="text-sm text-muted-foreground">Uscite {selectedYear}</span>
            </div>
            <p className="text-xl font-bold text-expense">{formatCurrency(totals.uscite)}</p>
            {compareYear !== 'none' && (
              <p className="text-xs text-muted-foreground mt-1">
                {compareYear}: {formatCurrency(totals.usciteConfronto)}
              </p>
            )}
          </div>
          
          <div className={`rounded-lg p-4 ${totals.bilancio >= 0 ? 'bg-income/10' : 'bg-expense/10'}`}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Bilancio {selectedYear}</span>
            </div>
            <p className={`text-xl font-bold ${totals.bilancio >= 0 ? 'text-income' : 'text-expense'}`}>
              {totals.bilancio >= 0 ? '+' : ''}{formatCurrency(totals.bilancio)}
            </p>
            {compareYear !== 'none' && (
              <p className="text-xs text-muted-foreground mt-1">
                {compareYear}: {totals.bilancioConfronto >= 0 ? '+' : ''}{formatCurrency(totals.bilancioConfronto)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
