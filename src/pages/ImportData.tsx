import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Upload, AlertCircle, Loader2 } from 'lucide-react';

// Dati dal vecchio software
const OLD_CATEGORIES = [
  { name: "Affitto Negozio", type: "uscita", icon: "home", color: "#ef4444" },
  { name: "Imposte e Tasse", type: "uscita", icon: "file-text", color: "#f97316" },
  { name: "Mutuo Casa", type: "uscita", icon: "home", color: "#8b5cf6" },
  { name: "Pensione", type: "entrata", icon: "wallet", color: "#22c55e" },
  { name: "Prestiti", type: "entrata", icon: "banknote", color: "#3b82f6" },
  { name: "Prestiti e Findomestic", type: "uscita", icon: "credit-card", color: "#ec4899" },
  { name: "Spese Auto e Moto - Assicurazione", type: "uscita", icon: "car", color: "#6366f1" },
  { name: "Sumup SOS Chemio", type: "entrata", icon: "heart", color: "#14b8a6" },
];

const OLD_TRANSACTIONS = [
  { type: "uscita", amount: 376.7, category: "Prestiti e Findomestic", description: "RATA FINDOMESTIC ADELE", date: "2026-01-05", recurring: "monthly" },
  { type: "uscita", amount: 352.7, category: "Prestiti e Findomestic", description: "RATA FINDOMESTIC TONY", date: "2026-01-05", recurring: "monthly" },
  { type: "uscita", amount: 350.0, category: "Affitto Negozio", description: "AFFITTO NEGOZIO", date: "2025-12-30", recurring: "monthly" },
  { type: "uscita", amount: 256.0, category: "Mutuo Casa", description: "RATA MUTUO CASA DA BONIFICARE", date: "2025-12-30", recurring: "monthly" },
  { type: "uscita", amount: 2000.0, category: "Prestiti e Findomestic", description: "PRESTITO FRANCESCO CREDIDIO", date: "2025-12-30", recurring: "none" },
  { type: "uscita", amount: 14.97, category: "Prestiti e Findomestic", description: "ADDEBITO PAYPAL", date: "2025-12-27", recurring: "none" },
  { type: "uscita", amount: 256.0, category: "Mutuo Casa", description: "RATA MUTUO CASA DA BONIFICARE", date: "2025-12-20", recurring: "none" },
  { type: "entrata", amount: 479.85, category: "Pensione", description: "Saldo CC.Poste Tony", date: "2025-12-19", recurring: "none" },
  { type: "entrata", amount: 548.27, category: "Sumup SOS Chemio", description: "Saldo SUMUP", date: "2025-12-18", recurring: "none" },
  { type: "uscita", amount: 350.0, category: "Affitto Negozio", description: "AFFITTO NEGOZIO", date: "2025-12-17", recurring: "none" },
  { type: "uscita", amount: 376.7, category: "Prestiti e Findomestic", description: "RATA FINDOMESTIC ADELE", date: "2025-12-17", recurring: "none" },
  { type: "uscita", amount: 352.7, category: "Prestiti e Findomestic", description: "RATA FINDOMESTIC TONY", date: "2025-12-17", recurring: "none" },
  { type: "uscita", amount: 60.95, category: "Imposte e Tasse", description: "ISTANZA DI RATEIZZAZIONE N. AR034 - 305893 - Adele Barbato -Agenzia delle entrate-Riscossione", date: "2025-12-17", recurring: "none", paid_amount: 60.95 },
  { type: "uscita", amount: 100.63, category: "Altro", description: "A SALDO LEONARDO LUCIA", date: "2025-12-16", recurring: "none" },
];

const OLD_REMINDERS = [
  { title: "Mutuo Casa - RATA MUTUO CASA DA BONIFICARE", description: "RATA MUTUO CASA DA BONIFICARE", due_date: "2025-12-30", amount: 256.0, category: "Mutuo Casa", notify_days_before: 3 },
  { title: "Affitto Negozio - AFFITTO NEGOZIO", description: "AFFITTO NEGOZIO", due_date: "2025-12-30", amount: 352.7, category: "Affitto Negozio", notify_days_before: 3 },
  { title: "Prestiti e Findomestic - RATA FINDOMESTIC ADELE", description: "RATA FINDOMESTIC ADELE", due_date: "2026-01-05", amount: 376.7, category: "Prestiti e Findomestic", notify_days_before: 7 },
  { title: "Prestiti e Findomestic - RATA FINDOMESTIC TONY", description: "RATA FINDOMESTIC TONY", due_date: "2026-01-05", amount: 352.7, category: "Prestiti e Findomestic", notify_days_before: 3 },
  { title: "Prestiti e Findomestic - PRESTITO FRANCESCO CREDIDIO", description: "PRESTITO FRANCESCO CREDIDIO", due_date: "2026-01-15", amount: 2000.0, category: "Prestiti e Findomestic", notify_days_before: 7 },
  { title: "Altro - CONDOMINIO SALCLEA AL 19.11.2025", description: "CONDOMINIO SALCLEA AL 19.11.2025", due_date: "2026-01-15", amount: 3582.41, category: "Altro", notify_days_before: 14 },
];

export default function ImportData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({
    categories: false,
    transactions: false,
    reminders: false,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const importData = async () => {
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per importare i dati",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setErrors([]);
    const newErrors: string[] = [];

    try {
      // 1. Import Categories
      const categoryMap: Record<string, string> = {};
      
      for (const cat of OLD_CATEGORIES) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            user_id: user.id,
            is_default: false,
          })
          .select()
          .single();
        
        if (error) {
          if (error.code !== '23505') { // Ignore duplicate key errors
            console.error('Category import error:', error);
            newErrors.push(`Categoria "${cat.name}": Errore durante l'importazione`);
          }
        } else if (data) {
          categoryMap[cat.name] = data.id;
        }
      }
      
      // Get existing categories to fill the map
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id, name');
      
      if (existingCategories) {
        for (const cat of existingCategories) {
          if (!categoryMap[cat.name]) {
            categoryMap[cat.name] = cat.id;
          }
        }
      }
      
      setProgress(prev => ({ ...prev, categories: true }));

      // 2. Import Transactions
      for (const trans of OLD_TRANSACTIONS) {
        const categoryId = categoryMap[trans.category] || null;
        
        const { error } = await supabase
          .from('transactions')
          .insert({
            type: trans.type,
            amount: trans.amount,
            paid_amount: trans.paid_amount || 0,
            category_id: categoryId,
            description: trans.description,
            date: trans.date,
            recurring: trans.recurring,
            is_partial: !!trans.paid_amount && trans.paid_amount < trans.amount,
            user_id: user.id,
          });
        
        if (error) {
          console.error('Transaction import error:', error);
          newErrors.push(`Transazione "${trans.description}": Errore durante l'importazione`);
        }
      }
      
      setProgress(prev => ({ ...prev, transactions: true }));

      // 3. Import Reminders
      for (const rem of OLD_REMINDERS) {
        const categoryId = categoryMap[rem.category] || null;
        
        const { error } = await supabase
          .from('reminders')
          .insert({
            title: rem.title,
            description: rem.description,
            due_date: rem.due_date,
            amount: rem.amount,
            category_id: categoryId,
            notify_days_before: rem.notify_days_before,
            completed: false,
            user_id: user.id,
          });
        
        if (error) {
          console.error('Reminder import error:', error);
          newErrors.push(`Promemoria "${rem.title}": Errore durante l'importazione`);
        }
      }
      
      setProgress(prev => ({ ...prev, reminders: true }));

      setErrors(newErrors);

      if (newErrors.length === 0) {
        toast({
          title: "Importazione completata!",
          description: "Tutti i dati sono stati importati con successo",
        });
        
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast({
          title: "Importazione completata con alcuni errori",
          description: `${newErrors.length} errori durante l'importazione`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Errore durante l'importazione",
        description: "Si è verificato un errore imprevisto",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Accesso richiesto</CardTitle>
              <CardDescription>
                Devi effettuare l'accesso per importare i dati dal vecchio software.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')}>
                Vai al Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#067d1c]">
              <Upload className="h-6 w-6 text-[#067d1c]" />
              Importa Dati dal Vecchio Software
            </CardTitle>
            <CardDescription>
              Importa categorie, transazioni e promemoria dal vecchio sistema "Gestione Entrate e Uscite"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Summary */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Categorie</p>
                  <p className="text-sm text-muted-foreground">{OLD_CATEGORIES.length} categorie da importare</p>
                </div>
                {progress.categories && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Transazioni</p>
                  <p className="text-sm text-muted-foreground">{OLD_TRANSACTIONS.length} transazioni da importare</p>
                </div>
                {progress.transactions && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Promemoria</p>
                  <p className="text-sm text-muted-foreground">{OLD_REMINDERS.length} promemoria da importare</p>
                </div>
                {progress.reminders && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="font-medium text-destructive">Errori durante l'importazione:</p>
                </div>
                <ul className="text-sm text-destructive space-y-1">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errors.length > 5 && (
                    <li>...e altri {errors.length - 5} errori</li>
                  )}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <Button 
              onClick={importData} 
              disabled={importing || (progress.categories && progress.transactions && progress.reminders)}
              className="w-full"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importazione in corso...
                </>
              ) : progress.categories && progress.transactions && progress.reminders ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Importazione completata
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Avvia Importazione
                </>
              )}
            </Button>

            {progress.categories && progress.transactions && progress.reminders && (
              <Button 
                variant="outline" 
                className="w-full text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => navigate('/')}
              >
                Vai alla Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
