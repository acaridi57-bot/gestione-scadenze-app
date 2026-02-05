import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'entrata' | 'uscita';
  amount: number;
  paid_amount: number;
  category_id: string | null;
  payment_method_id: string | null;
  description: string | null;
  date: string;
  start_date: string | null;
  end_date: string | null;
  is_partial: boolean;
  recurring: 'none' | 'weekly' | 'monthly';
  attachment_url: string | null;
  created_at: string;
  plan_id: string | null;
  installment_index: number | null;
  installment_total: number | null;
  categories?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  payment_methods?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export function useTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          ),
          payment_methods (
            id,
            name,
            icon,
            color
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'categories'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  return {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
}
