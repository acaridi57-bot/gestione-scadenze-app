import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Calendar,
  ArrowUpDown,
  VolumeX,
  Volume2,
  Send,
  Bell,
  BellRing,
  BarChart3,
  Download,
  CalendarIcon,
  X,
  Loader2,
  Square,
  Link2,
  Copy,
  Apple,
  CreditCard,
  Check,
  Search,
  Eye
} from 'lucide-react';
import { useRecordsPerPage } from '@/hooks/useRecordsPerPage';
import { RecordsPerPageSelector } from '@/components/RecordsPerPageSelector';
import { MainLayout } from '@/components/layout/MainLayout';
import { NavigationButtons } from '@/components/layout/NavigationButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dropdown-menu';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useNotifications } from '@/hooks/useNotifications';
import { useTTS } from '@/hooks/useTTS';
import { useAuth } from '@/hooks/useAuth';
import { format, isBefore, isAfter, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { AddReminderDialog } from '@/components/reminders/AddReminderDialog';
import { RemindersYearChart } from '@/components/reminders/RemindersYearChart';
import { ReminderActions } from '@/components/reminders/ReminderActions';
import { PaymentMethodManagementDialog } from '@/components/payment-methods/PaymentMethodManagementDialog';
import { ReportByDateRange } from '@/components/reports/ReportByDateRange';
import { AttachmentBadge } from '@/components/attachments/AttachmentBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import euroCoin from '@/assets/2-euro-coin.png';
import { generateICSCalendar, downloadICSFile, CalendarEvent } from '@/lib/calendar-utils';

type FilterType = 'all' | 'pending' | 'completed';
type SortOrder = 'date-asc' | 'date-desc' | 'amount-desc' | 'amount-asc';

export default function Reminders() {
  const { reminders, isLoading, toggleCompleted } = useReminders();
  const { paymentMethods } = usePaymentMethods();
  const { user } = useAuth();
  const { 
    notificationsEnabled, 
    permission, 
    checkUpcomingReminders,
    sendNotification 
  } = useNotifications();
  const { speak, stop, isPlaying, isLoading: isTTSLoading } = useTTS();
  const { recordsPerPage, setRecordsPerPage, applyLimit } = useRecordsPerPage();
  const [filter, setFilter] = useState<FilterType>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Generate webcal URL for Google Calendar sync
  const generateWebcalUrl = () => {
    if (!user?.id) {
      toast.error('Devi essere autenticato per usare questa funzione');
      return null;
    }
    const token = btoa(user.id).replace(/=/g, '');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const httpUrl = `${baseUrl}/functions/v1/calendar-feed?user_id=${user.id}&token=${token}`;
    return httpUrl;
  };

  const handleCopyWebcalUrl = async () => {
    const url = generateWebcalUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        'URL copiato! Incollalo in Google Calendar: Impostazioni → Aggiungi calendario → Da URL',
        { duration: 5000 }
      );
    } catch {
      toast.error('Errore durante la copia');
    }
  };

  const handleOpenGoogleCalendar = () => {
    const url = generateWebcalUrl();
    if (!url) return;
    
    // Open Google Calendar add by URL page
    const googleCalUrl = `https://calendar.google.com/calendar/r/settings/addbyurl`;
    window.open(googleCalUrl, '_blank');
    
    // Copy URL to clipboard for easy paste
    navigator.clipboard.writeText(url).then(() => {
      toast.success(
        'URL copiato! Incollalo nel campo "URL del calendario" su Google Calendar',
        { duration: 6000 }
      );
    });
  };

  const handleOpenAppleCalendar = () => {
    if (!user?.id) {
      toast.error('Devi essere autenticato per usare questa funzione');
      return;
    }
    const token = btoa(user.id).replace(/=/g, '');
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    // Convert https:// to webcal:// for Apple Calendar native support
    const webcalUrl = `webcal://${baseUrl.replace('https://', '')}/functions/v1/calendar-feed?user_id=${user.id}&token=${token}`;
    
    // Open webcal URL - will trigger Apple Calendar subscription dialog
    window.location.href = webcalUrl;
    
    toast.success(
      'Apertura Calendario Apple... Conferma la sottoscrizione nel popup.',
      { duration: 5000 }
    );
  };

  // Handle voice toggle and read reminders
  const handleVoiceToggle = () => {
    if (isPlaying) {
      stop();
      setVoiceEnabled(false);
      return;
    }

    const pendingReminders = reminders.filter(r => !r.completed);
    if (pendingReminders.length === 0) {
      toast.info('Nessun promemoria da leggere');
      return;
    }

    // Build text to speak
    const today = new Date();
    const textParts = pendingReminders.slice(0, 5).map(r => {
      const dueDate = new Date(r.due_date);
      const daysUntil = differenceInDays(dueDate, today);
      
      let dateText = '';
      if (daysUntil < 0) {
        dateText = 'scaduto';
      } else if (daysUntil === 0) {
        dateText = 'oggi';
      } else if (daysUntil === 1) {
        dateText = 'domani';
      } else {
        dateText = `tra ${daysUntil} giorni`;
      }

      const amountText = r.amount ? `, importo ${Number(r.amount).toFixed(0)} euro` : '';
      return `${r.title}, scade ${dateText}${amountText}`;
    });

    const intro = pendingReminders.length === 1 
      ? 'Hai un promemoria in sospeso.'
      : `Hai ${pendingReminders.length} promemoria in sospeso.`;

    const fullText = `${intro} ${textParts.join('. ')}.`;
    
    setVoiceEnabled(true);
    speak(fullText);
  };

  // Count upcoming reminders (within 3 days)
  const upcomingCount = useMemo(() => {
    const today = new Date();
    return reminders.filter(r => {
      if (r.completed) return false;
      const dueDate = new Date(r.due_date);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 0 && daysUntil <= 3;
    }).length;
  }, [reminders]);

  // Check for upcoming reminders on load
  useEffect(() => {
    if (notificationsEnabled && permission === 'granted') {
      checkUpcomingReminders();
    }
  }, [notificationsEnabled, permission, checkUpcomingReminders]);

  // Handle notify button click
  const handleNotifyClick = () => {
    if (permission !== 'granted') {
      toast.warning('Abilita le notifiche nelle impostazioni');
      return;
    }

    const today = new Date();
    const upcomingReminders = reminders.filter(r => {
      if (r.completed) return false;
      const dueDate = new Date(r.due_date);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (upcomingReminders.length === 0) {
      toast.info('Nessuna scadenza imminente');
      return;
    }

    upcomingReminders.forEach(reminder => {
      const dueDate = new Date(reminder.due_date);
      const daysUntil = differenceInDays(dueDate, today);
      
      let message = '';
      if (daysUntil === 0) {
        message = 'Scade oggi!';
      } else if (daysUntil === 1) {
        message = 'Scade domani!';
      } else {
        message = `Scade tra ${daysUntil} giorni`;
      }

      const amountText = reminder.amount 
        ? ` - ${formatCurrency(Number(reminder.amount))}`
        : '';

      sendNotification(`📅 ${reminder.title}`, {
        body: `${message}${amountText}`,
        tag: `reminder-${reminder.id}`,
      });
    });

    toast.success(`${upcomingReminders.length} notifiche inviate`);
  };

  const filteredReminders = useMemo(() => {
    let result = [...reminders];

    // Filter by status
    if (filter === 'pending') {
      result = result.filter(r => !r.completed);
    } else if (filter === 'completed') {
      result = result.filter(r => r.completed);
    }

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      result = result.filter(r => r.payment_method_id === paymentMethodFilter);
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(r => !isBefore(new Date(r.due_date), startOfDay(startDate)));
    }
    if (endDate) {
      result = result.filter(r => !isAfter(new Date(r.due_date), endOfDay(endDate)));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.title?.toLowerCase().includes(query)) ||
        (r.description?.toLowerCase().includes(query)) ||
        (r.categories?.name?.toLowerCase().includes(query))
      );
    }

    // Sort: Primary = Date ASC, Secondary = Amount DESC
    result.sort((a, b) => {
      // Primary: Date ascending (oldest → newest)
      const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // Secondary: Amount descending (highest → lowest)
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    });

    return result;
  }, [reminders, filter, paymentMethodFilter, sortOrder, startDate, endDate, searchQuery]);

  const selectedPaymentMethodName = paymentMethodFilter === 'all' 
    ? 'Tutti i metodi' 
    : paymentMethods.find(p => p.id === paymentMethodFilter)?.name || 'Metodo';

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    toggleCompleted.mutate({ id, completed });
  };

  const totalYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return reminders
      .filter(r => new Date(r.due_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reminders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getSortLabel = (order: SortOrder) => {
    switch (order) {
      case 'date-asc':
        return 'Data ↑ (crescente)';
      case 'date-desc':
        return 'Data ↓ (decrescente)';
      case 'amount-desc':
        return 'Importo ↓';
      case 'amount-asc':
        return 'Importo ↑';
    }
  };

  const getFilterLabel = (f: FilterType) => {
    switch (f) {
      case 'all':
        return `Tutti (${reminders.length})`;
      case 'pending':
        return 'In sospeso';
      case 'completed':
        return 'Completati';
    }
  };

  const prepareExportData = () => {
    return filteredReminders.map(r => ({
      titolo: r.title,
      descrizione: r.description || '',
      scadenza: format(new Date(r.due_date), 'dd/MM/yyyy'),
      importo: Number(r.amount) || 0,
      categoria: r.categories?.name || 'Altro',
      completato: r.completed ? 'Sì' : 'No',
      giorni_preavviso: r.notify_days_before || 3,
    }));
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

  const handleExportICS = () => {
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    if (pendingReminders.length === 0) {
      toast.error('Nessun promemoria da esportare');
      return;
    }

    const events: CalendarEvent[] = pendingReminders.map(r => {
      const dueDate = new Date(r.due_date);
      dueDate.setHours(9, 0, 0, 0);

      const amountText = r.amount 
        ? ` - Importo: ${formatCurrency(Number(r.amount))}`
        : '';

      return {
        title: `📅 ${r.title}`,
        description: `${r.description || ''}${amountText}`,
        startDate: dueDate,
        reminder: (r.notify_days_before || 3) * 24 * 60,
      };
    });

    const icsContent = generateICSCalendar(events, 'Scadenze - Gestione Scadenze');
    downloadICSFile(icsContent, `scadenze_${format(new Date(), 'yyyy-MM-dd')}.ics`);
    toast.success(`${pendingReminders.length} promemoria esportati. Apri il file per importarli nel Calendario.`);
  };

  const handlePrint = () => {
    // Filter only pending (not completed) reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = {
          reminders: [],
          categoryName,
          total: 0
        };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    // Sort categories by name
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const printContent = `
      <html>
        <head>
          <title>Scadenze</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { color: #333; margin-bottom: 5px; font-size: 18px; }
            .header-info { color: #666; margin-bottom: 20px; font-size: 11px; }
            .header-info p { margin: 3px 0; }
            .category-header { color: #067d1c; margin-top: 25px; padding: 8px 0; border-top: 2px solid #067d1c; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .overdue { color: #ef4444; }
            .category-total { margin: 10px 0 25px 0; padding: 8px 12px; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 4px; font-size: 11px; text-align: right; }
            .category-section { page-break-inside: avoid; margin-bottom: 15px; }
            .grand-total { margin-top: 30px; padding: 15px; background: #f5f5f5; border: 2px solid #333; border-radius: 4px; font-size: 12px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>📅 Scadenze in Sospeso</h1>
          <div class="header-info">
            <p><strong>Report:</strong> Scadenze per Categoria</p>
            ${startDate || endDate ? `<p><strong>Periodo:</strong> ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fine'}</p>` : ''}
            <p><strong>Generato il:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          ${sortedCategories.length === 0 ? '<p>Nessuna scadenza in sospeso.</p>' : sortedCategories.map(categoryKey => {
            const catData = remindersByCategory[categoryKey];
            return `
              <div class="category-section">
                <div class="category-header">📁 CATEGORIA: ${catData.categoryName}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Scadenza</th>
                      <th>Titolo</th>
                      <th>Descrizione</th>
                      <th style="text-align:right">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${catData.reminders.map(r => `
                      <tr class="${isBefore(new Date(r.due_date), new Date()) ? 'overdue' : ''}">
                        <td>${format(new Date(r.due_date), 'dd/MM/yyyy')}</td>
                        <td>${r.title}</td>
                        <td>${r.description || '-'}</td>
                        <td style="text-align:right">${r.amount ? formatCurrency(Number(r.amount)) : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="category-total">
                  Totale categoria: <strong>${formatCurrency(catData.total)}</strong>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="grand-total">
            <strong>TOTALE GENERALE: ${formatCurrency(grandTotal)}</strong>
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
    // Filter only pending reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = { reminders: [], categoryName, total: 0 };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    let csvContent = `Report Scadenze - Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      csvContent += `Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fine'}\n`;
    }
    csvContent += '\n';
    
    sortedCategories.forEach(categoryKey => {
      const catData = remindersByCategory[categoryKey];
      csvContent += `--- CATEGORIA: ${catData.categoryName} ---\n`;
      csvContent += 'Scadenza;Titolo;Descrizione;Importo;Giorni Preavviso\n';
      
      catData.reminders.forEach(r => {
        csvContent += [
          format(new Date(r.due_date), 'dd/MM/yyyy'),
          `"${r.title}"`,
          `"${r.description || ''}"`,
          (Number(r.amount) || 0).toFixed(2).replace('.', ','),
          r.notify_days_before || 3
        ].join(';') + '\n';
      });
      
      csvContent += `Subtotale categoria;${catData.total.toFixed(2).replace('.', ',')}\n\n`;
    });
    
    csvContent += `\n=== TOTALE GENERALE ===\n`;
    csvContent += `Importo totale;${grandTotal.toFixed(2).replace('.', ',')}\n`;
    
    downloadFile(csvContent, 'promemoria.csv', 'text/csv;charset=utf-8');
    toast.success('CSV esportato per categoria');
  };

  const handleExportJSON = () => {
    // Filter only pending reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; categoryIcon: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      const categoryIcon = r.categories?.icon || '📁';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = { reminders: [], categoryName, categoryIcon, total: 0 };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const exportData = {
      esportato_il: format(new Date(), 'dd/MM/yyyy HH:mm'),
      periodo: startDate || endDate ? {
        dal: startDate ? format(startDate, 'dd/MM/yyyy') : null,
        al: endDate ? format(endDate, 'dd/MM/yyyy') : null
      } : null,
      totale_generale: grandTotal,
      categorie: sortedCategories.map(categoryKey => {
        const catData = remindersByCategory[categoryKey];
        return {
          nome: catData.categoryName,
          icona: catData.categoryIcon,
          subtotale: catData.total,
          scadenze: catData.reminders.map(r => ({
            scadenza: format(new Date(r.due_date), 'dd/MM/yyyy'),
            titolo: r.title,
            descrizione: r.description || '',
            importo: Number(r.amount) || 0,
            giorni_preavviso: r.notify_days_before || 3
          }))
        };
      })
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'promemoria.json', 'application/json');
    toast.success('JSON esportato per categoria');
  };

  const handleExportSQL = () => {
    // Filter only pending reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = { reminders: [], categoryName, total: 0 };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    let sqlContent = `-- Scadenze esportate il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      sqlContent += `-- Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fine'}\n`;
    }
    sqlContent += `-- Totale: ${pendingReminders.length} scadenze in sospeso\n`;
    sqlContent += `-- Importo totale: ${grandTotal.toFixed(2)} EUR\n\n`;
    
    sortedCategories.forEach(categoryKey => {
      const catData = remindersByCategory[categoryKey];
      sqlContent += `-- ========================================\n`;
      sqlContent += `-- CATEGORIA: ${catData.categoryName}\n`;
      sqlContent += `-- Subtotale: ${catData.total.toFixed(2)} EUR\n`;
      sqlContent += `-- ========================================\n`;
      
      catData.reminders.forEach(r => {
        sqlContent += `INSERT INTO promemoria (titolo, descrizione, scadenza, importo, categoria, completato, giorni_preavviso) VALUES ('${r.title.replace(/'/g, "''")}', '${(r.description || '').replace(/'/g, "''")}', '${format(new Date(r.due_date), 'dd/MM/yyyy')}', ${Number(r.amount) || 0}, '${catData.categoryName}', 'No', ${r.notify_days_before || 3});\n`;
      });
      sqlContent += '\n';
    });
    
    downloadFile(sqlContent, 'promemoria.sql', 'text/plain');
    toast.success('SQL esportato per categoria');
  };

  const handleExportExcel = () => {
    // Filter only pending reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = { reminders: [], categoryName, total: 0 };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const BOM = '\uFEFF';
    let excelContent = BOM;
    excelContent += `Report Scadenze - Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    if (startDate || endDate) {
      excelContent += `Periodo: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fine'}\n`;
    }
    excelContent += '\n';
    
    sortedCategories.forEach(categoryKey => {
      const catData = remindersByCategory[categoryKey];
      excelContent += `CATEGORIA: ${catData.categoryName}\n`;
      excelContent += 'Scadenza\tTitolo\tDescrizione\tImporto\tGiorni Preavviso\n';
      
      catData.reminders.forEach(r => {
        excelContent += [
          format(new Date(r.due_date), 'dd/MM/yyyy'),
          r.title,
          r.description || '',
          (Number(r.amount) || 0).toFixed(2),
          r.notify_days_before || 3
        ].join('\t') + '\n';
      });
      
      excelContent += `Subtotale categoria\t${catData.total.toFixed(2)}\n\n`;
    });
    
    excelContent += `\nTOTALE GENERALE\t${grandTotal.toFixed(2)}\n`;
    
    downloadFile(excelContent, 'promemoria.xls', 'application/vnd.ms-excel;charset=utf-8');
    toast.success('Excel esportato per categoria');
  };

  const handleExportPDF = () => {
    // Filter only pending (not completed) reminders
    const pendingReminders = filteredReminders.filter(r => !r.completed);
    
    // Group by category
    const remindersByCategory: { [key: string]: { reminders: typeof pendingReminders; categoryName: string; total: number } } = {};
    
    pendingReminders.forEach(r => {
      const categoryKey = r.category_id || 'altro';
      const categoryName = r.categories?.name || 'Altro';
      
      if (!remindersByCategory[categoryKey]) {
        remindersByCategory[categoryKey] = {
          reminders: [],
          categoryName,
          total: 0
        };
      }
      
      remindersByCategory[categoryKey].reminders.push(r);
      remindersByCategory[categoryKey].total += Number(r.amount) || 0;
    });
    
    // Sort reminders within each category: Date ASC, Amount DESC
    Object.values(remindersByCategory).forEach(cat => {
      cat.reminders.sort((a, b) => {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
    });
    
    // Sort categories by name
    const sortedCategories = Object.keys(remindersByCategory).sort((a, b) => 
      remindersByCategory[a].categoryName.localeCompare(remindersByCategory[b].categoryName)
    );
    
    const grandTotal = pendingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const printContent = `
      <html>
        <head>
          <title>Scadenze - PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { color: #333; margin-bottom: 5px; font-size: 18px; }
            .header-info { color: #666; margin-bottom: 20px; font-size: 11px; }
            .header-info p { margin: 3px 0; }
            .category-header { color: #067d1c; margin-top: 25px; padding: 8px 0; border-top: 2px solid #067d1c; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .overdue { color: #ef4444; }
            .category-total { margin: 10px 0 25px 0; padding: 8px 12px; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 4px; font-size: 11px; text-align: right; }
            .category-section { page-break-inside: avoid; margin-bottom: 15px; }
            .grand-total { margin-top: 30px; padding: 15px; background: #f5f5f5; border: 2px solid #333; border-radius: 4px; font-size: 12px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>📅 Report Scadenze in Sospeso</h1>
          <div class="header-info">
            <p><strong>Report:</strong> Scadenze per Categoria</p>
            ${startDate || endDate ? `<p><strong>Periodo:</strong> ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Inizio'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Fine'}</p>` : ''}
            <p><strong>Generato il:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          ${sortedCategories.length === 0 ? '<p>Nessuna scadenza in sospeso.</p>' : sortedCategories.map(categoryKey => {
            const catData = remindersByCategory[categoryKey];
            return `
              <div class="category-section">
                <div class="category-header">📁 CATEGORIA: ${catData.categoryName}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Scadenza</th>
                      <th>Titolo</th>
                      <th>Descrizione</th>
                      <th style="text-align:right">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${catData.reminders.map(r => `
                      <tr class="${isBefore(new Date(r.due_date), new Date()) ? 'overdue' : ''}">
                        <td>${format(new Date(r.due_date), 'dd/MM/yyyy')}</td>
                        <td>${r.title}</td>
                        <td>${r.description || '-'}</td>
                        <td style="text-align:right">${r.amount ? formatCurrency(Number(r.amount)) : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="category-total">
                  Totale categoria: <strong>${formatCurrency(catData.total)}</strong>
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="grand-total">
            <strong>TOTALE GENERALE: ${formatCurrency(grandTotal)}</strong>
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
              Promemoria
            </motion.h1>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
              <Send className="w-4 h-4" />
              Riepilogo
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10 relative"
              onClick={handleNotifyClick}
            >
              {upcomingCount > 0 ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Notifica Scadenze
              {upcomingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {upcomingCount}
                </Badge>
              )}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <Calendar className="w-4 h-4" />
                    {getFilterLabel(filter)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    Tutti ({reminders.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('pending')}>
                    In sospeso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('completed')}>
                    Completati
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
                    <ArrowUpDown className="w-4 h-4" />
                    {getSortLabel(sortOrder)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortOrder('date-asc')}>
                    Data ↑ (crescente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('date-desc')}>
                    Data ↓ (decrescente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('amount-desc')}>
                    Importo ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('amount-asc')}>
                    Importo ↑
                  </DropdownMenuItem>
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
            </div>

          </div>
        </div>

        {/* Search and View Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca promemoria..."
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
        </div>

        {/* Report Date Range Component */}
        <ReportByDateRange
          type="reminders"
          records={reminders}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Calendar Export Dropdown */}
        <div className="flex items-center gap-2 mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/10">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendario
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExportICS}>
                <Download className="w-4 h-4 mr-2" />
                Scarica file ICS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenGoogleCalendar}>
                <Link2 className="w-4 h-4 mr-2" />
                Sincronizza con Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenAppleCalendar}>
                <Apple className="w-4 h-4 mr-2" />
                Sincronizza con Apple Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyWebcalUrl}>
                <Copy className="w-4 h-4 mr-2" />
                Copia URL webcal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Year Chart */}
        <Card className="shadow-card mb-6">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="w-5 h-5 text-[#067d1c]" />
            <CardTitle className="text-lg text-[#067d1c]">Scadenze</CardTitle>
          </CardHeader>
          <CardContent>
            <RemindersYearChart reminders={reminders} />
          </CardContent>
        </Card>

        {/* Reminders List */}
        <Card className="shadow-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#067d1c]" />
                <span className="font-semibold text-[#067d1c]">
                  Promemoria ({filteredReminders.length})
                </span>
              </div>
              <RecordsPerPageSelector 
                value={recordsPerPage} 
                onChange={setRecordsPerPage}
                totalCount={filteredReminders.length}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredReminders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun promemoria trovato
              </div>
            ) : (
              <div className="space-y-3">
                {applyLimit(filteredReminders).map((reminder, index) => (
                  <ReminderItem 
                    key={reminder.id} 
                    reminder={reminder}
                    formatCurrency={formatCurrency}
                    delay={index * 0.05}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AddReminderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <PaymentMethodManagementDialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen} />

        {/* View Dialog - Shows all filtered reminders */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Visualizza Promemoria Filtrati ({filteredReminders.length})
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredReminders.length}</div>
                  <div className="text-xs text-muted-foreground">Totali</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-expense">
                    {formatCurrency(filteredReminders.reduce((s, r) => s + (Number(r.amount) || 0), 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">Importo Totale</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">
                    {filteredReminders.filter(r => !r.completed).length}
                  </div>
                  <div className="text-xs text-muted-foreground">In Sospeso</div>
                </div>
              </div>
              
              {/* Full reminder list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {filteredReminders.map(r => (
                  <div key={r.id} className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    r.completed ? "bg-muted/30" : "bg-secondary/20 hover:bg-secondary/40"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.completed ? 'bg-income/10' : 'bg-expense/10'}`}>
                        {r.completed ? <Check className="w-4 h-4 text-income" /> : <Calendar className="w-4 h-4 text-expense" />}
                      </div>
                      <div>
                        <div className={cn("font-medium text-sm", r.completed && "line-through text-muted-foreground")}>{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(r.due_date), 'dd/MM/yyyy')}
                          {r.categories?.name && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {r.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold text-expense">
                      {r.amount ? formatCurrency(Number(r.amount)) : '-'}
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
      </div>
    </MainLayout>
  );
}

interface ReminderItemProps {
  reminder: Reminder;
  formatCurrency: (value: number) => string;
  delay: number;
  onToggleComplete: (id: string, completed: boolean) => void;
}

function ReminderItem({ reminder, formatCurrency, delay, onToggleComplete }: ReminderItemProps) {
  const dueDate = new Date(reminder.due_date);
  const isOverdue = isBefore(dueDate, new Date()) && !reminder.completed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`p-4 rounded-xl border transition-colors ${
        reminder.completed 
          ? 'bg-muted/30 border-border' 
          : isOverdue 
            ? 'bg-expense/5 border-expense/20' 
            : 'bg-secondary/30 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Paid Checkbox */}
        <button
          onClick={() => onToggleComplete(reminder.id, !reminder.completed)}
          className={cn(
            "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 mt-1",
            reminder.completed 
              ? "bg-income border-income text-white" 
              : "border-muted-foreground/30 hover:border-income/50"
          )}
          title={reminder.completed ? 'Segna come da pagare' : 'Segna come pagato'}
        >
          {reminder.completed && <Check className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${reminder.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {reminder.categories?.name || 'Altro'} - {reminder.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {reminder.description || reminder.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {format(dueDate, 'd MMM yyyy', { locale: it })}
            </span>
            {reminder.amount && (
              <span className="text-sm font-medium text-expense">
                {formatCurrency(Number(reminder.amount))}
              </span>
            )}
            {reminder.completed && (
              <Badge variant="outline" className="text-xs text-income border-income/30">
                Pagato
              </Badge>
            )}
            {reminder.payment_methods && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: `${reminder.payment_methods.color}50`,
                  color: reminder.payment_methods.color || undefined
                }}
              >
                {reminder.payment_methods.name}
              </Badge>
            )}
            <AttachmentBadge entityType="reminder" entityId={reminder.id} />
          </div>
          {/* Acconto e Rimanenza */}
          {reminder.amount && Number(reminder.paid_amount) > 0 && Number(reminder.paid_amount) < Number(reminder.amount) && (
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-income" title="Acconto versato">
                Acconto: €{Number(reminder.paid_amount).toFixed(2)}
              </span>
              <span className="text-expense" title="Rimanenza da pagare">
                Rimanenza: €{(Number(reminder.amount) - Number(reminder.paid_amount)).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <ReminderActions reminder={reminder} />
      </div>
    </motion.div>
  );
}
