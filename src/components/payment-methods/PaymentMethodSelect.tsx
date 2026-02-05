import { CreditCard, Banknote, Building2, Smartphone, Wallet } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

interface PaymentMethodSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'credit-card': <CreditCard className="w-4 h-4" />,
  'banknote': <Banknote className="w-4 h-4" />,
  'building-2': <Building2 className="w-4 h-4" />,
  'smartphone': <Smartphone className="w-4 h-4" />,
  'wallet': <Wallet className="w-4 h-4" />,
};

export function PaymentMethodSelect({ value, onValueChange, placeholder = "Seleziona metodo" }: PaymentMethodSelectProps) {
  const { paymentMethods, isLoading } = usePaymentMethods();

  const getIcon = (iconName: string | null) => {
    if (!iconName) return <Wallet className="w-4 h-4" />;
    return iconMap[iconName] || <Wallet className="w-4 h-4" />;
  };

  const selectedMethod = paymentMethods.find(m => m.id === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedMethod && (
            <div className="flex items-center gap-2">
              <span style={{ color: selectedMethod.color || undefined }}>
                {getIcon(selectedMethod.icon)}
              </span>
              <span>{selectedMethod.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>Caricamento...</SelectItem>
        ) : paymentMethods.length === 0 ? (
          <SelectItem value="empty" disabled>Nessun metodo disponibile</SelectItem>
        ) : (
          paymentMethods.map((method) => (
            <SelectItem key={method.id} value={method.id}>
              <div className="flex items-center gap-2">
                <span style={{ color: method.color || undefined }}>
                  {getIcon(method.icon)}
                </span>
                <span>{method.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
