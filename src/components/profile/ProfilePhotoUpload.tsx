import { useState, useRef } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showEditButton?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export function ProfilePhotoUpload({ 
  className, 
  size = 'md',
  showEditButton = true,
}: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const { avatarUrl, setAvatarUrl, getInitials } = useProfilePhoto();
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato non supportato. Usa JPG, PNG o WEBP.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande. Massimo 5 MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.id) return;

    setIsUploading(true);
    try {
      // Compress the image
      const compressedBlob = await compressImage(selectedFile, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.75,
        targetSizeKB: 200,
        outputFormat: 'image/webp',
      });

      const fileName = `${user.id}/avatar.webp`;

      // Delete existing avatar if present
      await supabase.storage
        .from('profile-avatars')
        .remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, compressedBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update profile with new avatar path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Get new public URL and update global state immediately
      const { data: urlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Update global state - this will trigger updates everywhere
      setAvatarUrl(newUrl);

      toast.success('Foto profilo aggiornata!');
      setDialogOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Errore durante il caricamento');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      const fileName = `${user.id}/avatar.webp`;

      // Delete from storage
      await supabase.storage
        .from('profile-avatars')
        .remove([fileName]);

      // Update profile
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      // Update global state - this will trigger updates everywhere
      setAvatarUrl(null);
      
      toast.success('Foto profilo rimossa');
      setDialogOpen(false);
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Errore durante la rimozione');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Clean up preview when closing
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);
    }
  };

  return (
    <>
      <div 
        className={cn(
          'relative group cursor-pointer',
          className
        )}
        onClick={() => showEditButton && setDialogOpen(true)}
      >
        <Avatar className={cn(sizeClasses[size], 'border-2 border-primary/20')}>
          <AvatarImage src={avatarUrl || undefined} alt="Foto profilo" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {showEditButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Foto Profilo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Preview */}
            <div className="flex justify-center">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarImage src={previewUrl || avatarUrl || undefined} alt="Preview" />
                <AvatarFallback className="bg-primary/10 text-primary text-4xl font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {previewUrl ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                      }
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    disabled={isUploading}
                  >
                    Annulla
                  </Button>
                  <Button
                    className="flex-1 gradient-primary text-white"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      'Salva'
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full gradient-primary text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {avatarUrl ? 'Cambia foto' : 'Carica foto'}
                  </Button>

                  {avatarUrl && (
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={handleRemovePhoto}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Rimuovi foto
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center">
              Formati supportati: JPG, PNG, WEBP. Max 5 MB.
              <br />
              L'immagine verrà compressa automaticamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
