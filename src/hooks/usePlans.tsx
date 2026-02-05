import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Plan {
  id: string;
  user_id: string;
  title: string;
  total_amount: number;
  installments: number;
  frequency: string;
  start_date: string;
  created_at: string;
}

export interface PlanWithProgress extends Plan {
  transactions: {
    id: string;
    amount: number;
    date: string;
    installment_index: number | null;
    is_partial: boolean;
    paid_amount: number | null;
  }[];
  paidInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  progress: number;
}

export function usePlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (plansError) throw plansError;

      // Fetch all transactions with plan_id
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('id, plan_id, amount, date, installment_index, is_partial, paid_amount')
        .not('plan_id', 'is', null);
      
      if (txError) throw txError;

      // Map transactions to plans
      const plansWithProgress: PlanWithProgress[] = (plansData || []).map(plan => {
        const planTransactions = (transactionsData || []).filter(t => t.plan_id === plan.id);
        
        // Calculate paid amount (transactions with is_partial=true or where paid_amount >= amount)
        const paidTransactions = planTransactions.filter(t => 
          t.is_partial === true || (Number(t.paid_amount) >= Number(t.amount))
        );
        
        const paidAmount = planTransactions.reduce((sum, t) => {
          // If fully paid, count full amount; otherwise count paid_amount
          if (t.is_partial === true || (Number(t.paid_amount) >= Number(t.amount))) {
            return sum + Number(t.amount);
          }
          return sum + (Number(t.paid_amount) || 0);
        }, 0);

        const remainingAmount = Number(plan.total_amount) - paidAmount;
        const progress = Number(plan.total_amount) > 0 
          ? (paidAmount / Number(plan.total_amount)) * 100 
          : 0;

        return {
          ...plan,
          transactions: planTransactions,
          paidInstallments: paidTransactions.length,
          paidAmount,
          remainingAmount: Math.max(0, remainingAmount),
          progress: Math.min(100, progress),
        };
      });

      return plansWithProgress;
    },
    enabled: !!user
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      // First delete all transactions associated with this plan
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('plan_id', planId);
      
      if (txError) throw txError;

      // Then delete the plan
      const { error: planError } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);
      
      if (planError) throw planError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  return {
    plans,
    isLoading,
    deletePlan
  };
}
