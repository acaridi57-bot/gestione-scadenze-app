import { useState, useRef } from 'react';
import { Paperclip, Upload, Eye, Download, Trash2, Image, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttachments, Attachment } from '@/hooks/useAttachments';
import { useProFeature } from '@/hooks/useProFeature';
import { ProFeatureGate } from '@/components/pro/ProFeatureGate';
import { toast } from 'sonner';
import { PdfIcon, PdfPrintIcon } from '@/components/icons/PdfIcon';
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

interface AttachmentManagerProps {
  entityType: 'transaction' | 'reminder';
  entityId: string;
  readOnly?: boolean;
}

export function AttachmentManager({ entityType, entityId, readOnly = false }: AttachmentManagerProps) {
  const { attachments, isLoading, uploadAttachment, deleteAttachment } = useAttachments(entityType, entityId);
  const { isPro, showGate, featureName, checkProFeature, closeGate, setShowGate } = useProFeature();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (!checkProFeature('Allegati')) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadAttachment.mutateAsync({ file, entityType, entityId });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      // For PDFs, open in new window and trigger print
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
      // For images, create printable page
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

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isPdf = (fileType: string) => fileType === 'application/pdf';

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!entityId) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span className="text-sm">Salva prima per aggiungere allegati</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Allegati</span>
          {attachments.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.bmp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploadAttachment.isPending}
              className={!isPro ? 'border-yellow-500/50 text-yellow-600' : ''}
            >
              {uploadAttachment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : !isPro ? (
                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Aggiungi allegato
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          Nessun allegato presente
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {isImage(attachment.file_type) ? (
                  <Image className="h-5 w-5 text-blue-500 shrink-0" />
                ) : (
                  <PdfIcon className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePreview(attachment)}
                  title="Visualizza"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(attachment)}
                  title="Scarica"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePrint(attachment)}
                  title="Stampa allegato"
                >
                  <PdfPrintIcon className="h-5 w-5" />
                </Button>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(attachment)}
                    title="Elimina"
                    disabled={deleteAttachment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Pro Feature Gate */}
      <ProFeatureGate 
        open={showGate} 
        onOpenChange={setShowGate} 
        feature={featureName} 
      />
    </div>
  );
}