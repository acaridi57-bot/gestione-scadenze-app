import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  due_date: string;
  notify_days_before: number | null;
  completed: boolean | null;
  created_at: string | null;
  user_id: string;
  category_id: string | null;
  paid_amount: number | null;
  payment_method_id: string | null;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  payment_methods?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export interface ReminderInsert {
  title: string;
  description?: string | null;
  amount?: number | null;
  due_date: string;
  notify_days_before?: number | null;
  completed?: boolean | null;
  category_id?: string | null;
  paid_amount?: number | null;
}

export interface ReminderUpdate extends Partial<ReminderInsert> {
  id: string;
}

export function useReminders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: reminders = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["reminders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reminders")
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
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user?.id,
  });

  const addReminder = useMutation({
    mutationFn: async (reminder: ReminderInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          ...reminder,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      toast.error("Errore durante l'aggiunta del promemoria");
      console.error("Add reminder error:", error);
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: ReminderUpdate) => {
      const { data, error } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      toast.error("Errore durante l'aggiornamento del promemoria");
      console.error("Update reminder error:", error);
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      toast.error("Errore durante l'eliminazione del promemoria");
      console.error("Delete reminder error:", error);
    },
  });

  const toggleCompleted = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from("reminders")
        .update({ completed })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      toast.error("Errore durante l'aggiornamento dello stato");
      console.error("Toggle completed error:", error);
    },
  });

  return {
    reminders,
    isLoading,
    isError,
    error,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleCompleted,
  };
}
