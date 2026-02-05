import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";

interface ImportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportedRow {
  data?: string;
  date?: string;
  tipo?: string;
  type?: string;
  categoria?: string;
  category?: string;
  descrizione?: string;
  description?: string;
  importo?: number | string;
  amount?: number | string;
}

// Load PDF.js dynamically from CDN
const loadPdfJs = async () => {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export function ImportTransactionsDialog({ open, onOpenChange }: ImportTransactionsDialogProps) {
  const { addTransaction } = useTransactions();
  const { categories } = useCategories();
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportedRow[]>([]);
  const [allParsed, setAllParsed] = useState<ImportedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ImportedRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    // Detect separator (comma, semicolon, or tab)
    const firstLine = lines[0];
    const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    const headers = lines[0].split(separator).map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/"/g, "")
        .replace(/data/i, "data")
        .replace(/date/i, "date")
        .replace(/tipo/i, "tipo")
        .replace(/type/i, "type")
        .replace(/categoria/i, "categoria")
        .replace(/category/i, "category")
        .replace(/descrizione/i, "descrizione")
        .replace(/description/i, "description")
        .replace(/importo/i, "importo")
        .replace(/amount/i, "amount"),
    );

    const rows: ImportedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim().replace(/^"|"$/g, ""));
      if (values.length >= 2) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row as ImportedRow);
      }
    }
    return rows;
  };

  const parseJSON = (content: string): ImportedRow[] => {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    } catch {
      return [];
    }
  };

  const parsePDF = async (file: File): Promise<ImportedRow[]> => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // Try to extract transactions from the text
    const rows: ImportedRow[] = [];

    // Common patterns for transaction lines
    const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g;
    const amountPattern = /[€$]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g;

    const lines = fullText.split("\n").filter((line) => line.trim().length > 5);

    for (const line of lines) {
      const dateMatch = line.match(datePattern);
      const amounts = [...line.matchAll(amountPattern)];

      if (dateMatch && amounts.length > 0) {
        const lastAmount = amounts[amounts.length - 1][1];
        const date = dateMatch[0];

        // Determine type based on keywords or amount sign
        const isIncome =
          line.toLowerCase().includes("entrat") ||
          line.toLowerCase().includes("accredit") ||
          line.toLowerCase().includes("stipend") ||
          line.toLowerCase().includes("bonifico in") ||
          line.includes("+");

        // Extract description (text between date and amount)
        let description = line;
        if (dateMatch[0]) {
          description = line.substring(line.indexOf(dateMatch[0]) + dateMatch[0].length);
        }
        description = description.replace(/[€$]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, "").trim();
        description = description.substring(0, 100); // Limit length

        rows.push({
          data: date,
          tipo: isIncome ? "Entrata" : "Uscita",
          descrizione: description || "Transazione importata da PDF",
          importo: lastAmount,
        });
      }
    }

    return rows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);

    let parsed: ImportedRow[] = [];

    try {
      if (file.name.endsWith(".json")) {
        const content = await file.text();
        parsed = parseJSON(content);
      } else if (file.name.endsWith(".pdf")) {
        parsed = await parsePDF(file);
      } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt") || file.name.endsWith(".xls")) {
        const content = await file.text();
        parsed = parseCSV(content);
      } else {
        toast.error("Formato file non supportato. Usa CSV, TXT, XLS, JSON o PDF.");
        setParsing(false);
        return;
      }

      if (parsed.length === 0) {
        toast.error("Nessun dato valido trovato nel file");
        setParsing(false);
        return;
      }

      setAllParsed(parsed);
      setPreview(parsed);
      toast.info(`${parsed.length} transazioni trovate`);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Errore durante la lettura del file");
    }

    setParsing(false);
  };

  const normalizeDate = (dateStr: string | undefined): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];

    // Try common formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or D/M/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // DD/MM/YY
    ];

    for (let i = 0; i < formats.length; i++) {
      const match = dateStr.match(formats[i]);
      if (match) {
        if (i === 3) {
          return dateStr; // Already in YYYY-MM-DD format
        }
        let year = match[3];
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    return new Date().toISOString().split("T")[0];
  };

  const normalizeType = (typeStr: string | undefined): "entrata" | "uscita" => {
    if (!typeStr) return "uscita";
    const lower = typeStr.toLowerCase();
    if (lower.includes("entrat") || lower.includes("income") || lower.includes("in")) {
      return "entrata";
    }
    return "uscita";
  };

  const findCategoryId = (categoryName: string | undefined, type: "entrata" | "uscita"): string | null => {
    if (!categoryName) return null;
    const lower = categoryName.toLowerCase();
    const found = categories.find((c) => c.name.toLowerCase() === lower && c.type === type);
    return found?.id || null;
  };

  const normalizeAmount = (amountStr: string | number | undefined): number => {
    if (typeof amountStr === "number") return Math.abs(amountStr);
    if (!amountStr) return 0;
    // Handle European format (comma as decimal separator, dots for thousands)
    let normalized = amountStr.replace(/[^\d,.-]/g, "");
    // If there's both dot and comma, determine which is decimal separator
    if (normalized.includes(".") && normalized.includes(",")) {
      // European format: 1.234,56 -> 1234.56
      if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        // US format: 1,234.56 -> 1234.56
        normalized = normalized.replace(/,/g, "");
      }
    } else {
      // Only comma or only dot
      normalized = normalized.replace(",", ".");
    }
    return Math.abs(parseFloat(normalized) || 0);
  };

  const handleImport = async () => {
    if (allParsed.length === 0) {
      toast.error("Seleziona un file da importare");
      return;
    }

    setImporting(true);

    let successCount = 0;
    let errorCount = 0;

    for (const row of allParsed) {
      try {
        const type = normalizeType(row.tipo || row.type);
        const date = normalizeDate(row.data || row.date);
        const amount = normalizeAmount(row.importo || row.amount);
        const description = row.descrizione || row.description || "";
        const categoryId = findCategoryId(row.categoria || row.category, type);

        if (amount > 0) {
          await addTransaction.mutateAsync({
            type,
            date,
            amount,
            description,
            category_id: categoryId,
            payment_method_id: null,
            paid_amount: 0,
            is_partial: false,
            recurring: "none",
            start_date: null,
            end_date: null,
            attachment_url: null,
            plan_id: null,
            installment_index: null,
            installment_total: null,
          });
          successCount++;
        }
      } catch (err) {
        console.error("Error importing row:", err);
        errorCount++;
      }
    }

    setImporting(false);

    setAllParsed([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (successCount > 0) {
      toast.success(`${successCount} transazioni importate con successo`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} transazioni non importate`);
    }

    onOpenChange(false);
  };

  const handleReset = () => {
    setAllParsed([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">Importa Transazioni</DialogTitle>
          <DialogDescription>Carica un file CSV, XLS, JSON o PDF con le tue transazioni</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File format info */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Formati supportati:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong>CSV/XLS:</strong> Colonne: Data, Tipo, Categoria, Descrizione, Importo
              </li>
              <li>
                <strong>JSON:</strong> Array di oggetti con le stesse proprietà
              </li>
              <li>
                <strong>PDF:</strong> Estratti conto bancari (estrazione automatica)
              </li>
              <li>Il tipo deve essere "Entrata" o "Uscita"</li>
            </ul>
          </div>

          {/* File input */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xls,.json,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="import-file"
              disabled={parsing}
            />
            <label
              htmlFor="import-file"
              className={`flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-lg p-6 cursor-pointer hover:bg-primary/5 transition-colors ${parsing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {parsing ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-primary" />
              )}
              <span className="text-muted-foreground">
                {parsing ? "Analisi in corso..." : fileName || "Clicca per selezionare un file"}
              </span>
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Anteprima ({allParsed.length} transazioni totali):
              </p>
              <div className="bg-muted/30 rounded-lg p-3 text-xs overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-1">Data</th>
                      <th className="text-left p-1">Tipo</th>
                      <th className="text-left p-1">Descrizione</th>
                      <th className="text-right p-1">Importo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-1">{row.data || row.date || "-"}</td>
                        <td className="p-1">{row.tipo || row.type || "-"}</td>
                        <td className="p-1 max-w-[150px] truncate">{row.descrizione || row.description || "-"}</td>
                        <td className="p-1 text-right">{row.importo || row.amount || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {preview.length > 0 && (
              <Button variant="outline" onClick={handleReset} disabled={importing}>
                Annulla
              </Button>
            )}
            <Button
              onClick={handleImport}
              disabled={allParsed.length === 0 || importing || parsing}
              className="gradient-primary text-primary-foreground"
            >
              {importing ? "Importazione..." : `Importa ${allParsed.length > 0 ? `(${allParsed.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
