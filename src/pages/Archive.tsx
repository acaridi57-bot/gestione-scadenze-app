import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAttachments, Attachment } from '@/hooks/useAttachments';
import { useTransactions } from '@/hooks/useTransactions';
import { useReminders } from '@/hooks/useReminders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Archive as ArchiveIcon, Image, Eye, Download, Trash2, Calendar, Filter, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { PdfIcon, PdfPrintIcon } from '@/components/icons/PdfIcon';

type FilterType = 'all' | 'transaction' | 'reminder';
type FilterFormat = 'all' | 'pdf' | 'image';

export default function Archive() {
  const { allAttachments, isLoadingAll, deleteAttachment } = useAttachments();
  const { transactions } = useTransactions();
  const { reminders } = useReminders();
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterFormat, setFilterFormat] = useState<FilterFormat>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);

  // Get entity info (description/title) for each attachment
  const getEntityInfo = (attachment: Attachment) => {
    if (attachment.entity_type === 'transaction') {
      const transaction = transactions.find(t => t.id === attachment.entity_id);
      return {
        description: transaction?.description || 'Transazione',
        date: transaction?.date,
        amount: transaction?.amount
      };
    } else {
      const reminder = reminders.find(r => r.id === attachment.entity_id);
      return {
        description: reminder?.title || 'Promemoria',
        date: reminder?.due_date,
        amount: reminder?.amount
      };
    }
  };

  const filteredAttachments = useMemo(() => {
    return allAttachments.filter(attachment => {
      // Filter by type
      if (filterType !== 'all' && attachment.entity_type !== filterType) {
        return false;
      }

      // Filter by format
      if (filterFormat === 'pdf' && attachment.file_type !== 'application/pdf') {
        return false;
      }
      if (filterFormat === 'image' && !attachment.file_type.startsWith('image/')) {
        return false;
      }

      // Filter by date
      const entityInfo = getEntityInfo(attachment);
      if (entityInfo.date) {
        if (fromDate && entityInfo.date < fromDate) return false;
        if (toDate && entityInfo.date > toDate) return false;
      }

      return true;
    });
  }, [allAttachments, filterType, filterFormat, fromDate, toDate, transactions, reminders]);

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isPdf = (fileType: string) => fileType === 'application/pdf';

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    setPreviewOpen(true);
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (attachment: Attachment) => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error("Impossibile aprire finestra di stampa");
      return;
    }

    const isImageFile = isImage(attachment.file_type);
    const isPdfFile = isPdf(attachment.file_type);

    if (isPdfFile) {
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stampa: ${attachment.file_name}</title>
            <style>
              * { margin: 0; padding: 0; }
              body { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${attachment.file_url}" onload="setTimeout(() => { window.print(); }, 500);"></iframe>
          </body>
        </html>
      `);
    } else if (isImageFile) {
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stampa: ${attachment.file_name}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                padding: 20px;
                background: #fff;
              }
              img { 
                max-width: 100%; 
                max-height: 90vh; 
                object-fit: contain;
              }
              @media print {
                body { padding: 0; }
                img { max-height: 100%; }
              }
            </style>
          </head>
          <body>
            <img src="${attachment.file_url}" alt="${attachment.file_name}" onload="setTimeout(() => { window.print(); }, 300);" />
          </body>
        </html>
      `);
    }

    w.document.close();
    toast.success("Stampa avviata");
  };

  const handleDeleteClick = (attachment: Attachment) => {
    setAttachmentToDelete(attachment);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (attachmentToDelete) {
      await deleteAttachment.mutateAsync(attachmentToDelete);
      setDeleteConfirmOpen(false);
      setAttachmentToDelete(null);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <ArchiveIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Archivio</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="transaction">Transazioni</SelectItem>
                    <SelectItem value="reminder">Promemoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={filterFormat} onValueChange={(v) => setFilterFormat(v as FilterFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="image">Immagini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dal</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Al</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachments Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Allegati ({filteredAttachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAll ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAttachments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArchiveIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun allegato presente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nome file</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Riferimento</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttachments.map((attachment) => {
                      const entityInfo = getEntityInfo(attachment);
                      return (
                        <TableRow key={attachment.id}>
                          <TableCell>
                            {isImage(attachment.file_type) ? (
                              <Image className="h-5 w-5 text-blue-500" />
                            ) : (
                              <PdfIcon className="h-5 w-5 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {attachment.file_name}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              attachment.entity_type === 'transaction'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            }`}>
                              {attachment.entity_type === 'transaction' ? 'Transazione' : 'Promemoria'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {entityInfo.description}
                          </TableCell>
                          <TableCell>{formatDate(entityInfo.date)}</TableCell>
                          <TableCell>{formatCurrency(entityInfo.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePreview(attachment)}
                                title="Visualizza"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(attachment)}
                                title="Scarica"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePrint(attachment)}
                                title="Stampa allegato"
                              >
                                <PdfPrintIcon className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(attachment)}
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAttachment && isPdf(previewAttachment.file_type) && (
                <PdfIcon className="h-5 w-5 text-destructive" />
              )}
              {previewAttachment && isImage(previewAttachment.file_type) && (
                <Image className="h-5 w-5 text-blue-500" />
              )}
              {previewAttachment?.file_name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {previewAttachment && isImage(previewAttachment.file_type) && (
              <img
                src={previewAttachment.file_url}
                alt={previewAttachment.file_name}
                className="w-full h-auto"
              />
            )}
            {previewAttachment && isPdf(previewAttachment.file_type) && (
              <iframe
                src={previewAttachment.file_url}
                className="w-full h-[60vh]"
                title={previewAttachment.file_name}
              />
            )}
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewAttachment && handleDownload(previewAttachment)}
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => previewAttachment && handlePrint(previewAttachment)}
            >
              <PdfPrintIcon className="h-5 w-5 mr-2" />
              Stampa allegato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare allegato?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{attachmentToDelete?.file_name}". Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
