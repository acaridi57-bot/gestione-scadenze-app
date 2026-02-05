import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Volume2, VolumeX, Square, Loader2, Crown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { NavigationButtons } from '@/components/layout/NavigationButtons';
import euroCoin from '@/assets/2-euro-coin.png';
import { StatCard } from '@/components/dashboard/StatCard';
import { UpcomingReminders } from '@/components/dashboard/UpcomingReminders';
import { UpcomingInstallments } from '@/components/dashboard/UpcomingInstallments';
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner';
import { ProFeatureGate } from '@/components/pro/ProFeatureGate';
import { useTransactions } from '@/hooks/useTransactions';
import { useReminders } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/hooks/useTTS';
import { useProFeature } from '@/hooks/useProFeature';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user } = useAuth();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { reminders, toggleCompleted } = useReminders();
  const { speak, stop, isPlaying, isLoading: isTTSLoading } = useTTS();
  const { isPro, showGate, featureName, checkProFeature, setShowGate } = useProFeature();
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const handleVoiceToggle = () => {
    // Check Pro feature first
    if (!checkProFeature('Sintesi vocale TTS')) {
      return;
    }

    if (isPlaying) {
      stop();
      setVoiceEnabled(false);
      return;
    }

    const now = new Date();
    const currentMonth = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    
    const summary = `Riepilogo finanziario di ${currentMonth}. 
      Entrate del mese: ${stats.income.toFixed(0)} euro. 
      Uscite del mese: ${stats.expenses.toFixed(0)} euro. 
      Saldo attuale: ${stats.balance.toFixed(0)} euro.`;
    
    if (stats.balance > 0) {
      setVoiceEnabled(true);
      speak(summary + ' Il saldo è positivo, ottimo lavoro!');
    } else if (stats.balance < 0) {
      setVoiceEnabled(true);
      speak(summary + ' Attenzione, il saldo è negativo.');
    } else {
      setVoiceEnabled(true);
      speak(summary);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const income = monthTransactions
      .filter(t => t.type === 'entrata')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'uscita')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = income - expenses;

    return { income, expenses, balance };
  }, [transactions]);

  const handleToggleComplete = (id: string, completed: boolean) => {
    toggleCompleted.mutate({ id, completed });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="coin-container">
                <div className="banknote-shine coin-rotate w-10 h-10 md:w-12 md:h-12 rounded-full">
                  <img src={euroCoin} alt="Euro" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#067d1c]">
                Gestione Scadenze
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <NavigationButtons />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleVoiceToggle}
              disabled={isTTSLoading}
              className={`gap-2 ${isPro ? 'text-primary border-primary/30 hover:bg-primary/10' : 'border-yellow-500/50 text-yellow-600'}`}
            >
              {!isPro && <Crown className="w-3 h-3 text-yellow-500" />}
              {isTTSLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Square className="w-4 h-4" />
              ) : voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              {isTTSLoading ? 'Carico...' : isPlaying ? 'Stop' : 'Leggi'}
            </Button>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Ecco il riepilogo delle tue finanze
          </p>
        </motion.div>

        {/* Upgrade Banner for Free users */}
        <UpgradeBanner />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Entrate del mese"
            value={formatCurrency(stats.income)}
            icon={TrendingUp}
            variant="income"
            delay={0}
          />
          <StatCard
            title="Uscite del mese"
            value={formatCurrency(stats.expenses)}
            icon={TrendingDown}
            variant="expense"
            delay={0.1}
          />
          <StatCard
            title="Saldo"
            value={formatCurrency(stats.balance)}
            icon={Wallet}
            variant="balance"
            delay={0.2}
          />
        </div>

        {/* Upcoming Installments */}
        <div className="mb-6">
          <UpcomingInstallments />
        </div>

        {/* Upcoming Reminders - Full Width */}
        <UpcomingReminders 
          reminders={reminders} 
          onToggleComplete={handleToggleComplete}
        />

        {/* Pro Feature Gate */}
        <ProFeatureGate 
          open={showGate} 
          onOpenChange={setShowGate} 
          feature={featureName} 
        />
      </div>
    </MainLayout>
  );
}
