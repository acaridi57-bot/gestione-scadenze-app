import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, AlertCircle, Printer, Maximize2 } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Reminder } from "@/hooks/useReminders";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReminderActions } from "@/components/reminders/ReminderActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UpcomingRemindersProps {
  reminders: Reminder[];
  onToggleComplete: (id: string, completed: boolean) => void;
}

export function UpcomingReminders({ reminders, onToggleComplete }: UpcomingRemindersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 🔴 NESSUN LIMITE, NESSUNO SLICE
  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((r) => !r.completed)
      .sort((a, b) => {
        const dateA = parseISO(a.due_date).getTime();
        const dateB = parseISO(b.due_date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
  }, [reminders]);

  const getDaysLabel = (dueDate: string) => {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { label: "Scaduto", color: "text-expense" };
    if (days === 0) return { label: "Oggi", color: "text-warning" };
    if (days === 1) return { label: "Domani", color: "text-warning" };
    return { label: `${days} giorni`, color: "text-muted-foreground" };
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatCurrency = (v: number) =>
      new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(v);

    const total = upcomingReminders.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Prossime Scadenze</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f5f5f5; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Prossime Scadenze</h1>
          <table>
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Data</th>
                <th>Stato</th>
                <th class="right">Importo</th>
              </tr>
            </thead>
            <tbody>
              ${upcomingReminders
                .map((r) => {
                  const days = differenceInDays(parseISO(r.due_date), new Date());
                  const label = days < 0 ? "Scaduto" : days === 0 ? "Oggi" : days === 1 ? "Domani" : `${days} giorni`;
                  return `
                    <tr>
                      <td>${r.title}</td>
                      <td>${format(parseISO(r.due_date), "dd/MM/yyyy")}</td>
                      <td>${label}</td>
                      <td class="right">${r.amount ? formatCurrency(Number(r.amount)) : "-"}</td>
                    </tr>
                  `;
                })
                .join("")}
              <tr>
                <td colspan="3"><strong>Totale</strong></td>
                <td class="right"><strong>${formatCurrency(total)}</strong></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  // 🔥 QUI IL FIX: NESSUN max-height IN HOME
  const RemindersList = ({ inModal = false }: { inModal?: boolean }) => (
    <div className={cn("space-y-3", inModal ? "max-h-[70vh] overflow-y-auto" : "h-auto overflow-visible")}>
      {upcomingReminders.map((reminder, index) => {
        const { label, color } = getDaysLabel(reminder.due_date);
        const isOverdue = differenceInDays(parseISO(reminder.due_date), new Date()) < 0;

        return (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl bg-secondary/50 gap-2",
              isOverdue && "border border-expense/30",
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isOverdue && <AlertCircle className="w-4 h-4 text-expense flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{reminder.title}</p>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(parseISO(reminder.due_date), "d MMM", {
                      locale: it,
                    })}
                  </span>
                  <span className={cn("font-medium", color)}>{label}</span>
                  {reminder.amount && <span className="font-semibold">€{Number(reminder.amount).toFixed(2)}</span>}
                </div>
              </div>
            </div>
            <ReminderActions reminder={reminder} />
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 shadow-card"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[#067d1c]">
            <Bell className="w-5 h-5" />
            Prossime Scadenze ({upcomingReminders.length})
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)}>
              <Maximize2 className="w-4 h-4" />
              Tutti
            </Button>
          </div>
        </div>

        {upcomingReminders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessuna scadenza imminente</p>
        ) : (
          <RemindersList />
        )}
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[#067d1c]">
                <Bell className="w-5 h-5" />
                Prossime Scadenze ({upcomingReminders.length})
              </span>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <RemindersList inModal />
        </DialogContent>
      </Dialog>
    </>
  );
}
