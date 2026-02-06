import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  ArrowUpDown,
  X,
  Upload,
  Volume2,
  VolumeX,
  Square,
  Loader2,
  Tag,
  Check,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Search,
  FolderOpen,
  Save,
  Eye,
  RotateCcw,
  History
} from 'lucide-react';
import { useRecordsPerPage } from '@/hooks/useRecordsPerPage';
import { RecordsPerPageSelector } from '@/components/RecordsPerPageSelector';
import { MainLayout } from '@/components/layout/MainLayout';
import { NavigationButtons } from '@/components/layout/NavigationButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { ImportTransactionsDialog } from '@/components/transactions/ImportTransactionsDialog';
import { TransactionActions } from '@/components/transactions/TransactionActions';
import { YearlyTransactionsChart } from '@/components/transactions/YearlyTransactionsChart';
import { ReportByDateRange } from '@/components/reports/ReportByDateRange';
import { AttachmentBadge } from '@/components/attachments/AttachmentBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';
import euroCoin from '@/assets/2-euro-coin.png';
import { CategoryManagementDialog } from '@/components/categories/CategoryManagementDialog';
import { PaymentMethodManagementDialog } from '@/components/payment-methods/PaymentMethodManagementDialog';

type FilterType = 'all' | 'entrata' | 'uscita';
type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export default function Transactions() {
  const { transactions, isLoading, updateTransaction } = useTransactions();
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const { speak, stop, isPlaying, isLoading: isTTSLoading } = useTTS();
  const { recordsPerPage, setRecordsPerPage, applyLimit } = useRecordsPerPage();
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
   const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupFolder, setBackupFolder] = useState<string>(() => {
    return localStorage.getItem('backupFolder') || '';
  });
  const [backupHistory, setBackupHistory] = useState<Array<{ date: string; name: string; data: string }>>(() => {
    try {
      const stored = localStorage.getItem('backupHistory');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Create backup data from existing transactions only
  const createBackupData = useCallback(() => {
    if (transactions.length === 0) return null;
    return {
      backup_date: new Date().toISOString(),
      backup_folder: backupFolder,
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        paid_amount: t.paid_amount,
        description: t.description,
        category: t.categories?.name,
        category_id: t.category_id,
        payment_method_id: t.payment_method_id,
        recurring: t.recurring,
        start_date: t.start_date,
        end_date: t.end_date,
        is_partial: t.is_partial,
        plan_id: t.plan_id,
        installment_index: t.installment_index,
        installment_total: t.installment_total,
      }))
    };
  }, [transactions, backupFolder]);

  // Save backup to history in localStorage
  const saveBackupToHistory = useCallback((data: ReturnType<typeof createBackupData>) => {
    if (!data) return;
    const name = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
    const entry = { date: new Date().toISOString(), name, data: JSON.stringify(data) };
    const newHistory = [entry, ...backupHistory].slice(0, 20); // Keep last 20
    setBackupHistory(newHistory);
    localStorage.setItem('backupHistory', JSON.stringify(newHistory));
    return entry;
  }, [backupHistory]);

  // Auto-save backup on page unload with "Salvataggio Sessione" message
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const data = createBackupData();
      if (data) {
        localStorage.setItem('lastAutoBackup', JSON.stringify(data));
        localStorage.setItem('lastAutoBackupDate', new Date().toISOString());
        // Save to history
        const name = `auto_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        try {
          const stored = localStorage.getItem('backupHistory');
          const history = stored ? JSON.parse(stored) : [];
          const entry = { date: new Date().toISOString(), name, data: JSON.stringify(data) };
          const newHistory = [entry, ...history].slice(0, 20);
          localStorage.setItem('backupHistory', JSON.stringify(newHistory));
        } catch {}
      }
      // Show "Salvataggio Sessione" message
      e.preventDefault();
      e.returnValue = 'Salvataggio Sessione in corso...';
      return 'Salvataggio Sessione in corso...';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [createBackupData]);

  // Handle restore from backup
  const handleRestore = async (backupData: string) => {
    try {
      const parsed = JSON.parse(backupData);
      if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        toast.error('Formato backup non valido');
        return;
      }
      // Download as JSON for the user to import
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ripristino_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Backup ripristinato con ${parsed.transactions.length} transazioni. Usa "Importa" per caricarle.`);
      setShowRestoreDialog(false);
    } catch {
      toast.error('Errore nel ripristino del backup');
    }
  };

  // Handle backup folder selection - use input with webkitdirectory for broad compatibility
  const handleSelectBackupFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // @ts-ignore - webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true;
    // @ts-ignore
    input.directory = true;
    input.onchange = () => {
      const files = input.files;
      if (files && files.length > 0) {
        // Extract folder path from the first file's webkitRelativePath
        const relativePath = (files[0] as any).webkitRelativePath || '';
        const folderName = relativePath.split('/')[0] || 'Desktop';
        setBackupFolder(folderName);
        localStorage.setItem('backupFolder', folderName);
        toast.success(`Cartella backup selezionata: ${folderName}`);
      }
    };
    input.click();
  };

  // Handle manual save backup
  const handleManualSave = () => {
    const data = createBackupData();
    if (!data || data.transactions.length === 0) {
      toast.info('Nessuna transazione da salvare');
      return;
    }
    // Save to history
    saveBackupToHistory(data);
    // Download file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_transazioni_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Backup salvato');
  };

  // Handle restore from file upload
  const handleRestoreFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        handleRestore(content);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleVoiceToggle = () => {
    if (isPlaying) {
      stop();
      setVoiceEnabled(false);
      return;
    }

    if (filteredTransactions.length === 0) {
      toast.info('Nessuna transazione da leggere');
      return;
    }

    const recentTransactions = filteredTransactions.slice(0, 5);
    const totalEntrate = filteredTransactions
      .filter(t => t.type === 'entrata')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalUscite = filteredTransactions
      .filter(t => t.type === 'uscita')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const intro = `Hai ${filteredTransactions.length} transazioni. 
      Totale entrate: ${totalEntrate.toFixed(0)} euro. 
      Totale uscite: ${totalUscite.toFixed(0)} euro.`;

    const transactionDetails = recentTransactions.map(t => {
      const tipo = t.type === 'entrata' ? 'entrata' : 'uscita';
      const categoria = t.categories?.name || 'senza categoria';
      return `${tipo} di ${Number(t.amount).toFixed(0)} euro, ${categoria}`;
    }).join('. ');

    setVoiceEnabled(true);
    speak(`${intro} Ultime transazioni: ${transactionDetails}.`);
  };

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(t => t.type === filter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category_id === categoryFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      result = result.filter(t => t.payment_method_id === paymentMethodFilter);
    }

    // Filter by search query (description or category name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        (t.description?.toLowerCase().includes(query)) ||
        (t.categories?.name?.toLowerCase().includes(query))
      );
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(t => !isBefore(new Date(t.date), startOfDay(startDate)));
    }
    if (endDate) {
      result = result.filter(t => !isAfter(new Date(t.date), endOfDay(endDate)));
    }

    // Sort: Primary = Date ASC, Secondary = Amount DESC
    result.sort((a, b) => {
      // Primary: Date ascending (oldest → newest)
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // Secondary: Amount descending (highest → lowest)
      return Number(b.amount) - Number(a.amount);
    });

    return result;
  }, [transactions, filter, categoryFilter, paymentMethodFilter, sortOrder, startDate, endDate, searchQuery]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const clearAllFilters = () => {
    setFilter('all');
    setCategoryFilter('all');
    setPaymentMethodFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleTogglePaid = async (id: string, isPaid: boolean) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;
      
      if (isPaid) {
        // Unmark as paid
        await updateTransaction.mutateAsync({
          id,
          is_partial: false,
          paid_amount: 0,
        });
        toast.success('Segnato come da pagare');
      } else {
        // Mark as paid
        await updateTransaction.mutateAsync({
          id,
          is_partial: true,
          paid_amount: Number(transaction.amount),
        });
        toast.success('Segnato come pagato');
      }
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const selectedCategoryName = categoryFilter === 'all' 
    ? 'Tutte le categorie' 
    : categories.find(c => c.id === categoryFilter)?.name || 'Categoria';

  const selectedPaymentMethodName = paymentMethodFilter === 'all' 
    ? 'Tutti i metodi' 
    : paymentMethods.find(p => p.id === paymentMethodFilter)?.name || 'Metodo';

  const formatCurrency = (value: number, type: string) => {
    const formatted = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
    return type === 'entrata' ? `+${formatted.replace('€', '').trim()} €` : `-${formatted.replace('€', '').replace('-', '').trim()} €`;
  };

  const formatCurrencySimple = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Calcola totali per categoria
  const getCategoryTotals = () => {
    const totals: { [key: string]: { name: string; entrate: number; uscite: number; icon: string } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryName = t.categories?.name || 'Altro';
      const categoryIcon = t.categories?.icon || '📁';
      
      if (!totals[categoryName]) {
        totals[categoryName] = { name: categoryName, entrate: 0, uscite: 0, icon: categoryIcon };
      }
      
      if (t.type === 'entrata') {
        totals[categoryName].entrate += Number(t.amount);
      } else {
        totals[categoryName].uscite += Number(t.amount);
      }
    });
    
    return Object.values(totals).sort((a, b) => 
      (b.entrate + b.uscite) - (a.entrate + a.uscite)
    );
  };

  const categoryTotals = getCategoryTotals();
  const totalEntrate = filteredTransactions.filter(t => t.type === 'entrata').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalUscite = filteredTransactions.filter(t => t.type === 'uscita').reduce((sum, t) => sum + Number(t.amount), 0);

  const prepareExportData = () => {
    return filteredTransactions.map(t => ({
      data: format(new Date(t.date), 'dd/MM/yyyy'),
      tipo: t.type === 'entrata' ? 'Entrata' : 'Uscita',
      categoria: t.categories?.name || 'Altro',
      descrizione: t.description || '',
      importo: Number(t.amount),
      importo_pagato: Number(t.paid_amount) || 0,
      ricorrente: t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : 'No',
    }));
  };

  const handlePrint = () => {
    // Raggruppa transazioni per CATEGORIA
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; categoryIcon: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      const categoryIcon = t.categories?.icon || '📁';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = {
          transactions: [],
          categoryName,
          categoryIcon,
          entrate: 0,
          uscite: 0
        };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    // Ordina le categorie per nome
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );
    
    const printContent = `
      <html>
        <head>
          <title>Transazioni</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { color: #333; margin-bottom: 5px; font-size: 18px; }
            .header-info { color: #666; margin-bottom: 20px; font-size: 11px; }
            .header-info p { margin: 3px 0; }
            h2 { color: #555; margin-top: 25px; font-size: 14px; }
            .category-header { color: #067d1c; margin-top: 25px; padding: 8px 0; border-top: 2px solid #067d1c; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .entrata { color: #22c55e; }
            .uscita { color: #ef4444; }
            .category-total { margin: 10px 0 25px 0; padding: 8px 12px; background: #f0f9f0; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 11px; text-align: right; }
            .category-total strong { margin-left: 10px; }
            .category-section { page-break-inside: avoid; margin-bottom: 15px; }
            .grand-total { margin-top: 30px; padding: 15px; background: #f5f5f5; border: 2px solid #333; border-radius: 4px; font-size: 12px; }
            .grand-total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>📊 Transazioni</h1>
          <div class="header-info">
            <p><strong>Report:</strong> Transazioni per Categoria</p>
            ${startDate || endDate ? `<p><strong>Periodo:</strong> ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Oggi'}</p>` : ''}
            <p><strong>Generato il:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          ${sortedCategories.map(categoryKey => {
            const catData = transactionsByCategory[categoryKey];
            const saldoCategoria = catData.entrate - catData.uscite;
            return `
              <div class="category-section">
                <div class="category-header">📁 CATEGORIA: ${catData.categoryName}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrizione</th>
                      <th style="text-align:right">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${catData.transactions.map(t => `
                      <tr>
                        <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                        <td>${t.type === 'entrata' ? 'Entrata' : 'Uscita'}</td>
                        <td>${t.description || '-'}</td>
                        <td style="text-align:right" class="${t.type}">${formatCurrencySimple(Number(t.amount))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="category-total">
                  Totale categoria:
                  ${catData.entrate > 0 ? `<strong class="entrata">+${formatCurrencySimple(catData.entrate)}</strong>` : ''}
                  ${catData.uscite > 0 ? `<strong class="uscita">-${formatCurrencySimple(catData.uscite)}</strong>` : ''}
                  <strong>= ${saldoCategoria >= 0 ? '+' : ''}${formatCurrencySimple(saldoCategoria)}</strong>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="grand-total">
            <div class="grand-total-row"><span>Totale Entrate:</span> <strong class="entrata">${formatCurrencySimple(totalEntrate)}</strong></div>
            <div class="grand-total-row"><span>Totale Uscite:</span> <strong class="uscita">${formatCurrencySimple(totalUscite)}</strong></div>
            <div class="grand-total-row" style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
              <span><strong>TOTALE GENERALE:</strong></span> 
              <strong class="${totalEntrate - totalUscite >= 0 ? 'entrata' : 'uscita'}">${formatCurrencySimple(totalEntrate - totalUscite)}</strong>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success('Stampa avviata');
  };

  const handleExportCSV = () => {
    // Group by category
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = { transactions: [], categoryName, entrate: 0, uscite: 0 };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );
    
    let csvContent = `Report Transazioni - Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      csvContent += `Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Oggi'}\n`;
    }
    csvContent += '\n';
    
    sortedCategories.forEach(categoryKey => {
      const catData = transactionsByCategory[categoryKey];
      csvContent += `--- CATEGORIA: ${catData.categoryName} ---\n`;
      csvContent += 'Data;Tipo;Descrizione;Importo;Importo Pagato;Ricorrente\n';
      
      catData.transactions.forEach(t => {
        csvContent += [
          format(new Date(t.date), 'dd/MM/yyyy'),
          t.type === 'entrata' ? 'Entrata' : 'Uscita',
          `"${t.description || ''}"`,
          Number(t.amount).toFixed(2).replace('.', ','),
          (Number(t.paid_amount) || 0).toFixed(2).replace('.', ','),
          t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : 'No'
        ].join(';') + '\n';
      });
      
      const saldo = catData.entrate - catData.uscite;
      csvContent += `Subtotale;Entrate: ${catData.entrate.toFixed(2).replace('.', ',')};;Uscite: ${catData.uscite.toFixed(2).replace('.', ',')};;Saldo: ${saldo.toFixed(2).replace('.', ',')}\n\n`;
    });
    
    csvContent += `\n=== TOTALE GENERALE ===\n`;
    csvContent += `Entrate;${totalEntrate.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Uscite;${totalUscite.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Saldo;${(totalEntrate - totalUscite).toFixed(2).replace('.', ',')}\n`;
    
    downloadFile(csvContent, 'transazioni.csv', 'text/csv;charset=utf-8');
    toast.success('CSV esportato per categoria');
  };

  const handleExportJSON = () => {
    // Group by category
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; categoryIcon: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      const categoryIcon = t.categories?.icon || '📁';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = { transactions: [], categoryName, categoryIcon, entrate: 0, uscite: 0 };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );
    
    const exportData = {
      esportato_il: format(new Date(), 'dd/MM/yyyy HH:mm'),
      periodo: startDate || endDate ? {
        dal: startDate ? format(startDate, 'dd/MM/yyyy') : null,
        al: endDate ? format(endDate, 'dd/MM/yyyy') : null
      } : null,
      totale_generale: {
        entrate: totalEntrate,
        uscite: totalUscite,
        saldo: totalEntrate - totalUscite
      },
      categorie: sortedCategories.map(categoryKey => {
        const catData = transactionsByCategory[categoryKey];
        return {
          nome: catData.categoryName,
          icona: catData.categoryIcon,
          subtotale: {
            entrate: catData.entrate,
            uscite: catData.uscite,
            saldo: catData.entrate - catData.uscite
          },
          transazioni: catData.transactions.map(t => ({
            data: format(new Date(t.date), 'dd/MM/yyyy'),
            tipo: t.type === 'entrata' ? 'Entrata' : 'Uscita',
            descrizione: t.description || '',
            importo: Number(t.amount),
            importo_pagato: Number(t.paid_amount) || 0,
            ricorrente: t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : 'No'
          }))
        };
      })
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'transazioni.json', 'application/json');
    toast.success('JSON esportato per categoria');
  };

  const handleExportSQL = () => {
    // Group by category
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = { transactions: [], categoryName, entrate: 0, uscite: 0 };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );
    
    let sqlContent = `-- Transazioni esportate il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      sqlContent += `-- Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Oggi'}\n`;
    }
    sqlContent += `-- Totale Entrate: ${totalEntrate.toFixed(2)} EUR\n`;
    sqlContent += `-- Totale Uscite: ${totalUscite.toFixed(2)} EUR\n`;
    sqlContent += `-- Saldo: ${(totalEntrate - totalUscite).toFixed(2)} EUR\n\n`;
    
    sortedCategories.forEach(categoryKey => {
      const catData = transactionsByCategory[categoryKey];
      const saldo = catData.entrate - catData.uscite;
      sqlContent += `-- ========================================\n`;
      sqlContent += `-- CATEGORIA: ${catData.categoryName}\n`;
      sqlContent += `-- Subtotale: Entrate ${catData.entrate.toFixed(2)}, Uscite ${catData.uscite.toFixed(2)}, Saldo ${saldo.toFixed(2)}\n`;
      sqlContent += `-- ========================================\n`;
      
      catData.transactions.forEach(t => {
        sqlContent += `INSERT INTO transazioni (data, tipo, categoria, descrizione, importo, importo_pagato, ricorrente) VALUES ('${format(new Date(t.date), 'dd/MM/yyyy')}', '${t.type === 'entrata' ? 'Entrata' : 'Uscita'}', '${catData.categoryName}', '${(t.description || '').replace(/'/g, "''")}', ${Number(t.amount)}, ${Number(t.paid_amount) || 0}, '${t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : 'No'}');\n`;
      });
      sqlContent += '\n';
    });
    
    downloadFile(sqlContent, 'transazioni.sql', 'text/plain');
    toast.success('SQL esportato per categoria');
  };

  const handleExportExcel = () => {
    // Group by category
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = { transactions: [], categoryName, entrate: 0, uscite: 0 };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );
    
    const BOM = '\uFEFF';
    let excelContent = BOM;
    excelContent += `Report Transazioni - Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      excelContent += `Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Oggi'}\n`;
    }
    excelContent += '\n';
    
    sortedCategories.forEach(categoryKey => {
      const catData = transactionsByCategory[categoryKey];
      excelContent += `CATEGORIA: ${catData.categoryName}\n`;
      excelContent += 'Data\tTipo\tDescrizione\tImporto\tImporto Pagato\tRicorrente\n';
      
      catData.transactions.forEach(t => {
        excelContent += [
          format(new Date(t.date), 'dd/MM/yyyy'),
          t.type === 'entrata' ? 'Entrata' : 'Uscita',
          t.description || '',
          Number(t.amount).toFixed(2),
          (Number(t.paid_amount) || 0).toFixed(2),
          t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : 'No'
        ].join('\t') + '\n';
      });
      
      const saldo = catData.entrate - catData.uscite;
      excelContent += `Subtotale\tEntrate: ${catData.entrate.toFixed(2)}\tUscite: ${catData.uscite.toFixed(2)}\tSaldo: ${saldo.toFixed(2)}\n\n`;
    });
    
    excelContent += `\nTOTALE GENERALE\n`;
    excelContent += `Entrate\t${totalEntrate.toFixed(2)}\n`;
    excelContent += `Uscite\t${totalUscite.toFixed(2)}\n`;
    excelContent += `Saldo\t${(totalEntrate - totalUscite).toFixed(2)}\n`;
    
    downloadFile(excelContent, 'transazioni.xls', 'application/vnd.ms-excel;charset=utf-8');
    toast.success('Excel esportato per categoria');
  };

  const handleExportPDF = () => {
    // Raggruppa transazioni per CATEGORIA
    const transactionsByCategory: { [key: string]: { transactions: typeof filteredTransactions; categoryName: string; categoryIcon: string; entrate: number; uscite: number } } = {};
    
    filteredTransactions.forEach(t => {
      const categoryKey = t.category_id || 'altro';
      const categoryName = t.categories?.name || 'Altro';
      const categoryIcon = t.categories?.icon || '📁';
      
      if (!transactionsByCategory[categoryKey]) {
        transactionsByCategory[categoryKey] = {
          transactions: [],
          categoryName,
          categoryIcon,
          entrate: 0,
          uscite: 0
        };
      }
      
      transactionsByCategory[categoryKey].transactions.push(t);
      if (t.type === 'entrata') {
        transactionsByCategory[categoryKey].entrate += Number(t.amount);
      } else {
        transactionsByCategory[categoryKey].uscite += Number(t.amount);
      }
    });
    
    // Sort transactions within each category: Date ASC, Amount DESC
    Object.values(transactionsByCategory).forEach(cat => {
      cat.transactions.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return Number(b.amount) - Number(a.amount);
      });
    });
    
    // Ordina le categorie per nome
    const sortedCategories = Object.keys(transactionsByCategory).sort((a, b) => 
      transactionsByCategory[a].categoryName.localeCompare(transactionsByCategory[b].categoryName)
    );

    const printContent = `
      <html>
        <head>
          <title>Transazioni - PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { color: #333; margin-bottom: 5px; font-size: 18px; }
            .header-info { color: #666; margin-bottom: 20px; font-size: 11px; }
            .header-info p { margin: 3px 0; }
            h2 { color: #555; margin-top: 25px; font-size: 14px; }
            .category-header { color: #067d1c; margin-top: 25px; padding: 8px 0; border-top: 2px solid #067d1c; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .entrata { color: #22c55e; }
            .uscita { color: #ef4444; }
            .category-total { margin: 10px 0 25px 0; padding: 8px 12px; background: #f0f9f0; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 11px; text-align: right; }
            .category-total strong { margin-left: 10px; }
            .category-section { page-break-inside: avoid; margin-bottom: 15px; }
            .grand-total { margin-top: 30px; padding: 15px; background: #f5f5f5; border: 2px solid #333; border-radius: 4px; font-size: 12px; }
            .grand-total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>📊 Report Transazioni</h1>
          <div class="header-info">
            <p><strong>Report:</strong> Transazioni per Categoria</p>
            ${startDate || endDate ? `<p><strong>Periodo:</strong> ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Oggi'}</p>` : ''}
            <p><strong>Generato il:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          ${sortedCategories.map(categoryKey => {
            const catData = transactionsByCategory[categoryKey];
            const saldoCategoria = catData.entrate - catData.uscite;
            return `
              <div class="category-section">
                <div class="category-header">📁 CATEGORIA: ${catData.categoryName}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrizione</th>
                      <th style="text-align:right">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${catData.transactions.map(t => `
                      <tr>
                        <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
                        <td>${t.type === 'entrata' ? 'Entrata' : 'Uscita'}</td>
                        <td>${t.description || '-'}</td>
                        <td style="text-align:right" class="${t.type}">${formatCurrencySimple(Number(t.amount))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="category-total">
                  Totale categoria:
                  ${catData.entrate > 0 ? `<strong class="entrata">+${formatCurrencySimple(catData.entrate)}</strong>` : ''}
                  ${catData.uscite > 0 ? `<strong class="uscita">-${formatCurrencySimple(catData.uscite)}</strong>` : ''}
                  <strong>= ${saldoCategoria >= 0 ? '+' : ''}${formatCurrencySimple(saldoCategoria)}</strong>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="grand-total">
            <div class="grand-total-row"><span>Totale Entrate:</span> <strong class="entrata">${formatCurrencySimple(totalEntrate)}</strong></div>
            <div class="grand-total-row"><span>Totale Uscite:</span> <strong class="uscita">${formatCurrencySimple(totalUscite)}</strong></div>
            <div class="grand-total-row" style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
              <span><strong>TOTALE GENERALE:</strong></span> 
              <strong class="${totalEntrate - totalUscite >= 0 ? 'entrata' : 'uscita'}">${formatCurrencySimple(totalEntrate - totalUscite)}</strong>
            </div>
          </div>
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

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSortLabel = (order: SortOrder) => {
    switch (order) {
      case 'date-desc':
        return 'Data ↓ (decrescente)';
      case 'date-asc':
        return 'Data ↑ (crescente)';
      case 'amount-desc':
        return 'Importo ↓';
      case 'amount-asc':
        return 'Importo ↑';
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="coin-container">
              <div className="banknote-shine coin-rotate w-10 h-10 rounded-full">
                <img src={euroCoin} alt="Euro" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-3xl font-bold text-[#067d1c]"
            >
              Transazioni
            </motion.h1>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <NavigationButtons />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVoiceToggle}
                disabled={isTTSLoading}
                className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
              >
                {isTTSLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Square className="w-4 h-4" />
                ) : voiceEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                {isTTSLoading ? 'Carico...' : isPlaying ? 'Stop' : 'Leggi'}
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setCategoryDialogOpen(true)}
                className="gap-2 bg-secondary text-foreground border-primary/30 hover:bg-primary/10"
                title="Gestisci categorie e sottocategorie"
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Categorie</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setPaymentMethodDialogOpen(true)}
                className="gap-2 bg-secondary text-foreground border-primary/30 hover:bg-primary/10"
                title="Gestisci modalità di pagamento"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Pagamenti</span>
              </Button>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi
            </Button>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <Filter className="w-4 h-4" />
                    {filter === 'all' ? 'Tutte' : filter === 'entrata' ? 'Entrate' : 'Uscite'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    Tutte
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('entrata')}>
                    Entrate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('uscita')}>
                    Uscite
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <ArrowUpDown className="w-4 h-4" />
                    {getSortLabel(sortOrder)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortOrder('date-desc')}>
                    Data ↓ (decrescente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('date-asc')}>
                    Data ↑ (crescente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('amount-desc')}>
                    Importo ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('amount-asc')}>
                    Importo ↑
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Category Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <Tag className="w-4 h-4" />
                    {selectedCategoryName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                    Tutte le categorie
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {categories.map((category) => (
                    <DropdownMenuItem 
                      key={category.id} 
                      onClick={() => setCategoryFilter(category.id)}
                    >
                      <span className="mr-2">{category.icon}</span>
                      {category.name}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "ml-2 text-xs",
                          category.type === 'entrata' ? 'text-income border-income/30' : 'text-expense border-expense/30'
                        )}
                      >
                        {category.type === 'entrata' ? 'Entrata' : 'Uscita'}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Payment Method Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <CreditCard className="w-4 h-4" />
                    {selectedPaymentMethodName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setPaymentMethodFilter('all')}>
                    Tutti i metodi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {paymentMethods.map((method) => (
                    <DropdownMenuItem 
                      key={method.id} 
                      onClick={() => setPaymentMethodFilter(method.id)}
                    >
                      {method.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>


              {/* Clear All Filters */}
              {(filter !== 'all' || categoryFilter !== 'all' || paymentMethodFilter !== 'all' || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset filtri
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* Search and Backup Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca transazione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-primary/30"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* View Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowViewDialog(true)}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
          >
            <Eye className="w-4 h-4" />
            Visualizza
          </Button>
          
          {/* Backup Folder Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectBackupFolder}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
            title={backupFolder ? `Cartella: ${backupFolder}` : 'Seleziona cartella backup'}
          >
            <FolderOpen className="w-4 h-4" />
            {backupFolder ? `📁 ${backupFolder}` : 'Cartella Backup'}
          </Button>
          
          {/* Manual Save Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            className="gap-2 bg-income text-income-foreground hover:bg-income/90"
          >
            <Save className="w-4 h-4" />
            Salva Backup
          </Button>

          {/* Restore Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRestoreDialog(true)}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
          >
            <RotateCcw className="w-4 h-4" />
            Ripristina
          </Button>
        </div>

        {/* Report Date Range Component */}
        <ReportByDateRange
          type="transactions"
          records={transactions}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Import Button */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/10" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importa
          </Button>
        </div>

        {/* Yearly Chart */}
        <YearlyTransactionsChart transactions={transactions} />

        {/* Transactions List */}
        <Card className="shadow-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {filteredTransactions.length} Transazioni
              </div>
              <RecordsPerPageSelector 
                value={recordsPerPage} 
                onChange={setRecordsPerPage}
                totalCount={filteredTransactions.length}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna transazione trovata
              </div>
            ) : (
              <div className="space-y-3">
                {applyLimit(filteredTransactions).map((transaction, index) => (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transaction}
                    formatCurrency={formatCurrency}
                    delay={index * 0.05}
                    onTogglePaid={handleTogglePaid}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <ImportTransactionsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
        <CategoryManagementDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
        <PaymentMethodManagementDialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen} />

        {/* View Dialog - Shows all filtered transactions */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Visualizza Transazioni Filtrate ({filteredTransactions.length})
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredTransactions.length}</div>
                  <div className="text-xs text-muted-foreground">Totali</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-income">
                    {formatCurrencySimple(filteredTransactions.filter(t => t.type === 'entrata').reduce((s, t) => s + Number(t.amount), 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">Entrate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-expense">
                    {formatCurrencySimple(filteredTransactions.filter(t => t.type === 'uscita').reduce((s, t) => s + Number(t.amount), 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">Uscite</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {filteredTransactions.filter(t => t.recurring && t.recurring !== 'none').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Ricorrenti</div>
                </div>
              </div>
              
              {/* Recurring transactions summary */}
              {filteredTransactions.filter(t => t.recurring && t.recurring !== 'none').length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">📅 Transazioni Ricorrenti</h4>
                  <div className="space-y-2">
                    {filteredTransactions.filter(t => t.recurring && t.recurring !== 'none').map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm">
                        <span>{t.description || t.categories?.name || 'Transazione'}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t.recurring === 'monthly' ? 'Mensile' : t.recurring === 'weekly' ? 'Settimanale' : t.recurring}
                          </Badge>
                          <span className={t.type === 'entrata' ? 'text-income' : 'text-expense'}>
                            {formatCurrencySimple(Number(t.amount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Full transaction list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'entrata' ? 'bg-income/10' : 'bg-expense/10'}`}>
                        {t.type === 'entrata' ? <TrendingUp className="w-4 h-4 text-income" /> : <TrendingDown className="w-4 h-4 text-expense" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{t.description || t.categories?.name || 'Transazione'}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(t.date), 'dd/MM/yyyy')}
                          {t.recurring && t.recurring !== 'none' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {t.recurring === 'monthly' ? '📅 Mensile' : '📅 Settimanale'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${t.type === 'entrata' ? 'text-income' : 'text-expense'}`}>
                      {t.type === 'entrata' ? '+' : '-'}{formatCurrencySimple(Number(t.amount))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Print button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Chiudi
                </Button>
                <Button onClick={() => { handlePrint(); setShowViewDialog(false); }} className="gap-2">
                  <Eye className="w-4 h-4" />
                  Stampa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog - Shows backup history */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Ripristina Backup
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Upload backup file */}
              <Button
                variant="outline"
                onClick={handleRestoreFromFile}
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                Carica file backup (.json)
              </Button>

              {/* Backup history list */}
              {backupHistory.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Backup precedenti</h4>
                  {backupHistory.map((backup, index) => {
                    let transCount = 0;
                    try {
                      const parsed = JSON.parse(backup.data);
                      transCount = parsed.transactions?.length || 0;
                    } catch {}
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-sm">{backup.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(backup.date), 'dd/MM/yyyy HH:mm')} • {transCount} transazioni
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(backup.data)}
                          className="gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Ripristina
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun backup disponibile
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
                  Chiudi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
  formatCurrency: (value: number, type: string) => string;
  delay: number;
  onTogglePaid: (id: string, isPaid: boolean) => void;
}

function TransactionItem({ transaction, formatCurrency, delay, onTogglePaid }: TransactionItemProps) {
  const isIncome = transaction.type === 'entrata';
  const isPaid = transaction.is_partial && Number(transaction.paid_amount) >= Number(transaction.amount);
  const isRecurring = transaction.recurring && transaction.recurring !== 'none';
  const isInstallment = transaction.installment_index !== null && transaction.installment_total !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      {/* Paid Checkbox */}
      <button
        onClick={() => onTogglePaid(transaction.id, isPaid)}
        className={cn(
          "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
          isPaid 
            ? "bg-income border-income text-white" 
            : "border-muted-foreground/30 hover:border-income/50"
        )}
        title={isPaid ? 'Segna come da pagare' : 'Segna come pagato'}
      >
        {isPaid && <Check className="w-4 h-4" />}
      </button>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isIncome ? 'bg-income/10' : 'bg-expense/10'
      }`}>
        {isIncome ? (
          <TrendingUp className="w-5 h-5 text-income" />
        ) : (
          <TrendingDown className="w-5 h-5 text-expense" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "font-medium",
            isPaid ? "text-muted-foreground line-through" : "text-foreground"
          )}>
            {transaction.categories?.name || 'Altro'}
          </span>
          {isInstallment && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                transaction.installment_index === 0 
                  ? "text-amber-600 border-amber-600/30 bg-amber-50 dark:bg-amber-950/30" 
                  : "text-primary border-primary/30 bg-primary/5"
              )}
            >
              {transaction.installment_index === 0 
                ? 'Acconto' 
                : `Rata ${transaction.installment_index}/${transaction.installment_total}`
              }
            </Badge>
          )}
          {isRecurring && (
            <Badge variant="outline" className="text-xs">
              Auto
            </Badge>
          )}
          {isPaid && (
            <Badge variant="outline" className="text-xs text-income border-income/30">
              Pagato
            </Badge>
          )}
          {transaction.payment_methods && (
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ 
                borderColor: `${transaction.payment_methods.color}50`,
                color: transaction.payment_methods.color || undefined
              }}
            >
              {transaction.payment_methods.name}
            </Badge>
          )}
          <AttachmentBadge entityType="transaction" entityId={transaction.id} />
        </div>
        {transaction.description && (
          <p className="text-sm text-muted-foreground truncate">
            {transaction.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {format(new Date(transaction.date), 'dd MMM yyyy', { locale: it })}
        </p>
        {/* Acconto e Rimanenza */}
        {Number(transaction.paid_amount) > 0 && Number(transaction.paid_amount) < Number(transaction.amount) && (
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-income" title="Acconto versato">
              Acconto: €{Number(transaction.paid_amount).toFixed(2)}
            </span>
            <span className="text-expense" title="Rimanenza da pagare">
              Rimanenza: €{(Number(transaction.amount) - Number(transaction.paid_amount)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Amount - show remaining if partial payment exists */}
      <div className="text-right flex items-center gap-2">
        <span className={cn(
          "font-semibold",
          isPaid ? "text-muted-foreground" : isIncome ? "text-income" : "text-expense"
        )}>
          {formatCurrency(
            Number(transaction.paid_amount) > 0 && Number(transaction.paid_amount) < Number(transaction.amount)
              ? Number(transaction.amount) - Number(transaction.paid_amount)
              : Number(transaction.amount),
            transaction.type
          )}
        </span>
        <TransactionActions transaction={transaction} />
      </div>
    </motion.div>
  );
}
