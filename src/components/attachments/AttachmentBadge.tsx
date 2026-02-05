import { Paperclip } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PdfIcon } from '@/components/icons/PdfIcon';

interface AttachmentBadgeProps {
  entityType: 'transaction' | 'reminder';
  entityId: string;
}

export function AttachmentBadge({ entityType, entityId }: AttachmentBadgeProps) {
  const { data = { count: 0, hasPdf: false } } = useQuery({
    queryKey: ['attachments', 'count', entityType, entityId],
    queryFn: async (): Promise<{ count: number; hasPdf: boolean }> => {
      const { data, count, error } = await supabase
        .from('attachments')
        .select('file_type', { count: 'exact' })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) return { count: 0, hasPdf: false };
      
      const hasPdf = data?.some(att => att.file_type === 'application/pdf') || false;
      return { count: count || 0, hasPdf };
    },
    staleTime: 30000 // Cache for 30 seconds
  });

  if (data.count === 0) return null;

  return (
    <div className="flex items-center gap-1" title={`${data.count} allegati`}>
      {data.hasPdf ? (
        <PdfIcon className="h-4 w-4" />
      ) : (
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className="text-xs font-medium text-muted-foreground">{data.count}</span>
    </div>
  );
}
