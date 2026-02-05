import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: 'Transazioni illimitate', free: true, pro: true },
  { name: 'Promemoria scadenze', free: true, pro: true },
  { name: 'Categorie personalizzate', free: true, pro: true },
  { name: 'Rate e piani di pagamento', free: true, pro: true },
  { name: 'Allegati documenti', free: false, pro: true },
  { name: 'Export PDF e Excel', free: false, pro: true },
  { name: 'Report avanzati', free: false, pro: true },
  { name: 'Sintesi vocale TTS', free: false, pro: true },
  { name: 'Notifiche WhatsApp', free: false, pro: true },
  { name: 'Backup automatici', free: false, pro: true },
  { name: 'Supporto prioritario', free: false, pro: true },
];

export default function Pricing() {
  const { user } = useAuth();
  const { upgradeToPro, loading, isInTrial, trialDaysRemaining } = useSubscription();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsPro(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();
      setIsPro(data?.subscription_status === 'active');
    };
    checkSubscription();
  }, [user]);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
              Scegli il tuo piano
            </h1>
            <p className="text-muted-foreground text-lg">
              Sblocca tutto il potenziale di Gestione Scadenze
            </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {/* Free Plan / Trial */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-2">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">
                  {isInTrial ? 'Trial Pro' : 'Free'}
                </CardTitle>
                <CardDescription>
                  {isInTrial 
                    ? `${trialDaysRemaining} giorni rimasti` 
                    : 'Per iniziare'
                  }
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">€0</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
                {!user && (
                  <p className="text-sm text-muted-foreground mt-2">
                    7 giorni di prova gratuita con tutte le funzionalità Pro
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      {isInTrial || feature.free ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={!isInTrial && !feature.free ? 'text-muted-foreground/60' : ''}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                
                {isInTrial && (
                  <Badge className="w-full justify-center py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                    Trial attivo - {trialDaysRemaining} giorni rimasti
                  </Badge>
                )}
                
                {!isPro && isPro !== null && !isInTrial && (
                  <Button variant="outline" className="w-full" disabled>
                    Piano attuale
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pro Monthly Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-2 border-yellow-500 relative overflow-hidden shadow-xl shadow-yellow-500/20">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />
              <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Consigliato
              </Badge>
              
              <CardHeader className="text-center pb-2 pt-12">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  Pro Mensile
                </CardTitle>
                <CardDescription>Accesso completo</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">€4,99</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
                
                {isPro ? (
                  <Button className="w-full" disabled>
                    <Crown className="w-4 h-4 mr-2" />
                    Piano attuale
                  </Button>
                ) : user ? (
                  <Button
                    onClick={() => upgradeToPro()}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg text-lg py-6"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    {loading ? 'Caricamento...' : 'Abbonati ora'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg py-6"
                  >
                    Registrati per iniziare
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold mb-4">Domande frequenti</h2>
          <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Come funziona il periodo di prova?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quando ti registri, hai 7 giorni di accesso completo a tutte le funzionalità Pro gratuitamente. Nessuna carta di credito richiesta.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posso annullare in qualsiasi momento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sì, puoi annullare la tua sottoscrizione in qualsiasi momento. L'accesso Pro rimarrà attivo fino alla fine del periodo di fatturazione.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Come funziona il pagamento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Utilizziamo Stripe per gestire i pagamenti in modo sicuro. Accettiamo carte di credito e debito.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cosa succede dopo il trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dopo 7 giorni, le funzionalità Pro verranno bloccate. Potrai comunque usare le funzionalità base o abbonarti per €4,99/mese.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
