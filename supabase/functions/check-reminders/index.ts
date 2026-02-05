import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://gestionescadenze.app',
  'https://www.gestionescadenze.app',
  'https://fdeaa805-c9b8-4bdb-8faa-04b1243917f8.lovableproject.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface ReminderNotification {
  id: string;
  title: string;
  due_date: string;
  amount: number | null;
  user_id: string;
  notify_days_before: number | null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all reminders that are upcoming within their notify_days_before window
    // and belong to users with notifications enabled
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select(`
        id,
        title,
        due_date,
        amount,
        user_id,
        notify_days_before,
        description
      `)
      .eq('completed', false)
      .gte('due_date', todayStr);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} uncompleted reminders`);

    // Filter reminders that are within their notification window
    const upcomingReminders: ReminderNotification[] = [];
    
    reminders?.forEach(reminder => {
      const dueDate = new Date(reminder.due_date);
      const notifyDays = reminder.notify_days_before ?? 3;
      const notifyDate = new Date(dueDate);
      notifyDate.setDate(notifyDate.getDate() - notifyDays);

      if (today >= notifyDate && today <= dueDate) {
        upcomingReminders.push(reminder);
      }
    });

    console.log(`${upcomingReminders.length} reminders within notification window`);

    // Get users with notifications enabled
    const userIds = [...new Set(upcomingReminders.map(r => r.user_id))];
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, notification_enabled')
        .in('id', userIds)
        .eq('notification_enabled', true);

      const enabledUserIds = new Set(profiles?.map(p => p.id) || []);
      
      // Filter to only reminders for users with notifications enabled
      const notifiableReminders = upcomingReminders.filter(r => 
        enabledUserIds.has(r.user_id)
      );

      console.log(`${notifiableReminders.length} reminders to notify (users with notifications enabled)`);

      // Format reminders for response
      const formattedReminders = notifiableReminders.map(r => {
        const dueDate = new Date(r.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: r.id,
          title: r.title,
          dueDate: r.due_date,
          amount: r.amount,
          daysUntil,
          userId: r.user_id,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          remindersChecked: reminders?.length || 0,
          remindersToNotify: formattedReminders.length,
          reminders: formattedReminders,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersChecked: reminders?.length || 0,
        remindersToNotify: 0,
        reminders: [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-reminders function:", error);
    return new Response(
      JSON.stringify({ success: false, error: 'Si è verificato un errore nel controllo promemoria' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
