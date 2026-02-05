import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Reminder } from '@/hooks/useReminders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Printer, Mail, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RemindersYearChartProps {
  reminders: Reminder[];
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function RemindersYearChart({ reminders }: RemindersYearChartProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [email, setEmail] = useState('');

  // Get available years from reminders
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    reminders.forEach(r => {
      const year = new Date(r.due_date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [reminders, currentYear]);

  const getChartDataForYear = (year: number) => {
    return MONTHS.map((name, index) => {
      const monthReminders = reminders.filter(r => {
        const date = new Date(r.due_date);
        return date.getMonth() === index && date.getFullYear() === year;
      });
      
      const total = monthReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      
      return {
        name,
        amount: total,
        monthIndex: index,
        type: year === currentYear 
          ? (index < currentMonth ? 'past' : index === currentMonth ? 'current' : 'future')
          : 'compare'
      };
    });
  };

  const chartData = useMemo(() => {
    const mainData = getChartDataForYear(selectedYear);
    
    if (compareYear) {
      const compareData = getChartDataForYear(compareYear);
      return mainData.map((item, index) => ({
        ...item,
        compareAmount: compareData[index].amount
      }));
    }
    
    return mainData;
  }, [reminders, selectedYear, compareYear, currentMonth, currentYear]);

  const totalSelectedYear = useMemo(() => {
    return reminders
      .filter(r => new Date(r.due_date).getFullYear() === selectedYear)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reminders, selectedYear]);

  const totalCompareYear = useMemo(() => {
    if (!compareYear) return 0;
    return reminders
      .filter(r => new Date(r.due_date).getFullYear() === compareYear)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reminders, compareYear]);

  const getBarColor = (type: string) => {
    switch (type) {
      case 'past':
        return 'hsl(var(--muted-foreground))';
      case 'current':
        return 'hsl(var(--expense))';
      case 'future':
        return 'hsl(var(--income))';
      case 'compare':
        return 'hsl(var(--primary))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const handlePrintPDF = () => {
    const yearReminders = reminders.filter(r => 
      new Date(r.due_date).getFullYear() === selectedYear
    );

    const printContent = `
      <html>
        <head>
          <title>Scadenze ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 20px; }
            .total { font-size: 18px; font-weight: bold; color: #ef4444; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .completed { text-decoration: line-through; color: #999; }
          </style>
        </head>
        <body>
          <h1>Scadenze ${selectedYear}</h1>
          <p class="subtitle">Esportato il: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p class="total">Totale ${selectedYear}: ${formatCurrency(totalSelectedYear)}</p>
          ${compareYear ? `<p>Confronto ${compareYear}: ${formatCurrency(totalCompareYear)}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Scadenza</th>
                <th>Importo</th>
                <th>Categoria</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              ${yearReminders.map(r => `
                <tr class="${r.completed ? 'completed' : ''}">
                  <td>${r.title}</td>
                  <td>${format(new Date(r.due_date), 'dd/MM/yyyy')}</td>
                  <td>${r.amount ? formatCurrency(Number(r.amount)) : '-'}</td>
                  <td>${r.categories?.name || 'Altro'}</td>
                  <td>${r.completed ? '✓ Completato' : 'In sospeso'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      toast.info('Usa "Salva come PDF" nel dialogo di stampa');
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }

    // For now, show a toast that email feature needs configuration
    toast.info('Funzione email in configurazione. Contatta l\'amministratore per abilitarla.');
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                {selectedYear}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableYears.map(year => (
                <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Compare Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                {compareYear ? `Confronta: ${compareYear}` : 'Confronta'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCompareYear(null)}>
                Nessun confronto
              </DropdownMenuItem>
              {availableYears.filter(y => y !== selectedYear).map(year => (
                <DropdownMenuItem key={year} onClick={() => setCompareYear(year)}>
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Print PDF Button */}
          <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/10" onClick={handlePrintPDF}>
            <Printer className="w-4 h-4 mr-2" />
            Stampa PDF
          </Button>
        </div>

        {/* Email Section */}
        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="Email destinatario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-48 h-8 text-sm"
          />
          <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/10" onClick={handleSendEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Invia
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-muted-foreground">
          Totale {selectedYear}:
        </span>
        <span className="font-semibold text-expense">
          {formatCurrency(totalSelectedYear)}
        </span>
        {compareYear && (
          <>
            <span className="text-sm text-muted-foreground">
              vs {compareYear}:
            </span>
            <span className="font-semibold text-primary">
              {formatCurrency(totalCompareYear)}
            </span>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                name === 'compareAmount' ? `Scadenze ${compareYear}` : `Scadenze ${selectedYear}`
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
              ))}
            </Bar>
            {compareYear && (
              <Bar dataKey="compareAmount" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" opacity={0.5} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
        {selectedYear === currentYear && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">Mesi passati</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-expense" />
              <span className="text-sm text-muted-foreground">Mese corrente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-income" />
              <span className="text-sm text-muted-foreground">Mesi futuri</span>
            </div>
          </>
        )}
        {compareYear && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary opacity-50" />
            <span className="text-sm text-muted-foreground">Confronto {compareYear}</span>
          </div>
        )}
      </div>
    </div>
  );
}
