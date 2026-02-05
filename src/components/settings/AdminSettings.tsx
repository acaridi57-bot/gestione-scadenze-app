import { useState } from 'react';
import { Shield, Users, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AdminSettings() {
  const { isAdmin, guestModeEnabled, toggleGuestMode } = useAdmin();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isAdmin) {
    return null;
  }

  const handleToggleGuestMode = async () => {
    setLoading(true);
    try {
      await toggleGuestMode();
      toast({
        title: guestModeEnabled ? 'Modalità Ospite Disattivata' : 'Modalità Ospite Attivata',
        description: guestModeEnabled 
          ? 'Login e registrazione sono ora obbligatori'
          : 'Gli utenti possono ora accedere come ospiti con dati demo',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile modificare la modalità ospite',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Impostazioni Amministratore</CardTitle>
        </div>
        <CardDescription>
          Gestisci le impostazioni globali dell'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Guest Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            {guestModeEnabled ? (
              <ToggleRight className="w-6 h-6 text-income" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-muted-foreground" />
            )}
            <div>
              <Label className="text-base font-medium">Modalità Ospite</Label>
              <p className="text-sm text-muted-foreground">
                {guestModeEnabled 
                  ? 'Attiva - Gli utenti possono accedere senza login'
                  : 'Disattivata - Login obbligatorio'}
              </p>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Switch 
                checked={guestModeEnabled}
                disabled={loading}
              />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  {guestModeEnabled ? 'Disattivare modalità ospite?' : 'Attivare modalità ospite?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {guestModeEnabled 
                    ? 'Il login e la registrazione diventeranno obbligatori. Gli ospiti non potranno più accedere.'
                    : 'Gli utenti potranno accedere all\'app senza login, visualizzando dati demo. I dati reali rimarranno protetti.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleGuestMode}>
                  Conferma
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Info box */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Informazioni sulla modalità ospite</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Gli ospiti vedono solo dati demo/fittizi</li>
                <li>• I dati reali degli utenti restano protetti</li>
                <li>• Gli ospiti non possono salvare modifiche</li>
                <li>• Utile per dimostrazioni dell'app</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
