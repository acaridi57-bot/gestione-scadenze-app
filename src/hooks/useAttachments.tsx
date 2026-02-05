import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Attachment {
  id: string;
  user_id: string;
  entity_type: 'transaction' | 'reminder';
  entity_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useAttachments(entityType?: 'transaction' | 'reminder', entityId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch attachments for a specific entity
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async (): Promise<Attachment[]> => {
      if (!entityType || !entityId) return [];
      
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Attachment[];
    },
    enabled: !!user && !!entityType && !!entityId
  });

  // Fetch all attachments for archive
  const { data: allAttachments = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['attachments', 'all', user?.id],
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Attachment[];
    },
    enabled: !!user && !entityType && !entityId
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ 
      file, 
      entityType, 
      entityId 
    }: { 
      file: File; 
      entityType: 'transaction' | 'reminder'; 
      entityId: string;
    }): Promise<Attachment> => {
      if (!user?.id) throw new Error('Utente non autenticato');

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Formato file non supportato. Usa PDF, JPG, PNG o BMP.');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File troppo grande. Massimo 10MB.');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${entityType}/${entityId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      // Save to database
      const { data, error } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_type: file.type,
          file_url: urlData.publicUrl,
          file_size: file.size
        })
        .select()
        .single();

      if (error) throw error;
      return data as Attachment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      toast.success('Allegato caricato');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Errore durante il caricamento');
    }
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Extract file path from URL
      const urlParts = attachment.file_url.split('/attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        // Delete from storage
        await supabase.storage
          .from('attachments')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      toast.success('Allegato eliminato');
    },
    onError: () => {
      toast.error('Errore durante l\'eliminazione');
    }
  });

  return {
    attachments,
    allAttachments,
    isLoading,
    isLoadingAll,
    uploadAttachment,
    deleteAttachment,
    ALLOWED_TYPES,
    MAX_FILE_SIZE
  };
}
