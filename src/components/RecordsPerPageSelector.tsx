import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecordsPerPage } from '@/hooks/useRecordsPerPage';

interface RecordsPerPageSelectorProps {
  value: RecordsPerPage;
  onChange: (value: RecordsPerPage) => void;
  totalCount?: number;
}

const OPTIONS: { value: RecordsPerPage; label: string }[] = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'Tutti' },
];

export function RecordsPerPageSelector({ value, onChange, totalCount }: RecordsPerPageSelectorProps) {
  const handleChange = (newValue: string) => {
    const parsed = newValue === 'all' ? 'all' : parseInt(newValue, 10);
    onChange(parsed as RecordsPerPage);
  };

  const displayedCount = value === 'all' ? totalCount : Math.min(value, totalCount || value);
  const showingText = totalCount !== undefined 
    ? `Mostra ${displayedCount} di ${totalCount}`
    : `Mostra ${value === 'all' ? 'Tutti' : value}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{showingText}</span>
      <Select value={String(value)} onValueChange={handleChange}>
        <SelectTrigger className="w-[80px] h-8 text-sm border-primary/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
