import { format } from 'date-fns';
import { CalendarIcon, Zap, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InstallmentPreviewProps {
  dates: Date[];
  amount: number;
  isManualMode: boolean;
  onManualModeChange: (manual: boolean) => void;
  onDateChange: (index: number, date: Date | undefined) => void;
  totalAmount: number;
  downPayment?: number;
}

export function InstallmentPreview({
  dates,
  amount,
  isManualMode,
  onManualModeChange,
  onDateChange,
  totalAmount,
  downPayment = 0,
}: InstallmentPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  if (dates.length === 0) return null;

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      {/* Toggle Auto/Manual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isManualMode ? (
            <Hand className="w-4 h-4 text-amber-500" />
          ) : (
            <Zap className="w-4 h-4 text-primary" />
          )}
          <Label className="text-sm font-medium">
            {isManualMode ? 'Date manuali' : 'Date automatiche'}
          </Label>
        </div>
        <Switch
          checked={isManualMode}
          onCheckedChange={onManualModeChange}
        />
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Importo per rata:</span>
        <span className="font-bold text-primary">{formatCurrency(amount)}</span>
      </div>

      {downPayment > 0 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Residuo dopo acconto:</span>
          <span>{formatCurrency(totalAmount - downPayment)}</span>
        </div>
      )}

      {/* Dates preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3 h-3 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">
            Scadenze rate {isManualMode && '(clicca per modificare)'}:
          </Label>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {dates.map((date, index) => (
            <div key={index}>
              {isManualMode ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between text-xs font-normal hover:bg-primary/10 hover:border-primary"
                    >
                      <span className="text-muted-foreground">Rata {index + 1}:</span>
                      <span className="flex items-center gap-1">
                        {format(date, 'dd/MM/yy')}
                        <CalendarIcon className="w-3 h-3 opacity-50" />
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => onDateChange(index, newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="h-8 px-3 flex items-center justify-between text-xs rounded-md border bg-background">
                  <span className="text-muted-foreground">Rata {index + 1}:</span>
                  <span>{format(date, 'dd/MM/yy')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-amber-600">
        <span>🔔 Riceverai promemoria per ogni rata</span>
      </div>
    </div>
  );
}
