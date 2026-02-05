import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Euro,
  TrendingDown,
  Pencil,
  Download,
  ExternalLink
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { NavigationButtons } from '@/components/layout/NavigationButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePlans, PlanWithProgress } from '@/hooks/usePlans';
import { useTransactions } from '@/hooks/useTransactions';
import { EditPlanDialog } from '@/components/plans/EditPlanDialog';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function Plans() {
  const { user } = useAuth();
  const { plans, isLoading, deletePlan } = usePlans();
  const { updateTransaction } = useTransactions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanWithProgress | null>(null);

  // Calendar export functions
  const getCalendarToken = () => {
    if (!user?.id) return '';
    return btoa(user.id).replace(/=/g, '');
  };

  const getCalendarUrl = (planId?: string) => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/installments-calendar`;
    const params = new URLSearchParams({
      user_id: user?.id || '',
      token: getCalendarToken(),
    });
    if (planId) {
      params.append('plan_id', planId);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleDownloadICS = (planId?: string) => {
    const url = getCalendarUrl(planId);
    window.open(url, '_blank');
    toast.success('Download calendario avviato');
  };

  const handleAddToGoogleCalendar = () => {
    const icsUrl = getCalendarUrl();
    // Google Calendar doesn't directly import ICS URLs, so we provide instructions
    const googleCalUrl = `https://calendar.google.com/calendar/r/settings/addbyurl`;
    window.open(googleCalUrl, '_blank');
    
    // Copy the webcal URL to clipboard
    const webcalUrl = icsUrl.replace('https://', 'webcal://');
    navigator.clipboard.writeText(webcalUrl);
    toast.success('URL copiato! Incollalo in Google Calendar');
  };

  const handleAddToAppleCalendar = () => {
    const icsUrl = getCalendarUrl();
    const webcalUrl = icsUrl.replace('https://', 'webcal://');
    window.location.href = webcalUrl;
    toast.success('Apertura Apple Calendar...');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    try {
      await deletePlan.mutateAsync(planToDelete);
      toast.success('Piano rate eliminato con successo');
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleTogglePaid = async (transactionId: string, currentlyPaid: boolean, amount: number) => {
    try {
      await updateTransaction.mutateAsync({
        id: transactionId,
        is_partial: !currentlyPaid,
        paid_amount: currentlyPaid ? 0 : amount,
      });
      toast.success(currentlyPaid ? 'Rata segnata come da pagare' : 'Rata segnata come pagata');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const toggleExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleEditPlan = (plan: PlanWithProgress) => {
    setPlanToEdit(plan);
    setEditDialogOpen(true);
  };

  const activePlans = plans.filter(p => p.progress < 100);
  const completedPlans = plans.filter(p => p.progress >= 100);

  const totalRemaining = activePlans.reduce((sum, p) => sum + p.remainingAmount, 0);
  const totalPaid = plans.reduce((sum, p) => sum + p.paidAmount, 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <NavigationButtons />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Piani Rate
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestisci i tuoi pagamenti rateizzati
            </p>
          </div>
          
          {/* Calendar Export Button */}
          {activePlans.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Esporta Calendario
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleDownloadICS()}>
                  <Download className="w-4 h-4 mr-2" />
                  Scarica file ICS
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddToGoogleCalendar}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Aggiungi a Google Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddToAppleCalendar}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Aggiungi a Apple Calendar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Piani Attivi</p>
                  <p className="text-xl font-bold">{activePlans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-expense/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-expense" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Da Pagare</p>
                  <p className="text-xl font-bold text-expense">{formatCurrency(totalRemaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-income/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-income" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Già Pagato</p>
                  <p className="text-xl font-bold text-income">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Piani Attivi ({activePlans.length})
            </h2>
            
            <div className="space-y-4">
              {activePlans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  isExpanded={expandedPlans.has(plan.id)}
                  onToggleExpand={() => toggleExpanded(plan.id)}
                  onEdit={() => handleEditPlan(plan)}
                  onDelete={() => {
                    setPlanToDelete(plan.id);
                    setDeleteDialogOpen(true);
                  }}
                  onTogglePaid={handleTogglePaid}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-income" />
              Piani Completati ({completedPlans.length})
            </h2>
            
            <div className="space-y-4">
              {completedPlans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  isExpanded={expandedPlans.has(plan.id)}
                  onToggleExpand={() => toggleExpanded(plan.id)}
                  onEdit={() => handleEditPlan(plan)}
                  onDelete={() => {
                    setPlanToDelete(plan.id);
                    setDeleteDialogOpen(true);
                  }}
                  onTogglePaid={handleTogglePaid}
                  formatCurrency={formatCurrency}
                  isCompleted
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {plans.length === 0 && (
          <Card className="bg-secondary/20">
            <CardContent className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun piano rate</h3>
              <p className="text-muted-foreground text-sm">
                Crea una nuova transazione con pagamento rateizzato per iniziare.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo piano?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà il piano e tutte le rate associate. Non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Plan Dialog */}
      <EditPlanDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        plan={planToEdit}
      />
    </MainLayout>
  );
}

interface PlanCardProps {
  plan: PlanWithProgress;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: (transactionId: string, currentlyPaid: boolean, amount: number) => void;
  formatCurrency: (value: number) => string;
  isCompleted?: boolean;
}

function PlanCard({ 
  plan, 
  index, 
  isExpanded, 
  onToggleExpand, 
  onEdit,
  onDelete, 
  onTogglePaid,
  formatCurrency,
  isCompleted 
}: PlanCardProps) {
  const sortedTransactions = [...plan.transactions].sort((a, b) => {
    // Sort by installment_index (0 = acconto first, then 1, 2, 3...)
    return (a.installment_index || 0) - (b.installment_index || 0);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <Card className={cn(
          "overflow-hidden",
          isCompleted && "opacity-75"
        )}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {plan.frequency === 'monthly' ? 'Mensile' : 'Annuale'}
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-income/20 text-income border-0 text-xs">
                      Completato
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(plan.start_date), 'dd MMM yyyy', { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro className="w-3.5 h-3.5" />
                    {formatCurrency(plan.total_amount)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Modifica piano"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="Elimina piano"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-2">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {plan.paidInstallments} / {plan.transactions.length} rate pagate
                </span>
                <span>{Math.round(plan.progress)}%</span>
              </div>
              <Progress value={plan.progress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-income">
                  Pagato: {formatCurrency(plan.paidAmount)}
                </span>
                <span className="text-expense">
                  Rimanente: {formatCurrency(plan.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Expanded: Transaction List */}
            <CollapsibleContent className="mt-4">
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-sm font-medium mb-3">Dettaglio Rate</h4>
                {sortedTransactions.map((tx) => {
                  const isPaid = tx.is_partial === true || (Number(tx.paid_amount) >= Number(tx.amount));
                  const isAcconto = tx.installment_index === 0;
                  
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        isPaid ? "bg-income/5" : "bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onTogglePaid(tx.id, isPaid, Number(tx.amount))}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isPaid 
                              ? "bg-income border-income text-white" 
                              : "border-muted-foreground/30 hover:border-income/50"
                          )}
                        >
                          {isPaid && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <div>
                          <span className={cn(
                            "text-sm font-medium",
                            isPaid && "text-muted-foreground line-through"
                          )}>
                            {isAcconto ? 'Acconto' : `Rata ${tx.installment_index}`}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Scadenza: {format(new Date(tx.date), 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-semibold",
                        isPaid ? "text-income" : "text-foreground"
                      )}>
                        {formatCurrency(Number(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}
