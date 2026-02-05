import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: 'entrata' | 'uscita';
  icon: string | null;
  color: string | null;
  custom_icon_url: string | null;
  is_default: boolean | null;
  created_at: string | null;
  parent_id: string | null;
}

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at' | 'user_id' | 'is_default'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...category,
          user_id: user?.id,
          is_default: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  // Get only parent categories (no parent_id)
  const parentCategories = categories.filter(c => !c.parent_id);
  
  // Get subcategories for a specific parent
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);
  
  // Check if category has subcategories
  const hasSubcategories = (categoryId: string) => categories.some(c => c.parent_id === categoryId);

  const incomeCategories = categories.filter(c => c.type === 'entrata' && !c.parent_id);
  const expenseCategories = categories.filter(c => c.type === 'uscita' && !c.parent_id);

  return {
    categories,
    parentCategories,
    incomeCategories,
    expenseCategories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getSubcategories,
    hasSubcategories
  };
}
