import { supabase } from "@/integrations/supabase/client";
import { addMonths, addYears, setDate } from "date-fns";

interface SaveTransactionArgs {
  user_id: string;
  title: string;
  type: "entrata" | "uscita";
  total_amount: number;
  date: string; // YYYY-MM-DD
  category_id?: string | null;
  payment_method_id?: string | null;
  recurring?: "none" | "weekly" | "monthly";

  // RATE (opzionali)
  installments?: number; // 1–12
  frequency?: "monthly" | "yearly";
  advance?: number; // acconto
  installment_day?: number; // giorno del mese per le rate (1-31)
  custom_dates?: string[]; // date personalizzate per ogni rata (YYYY-MM-DD)
  
  // NOTIFICHE (opzionale)
  notify_days_before?: number; // giorni prima per notifica (default: 3)
}

/**
 * FUNZIONE UNICA
 * - se installments NON esiste → transazione singola
 * - se installments esiste → piano rate + scadenze + promemoria
 */
export async function saveTransaction({
  user_id,
  title,
  type,
  total_amount,
  date,
  category_id = null,
  payment_method_id = null,
  recurring = 'none',
  installments,
  frequency,
  advance = 0,
  notify_days_before = 3,
  installment_day,
  custom_dates,
}: SaveTransactionArgs) {

  // 🔹 CASO 1 — TRANSAZIONE SINGOLA
  if (!installments || installments === 1) {
    const { error } = await supabase.from("transactions").insert({
      user_id,
      type,
      amount: total_amount,
      date,
      description: title,
      category_id,
      payment_method_id,
      recurring,
    });

    if (error) throw error;
    return;
  }

  // 🔹 VALIDAZIONI
  if (installments < 1 || installments > 12) {
    throw new Error("Numero rate non valido (1–12)");
  }

  if (!frequency) {
    throw new Error("Frequenza rate mancante");
  }

  const residual = total_amount - advance;
  const rateAmount = Number((residual / installments).toFixed(2));

  // 🔹 CREA PIANO
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id,
      title,
      total_amount,
      installments,
      frequency,
      start_date: date,
    })
    .select()
    .single();

  if (planError) throw planError;

  // 🔹 ACCONTO (SE ESISTE)
  if (advance > 0) {
    await supabase.from("transactions").insert({
      user_id,
      type,
      amount: advance,
      date,
      description: `${title} – Acconto`,
      category_id,
      plan_id: plan.id,
      installment_index: 0,
      installment_total: installments,
      // Acconto è già pagato
      is_partial: true,
      paid_amount: advance,
    });
  }

  // 🔹 RATE AUTOMATICHE + PROMEMORIA
  const transactionRows = [];
  const reminderRows = [];

  for (let i = 0; i < installments; i++) {
    let dueDateStr: string;
    
    // Usa date personalizzate se fornite, altrimenti calcola automaticamente
    if (custom_dates && custom_dates[i]) {
      dueDateStr = custom_dates[i];
    } else {
      let dueDate =
        frequency === "monthly"
          ? addMonths(new Date(date), i)
          : addYears(new Date(date), i);
      
      // Se specificato un giorno del mese, applicalo (usa min per evitare date invalide)
      if (installment_day && installment_day >= 1 && installment_day <= 31) {
        const maxDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
        dueDate = setDate(dueDate, Math.min(installment_day, maxDay));
      }
      
      dueDateStr = dueDate.toISOString().split("T")[0];
    }

    // Transazione per la rata
    transactionRows.push({
      user_id,
      type,
      amount: rateAmount,
      date: dueDateStr,
      description: `${title} – Rata ${i + 1}/${installments}`,
      category_id,
      plan_id: plan.id,
      installment_index: i + 1,
      installment_total: installments,
      // Rate future non ancora pagate
      is_partial: false,
      paid_amount: 0,
    });

    // Promemoria per la rata (solo per uscite future)
    if (type === "uscita") {
      reminderRows.push({
        user_id,
        title: `${title} – Rata ${i + 1}/${installments}`,
        description: `Pagamento rata ${i + 1} di ${installments} del piano "${title}"`,
        amount: rateAmount,
        due_date: dueDateStr,
        notify_days_before,
        completed: false,
        category_id,
        paid_amount: 0,
      });
    }
  }

  // Inserisci tutte le transazioni
  const { error: txError } = await supabase
    .from("transactions")
    .insert(transactionRows);

  if (txError) throw txError;

  // Inserisci tutti i promemoria (se ci sono)
  if (reminderRows.length > 0) {
    const { error: reminderError } = await supabase
      .from("reminders")
      .insert(reminderRows);

    if (reminderError) {
      console.error("Errore creazione promemoria:", reminderError);
      // Non blocchiamo l'operazione se i promemoria falliscono
    }
  }
}
