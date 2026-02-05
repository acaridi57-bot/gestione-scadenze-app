import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, Printer, Download, FileSpreadsheet, FileJson, Table2, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useProFeature } from "@/hooks/useProFeature";
import { ProFeatureGate } from "@/components/pro/ProFeatureGate";

type Transaction = {
  id: string;
  date: string;
  description?: string | null;
  amount: number;
  type: string;
  category_id?: string | null;
  categories?: { name: string; icon?: string | null } | null;
};

type Reminder = {
  id: string;
  due_date: string;
  title: string;
  amount?: number | null;
  completed?: boolean | null;
  category_id?: string | null;
  categories?: { name: string; icon?: string | null } | null;
};

interface Props {
  type: "transactions" | "reminders";
  records: Transaction[] | Reminder[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export function ReportByDateRange({ 
  type, 
  records, 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: Props) {
  const { isPro, showGate, featureName, checkProFeature, setShowGate } = useProFeature();

  const formatDateIT = (d?: Date) => {
    if (!d) return "—";
    return format(d, "dd/MM/yyyy");
  };

  const getDate = (r: Transaction | Reminder) =>
    type === "transactions" ? (r as Transaction).date : (r as Reminder).due_date;

  const getLabel = (r: Transaction | Reminder) =>
    type === "transactions" ? (r as Transaction).description || "—" : (r as Reminder).title;

  const getAmount = (r: Transaction | Reminder) =>
    r.amount != null ? Number(r.amount) : 0;

  // Filter records by date range
  const filtered = useMemo(() => {
    let result = [...records];
    
    result = result.filter((r) => {
      const d = new Date(getDate(r));
      if (startDate && isBefore(d, startOfDay(startDate))) return false;
      if (endDate && isAfter(d, endOfDay(endDate))) return false;
      return true;
    });

    // For reminders, filter only pending
    if (type === "reminders") {
      result = result.filter((r) => !(r as Reminder).completed);
    }

    // Sort by date ASC, amount DESC
    result.sort((a, b) => {
      const dateA = new Date(getDate(a)).getTime();
      const dateB = new Date(getDate(b)).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return getAmount(b) - getAmount(a);
    });

    return result;
  }, [records, startDate, endDate, type]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(v);

  // Group by category
  const getGroupedData = () => {
    const grouped: { [key: string]: { items: (Transaction | Reminder)[]; categoryName: string; total: number; entrateTotal?: number; usciteTotal?: number } } = {};

    filtered.forEach((r) => {
      const categoryKey = (r as any).category_id || 'altro';
      const categoryName = (r as any).categories?.name || 'Altro';

      if (!grouped[categoryKey]) {
        grouped[categoryKey] = { items: [], categoryName, total: 0, entrateTotal: 0, usciteTotal: 0 };
      }

      grouped[categoryKey].items.push(r);
      
      if (type === "transactions") {
        const t = r as Transaction;
        if (t.type === 'entrata') {
          grouped[categoryKey].entrateTotal! += getAmount(r);
        } else {
          grouped[categoryKey].usciteTotal! += getAmount(r);
        }
      } else {
        grouped[categoryKey].total += getAmount(r);
      }
    });

    return Object.values(grouped).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  };

  const handlePrint = () => {
    if (!checkProFeature('Export e Stampa')) {
      return;
    }
    
    if (filtered.length === 0) {
      toast.error("Nessun dato nel periodo selezionato");
      return;
    }

    const groupedData = getGroupedData();
    const isTransactions = type === "transactions";
    
    let grandTotalEntrate = 0;
    let grandTotalUscite = 0;
    let grandTotal = 0;

    if (isTransactions) {
      filtered.forEach((r) => {
        const t = r as Transaction;
        if (t.type === 'entrata') grandTotalEntrate += getAmount(r);
        else grandTotalUscite += getAmount(r);
      });
    } else {
      grandTotal = filtered.reduce((sum, r) => sum + getAmount(r), 0);
    }

    const periodText = `dal ${formatDateIT(startDate)} al ${formatDateIT(endDate)}`;

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Report ${isTransactions ? "Transazioni" : "Scadenze"}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 18px; color: #333; }
            .period { text-align: center; margin-bottom: 20px; font-size: 12px; color: #555; padding: 8px; background: #f5f5f5; border-radius: 4px; }
            .period span { font-weight: bold; }
            .category-header { color: #067d1c; margin-top: 25px; padding: 8px 0; border-top: 2px solid #067d1c; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 5px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .amount { text-align: right; }
            .entrata { color: #22c55e; }
            .uscita { color: #ef4444; }
            .category-total { margin: 10px 0 25px 0; padding: 8px 12px; background: #f0f9f0; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 11px; text-align: right; }
            .category-section { page-break-inside: avoid; margin-bottom: 15px; }
            .grand-total { margin-top: 30px; padding: 15px; background: #f5f5f5; border: 2px solid #333; border-radius: 4px; font-size: 12px; }
            .grand-total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            @media print {
              body { padding: 10px; }
              h1 { font-size: 16px; }
            }
          </style>
        </head>
        <body>
          <h1>📊 Report ${isTransactions ? "Transazioni" : "Scadenze"}</h1>
          <p class="period">
            Periodo: <span>${periodText}</span> — Generato il: ${format(new Date(), "dd/MM/yyyy HH:mm")}
          </p>
          
          ${groupedData.map((catData) => {
            const saldoCategoria = isTransactions ? (catData.entrateTotal! - catData.usciteTotal!) : catData.total;
            return `
              <div class="category-section">
                <div class="category-header">📁 CATEGORIA: ${catData.categoryName}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>${isTransactions ? "Descrizione" : "Titolo"}</th>
                      ${isTransactions ? "<th>Tipo</th>" : ""}
                      <th class="amount">Importo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${catData.items.map((r) => {
                      const t = r as Transaction;
                      return `
                        <tr>
                          <td>${format(new Date(getDate(r)), "dd/MM/yyyy")}</td>
                          <td>${getLabel(r)}</td>
                          ${isTransactions ? `<td>${t.type === 'entrata' ? 'Entrata' : 'Uscita'}</td>` : ""}
                          <td class="amount ${isTransactions ? t.type : ''}">${formatCurrency(getAmount(r))}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
                <div class="category-total">
                  Totale categoria: 
                  ${isTransactions ? `
                    ${catData.entrateTotal! > 0 ? `<strong class="entrata">+${formatCurrency(catData.entrateTotal!)}</strong>` : ''}
                    ${catData.usciteTotal! > 0 ? `<strong class="uscita">-${formatCurrency(catData.usciteTotal!)}</strong>` : ''}
                    <strong>= ${saldoCategoria >= 0 ? '+' : ''}${formatCurrency(saldoCategoria)}</strong>
                  ` : `<strong>${formatCurrency(catData.total)}</strong>`}
                </div>
              </div>
            `;
          }).join("")}
          
          <div class="grand-total">
            ${isTransactions ? `
              <div class="grand-total-row"><span>Totale Entrate:</span> <strong class="entrata">${formatCurrency(grandTotalEntrate)}</strong></div>
              <div class="grand-total-row"><span>Totale Uscite:</span> <strong class="uscita">${formatCurrency(grandTotalUscite)}</strong></div>
              <div class="grand-total-row" style="border-top: 1px solid #333; padding-top: 8px; margin-top: 8px;">
                <span><strong>TOTALE GENERALE:</strong></span> 
                <strong class="${grandTotalEntrate - grandTotalUscite >= 0 ? 'entrata' : 'uscita'}">${formatCurrency(grandTotalEntrate - grandTotalUscite)}</strong>
              </div>
            ` : `
              <div class="grand-total-row"><strong>TOTALE GENERALE: ${formatCurrency(grandTotal)}</strong></div>
            `}
          </div>
        </body>
      </html>
    `);

    w.document.close();
    setTimeout(() => w.print(), 300);
    toast.success("Stampa avviata");
  };

  const handleExportCSV = () => {
    if (!checkProFeature('Export CSV')) {
      return;
    }
    
    if (filtered.length === 0) {
      toast.error("Nessun dato da esportare");
      return;
    }

    const groupedData = getGroupedData();
    const isTransactions = type === "transactions";
    const periodText = `dal ${formatDateIT(startDate)} al ${formatDateIT(endDate)}`;

    let csvContent = `Report ${isTransactions ? "Transazioni" : "Scadenze"} - Periodo: ${periodText}\n`;
    csvContent += `Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}\n\n`;

    groupedData.forEach((catData) => {
      csvContent += `--- CATEGORIA: ${catData.categoryName} ---\n`;
      csvContent += isTransactions 
        ? "Data;Tipo;Descrizione;Importo\n"
        : "Data;Titolo;Importo\n";

      catData.items.forEach((r) => {
        const t = r as Transaction;
        if (isTransactions) {
          csvContent += `${format(new Date(getDate(r)), "dd/MM/yyyy")};${t.type === 'entrata' ? 'Entrata' : 'Uscita'};"${getLabel(r)}";${getAmount(r).toFixed(2).replace('.', ',')}\n`;
        } else {
          csvContent += `${format(new Date(getDate(r)), "dd/MM/yyyy")};"${getLabel(r)}";${getAmount(r).toFixed(2).replace('.', ',')}\n`;
        }
      });

      if (isTransactions) {
        csvContent += `Subtotale Entrate: ${catData.entrateTotal!.toFixed(2).replace('.', ',')} EUR\n`;
        csvContent += `Subtotale Uscite: ${catData.usciteTotal!.toFixed(2).replace('.', ',')} EUR\n`;
      } else {
        csvContent += `Subtotale: ${catData.total.toFixed(2).replace('.', ',')} EUR\n`;
      }
      csvContent += "\n";
    });

    const total = isTransactions 
      ? (filtered as Transaction[]).filter(t => t.type === 'entrata').reduce((s, t) => s + getAmount(t), 0) - 
        (filtered as Transaction[]).filter(t => t.type === 'uscita').reduce((s, t) => s + getAmount(t), 0)
      : filtered.reduce((s, r) => s + getAmount(r), 0);

    csvContent += `\nTOTALE GENERALE: ${total.toFixed(2).replace('.', ',')} EUR\n`;

    downloadFile(csvContent, `report_${type}_${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv;charset=utf-8");
    toast.success("CSV esportato");
  };

  const handleExportPDF = () => {
    if (!checkProFeature('Export PDF')) {
      return;
    }
    // PDF uses print dialog with "Save as PDF" option
    handlePrint();
    toast.info("Usa 'Salva come PDF' nel dialogo di stampa");
  };

  const handleExportExcel = () => {
    if (!checkProFeature('Export Excel')) {
      return;
    }
    
    if (filtered.length === 0) {
      toast.error("Nessun dato da esportare");
      return;
    }

    const groupedData = getGroupedData();
    const isTransactions = type === "transactions";
    const periodText = `dal ${formatDateIT(startDate)} al ${formatDateIT(endDate)}`;

    // Excel-compatible CSV with proper formatting
    let csvContent = `"Report ${isTransactions ? "Transazioni" : "Scadenze"}"\n`;
    csvContent += `"Periodo: ${periodText}"\n`;
    csvContent += `"Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}"\n\n`;

    groupedData.forEach((catData) => {
      csvContent += `"CATEGORIA: ${catData.categoryName}"\n`;
      csvContent += isTransactions 
        ? `"Data";"Tipo";"Descrizione";"Importo (€)"\n`
        : `"Data";"Titolo";"Importo (€)"\n`;

      catData.items.forEach((r) => {
        const t = r as Transaction;
        if (isTransactions) {
          csvContent += `"${format(new Date(getDate(r)), "dd/MM/yyyy")}";"${t.type === 'entrata' ? 'Entrata' : 'Uscita'}";"${getLabel(r)}";"${getAmount(r).toFixed(2).replace('.', ',')}"\n`;
        } else {
          csvContent += `"${format(new Date(getDate(r)), "dd/MM/yyyy")}";"${getLabel(r)}";"${getAmount(r).toFixed(2).replace('.', ',')}"\n`;
        }
      });

      if (isTransactions) {
        csvContent += `"";"Subtotale Entrate";"";"+${catData.entrateTotal!.toFixed(2).replace('.', ',')}"\n`;
        csvContent += `"";"Subtotale Uscite";"";"−${catData.usciteTotal!.toFixed(2).replace('.', ',')}"\n`;
      } else {
        csvContent += `"";"Subtotale";"${catData.total.toFixed(2).replace('.', ',')}"\n`;
      }
      csvContent += "\n";
    });

    let grandTotalEntrate = 0;
    let grandTotalUscite = 0;
    let grandTotal = 0;

    if (isTransactions) {
      filtered.forEach((r) => {
        const t = r as Transaction;
        if (t.type === 'entrata') grandTotalEntrate += getAmount(r);
        else grandTotalUscite += getAmount(r);
      });
      csvContent += `\n"";"TOTALE ENTRATE";"";"+${grandTotalEntrate.toFixed(2).replace('.', ',')}"\n`;
      csvContent += `"";"TOTALE USCITE";"";"−${grandTotalUscite.toFixed(2).replace('.', ',')}"\n`;
      csvContent += `"";"SALDO GENERALE";"";"${(grandTotalEntrate - grandTotalUscite).toFixed(2).replace('.', ',')}"\n`;
    } else {
      grandTotal = filtered.reduce((s, r) => s + getAmount(r), 0);
      csvContent += `\n"";"TOTALE GENERALE";"${grandTotal.toFixed(2).replace('.', ',')}"\n`;
    }

    downloadFile(csvContent, `report_${type}_${format(new Date(), "yyyy-MM-dd")}.xls`, "application/vnd.ms-excel;charset=utf-8");
    toast.success("Excel esportato");
  };

  const handleExportJSON = () => {
    if (!checkProFeature('Export JSON')) {
      return;
    }
    
    if (filtered.length === 0) {
      toast.error("Nessun dato da esportare");
      return;
    }

    const isTransactions = type === "transactions";
    const groupedData = getGroupedData();

    let grandTotalEntrate = 0;
    let grandTotalUscite = 0;
    let grandTotal = 0;

    if (isTransactions) {
      filtered.forEach((r) => {
        const t = r as Transaction;
        if (t.type === 'entrata') grandTotalEntrate += getAmount(r);
        else grandTotalUscite += getAmount(r);
      });
    } else {
      grandTotal = filtered.reduce((s, r) => s + getAmount(r), 0);
    }

    const jsonData = {
      report: {
        tipo: isTransactions ? "Transazioni" : "Scadenze",
        periodo: {
          dal: startDate ? format(startDate, "yyyy-MM-dd") : null,
          al: endDate ? format(endDate, "yyyy-MM-dd") : null,
        },
        generato_il: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      },
      categorie: groupedData.map((catData) => ({
        nome: catData.categoryName,
        voci: catData.items.map((r) => {
          const t = r as Transaction;
          return isTransactions ? {
            id: r.id,
            data: format(new Date(getDate(r)), "yyyy-MM-dd"),
            tipo: t.type,
            descrizione: getLabel(r),
            importo: getAmount(r),
          } : {
            id: r.id,
            scadenza: format(new Date(getDate(r)), "yyyy-MM-dd"),
            titolo: getLabel(r),
            importo: getAmount(r),
          };
        }),
        totale: isTransactions ? {
          entrate: catData.entrateTotal,
          uscite: catData.usciteTotal,
          saldo: catData.entrateTotal! - catData.usciteTotal!,
        } : catData.total,
      })),
      totali: isTransactions ? {
        entrate: grandTotalEntrate,
        uscite: grandTotalUscite,
        saldo: grandTotalEntrate - grandTotalUscite,
      } : { totale: grandTotal },
    };

    downloadFile(JSON.stringify(jsonData, null, 2), `report_${type}_${format(new Date(), "yyyy-MM-dd")}.json`, "application/json;charset=utf-8");
    toast.success("JSON esportato");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob(["\ufeff" + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearDates = () => {
    onStartDateChange(undefined);
    onEndDateChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-card rounded-lg border shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <Label htmlFor="from-date" className="text-sm font-medium text-muted-foreground">Dal</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="from-date"
                variant="outline"
                size="sm"
                className={cn(
                  "w-[140px] justify-start text-left font-normal text-primary border-primary/30 hover:bg-primary/10",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-[#067d1c]" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Seleziona"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label htmlFor="to-date" className="text-sm font-medium text-muted-foreground">Al</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="to-date"
                variant="outline"
                size="sm"
                className={cn(
                  "w-[140px] justify-start text-left font-normal text-primary border-primary/30 hover:bg-primary/10",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-[#067d1c]" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Seleziona"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDates}
            className="h-9 px-2 text-muted-foreground hover:text-foreground self-end"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap ml-auto">
        <Button onClick={handlePrint} variant="outline" size="sm" className={cn("gap-2", isPro ? "text-primary border-primary/30 hover:bg-primary/10" : "border-yellow-500/50 text-yellow-600")}>
          {!isPro && <Crown className="h-3 w-3 text-yellow-500" />}
          <Printer className="h-4 w-4" />
          Stampa
        </Button>
        <Button onClick={handleExportCSV} variant="outline" size="sm" className={cn("gap-2", isPro ? "text-primary border-primary/30 hover:bg-primary/10" : "border-yellow-500/50 text-yellow-600")}>
          {!isPro && <Crown className="h-3 w-3 text-yellow-500" />}
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button onClick={handleExportExcel} variant="outline" size="sm" className={cn("gap-2", isPro ? "text-primary border-primary/30 hover:bg-primary/10" : "border-yellow-500/50 text-yellow-600")}>
          {!isPro && <Crown className="h-3 w-3 text-yellow-500" />}
          <Table2 className="h-4 w-4" />
          Excel
        </Button>
        <Button onClick={handleExportJSON} variant="outline" size="sm" className={cn("gap-2", isPro ? "text-primary border-primary/30 hover:bg-primary/10" : "border-yellow-500/50 text-yellow-600")}>
          {!isPro && <Crown className="h-3 w-3 text-yellow-500" />}
          <FileJson className="h-4 w-4" />
          JSON
        </Button>
        <Button onClick={handleExportPDF} variant="outline" size="sm" className={cn("gap-2", isPro ? "text-primary border-primary/30 hover:bg-primary/10" : "border-yellow-500/50 text-yellow-600")}>
          {!isPro && <Crown className="h-3 w-3 text-yellow-500" />}
          <FileSpreadsheet className="h-4 w-4" />
          PDF
        </Button>
      </div>

      {/* Pro Feature Gate */}
      <ProFeatureGate 
        open={showGate} 
        onOpenChange={setShowGate} 
        feature={featureName} 
      />
    </div>
  );
}
