import { Bell, BellRing, TestTube2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationSettingsProps {
  translations: {
    notifications: string;
    notificationsDesc: string;
    enableNotifications: string;
    enableNotificationsDesc: string;
  };
}

export function NotificationSettings({ translations }: NotificationSettingsProps) {
  const {
    permission,
    isSupported,
    notificationsEnabled,
    toggleNotifications,
    sendTestNotification,
    requestPermission,
  } = useNotifications();

  const getPermissionBadge = () => {
    if (!isSupported) {
      return <Badge variant="secondary">Non supportato</Badge>;
    }
    
    switch (permission) {
      case 'granted':
        return <Badge className="bg-income text-income-foreground">Consentito</Badge>;
      case 'denied':
        return <Badge variant="destructive">Negato</Badge>;
      default:
        return <Badge variant="secondary">Non richiesto</Badge>;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#067d1c]" />
          <CardTitle className="text-[#067d1c]">{translations.notifications}</CardTitle>
        </div>
        <CardDescription>{translations.notificationsDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Stato permessi browser</p>
            <p className="text-xs text-muted-foreground">
              {!isSupported 
                ? 'Il tuo browser non supporta le notifiche push'
                : permission === 'denied'
                ? 'Hai negato i permessi. Modificali nelle impostazioni del browser'
                : permission === 'granted'
                ? 'Puoi ricevere notifiche push'
                : 'Clicca per richiedere i permessi'}
            </p>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Request Permission Button */}
        {isSupported && permission === 'default' && (
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={requestPermission}
          >
            <BellRing className="w-4 h-4" />
            Richiedi permesso notifiche
          </Button>
        )}

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{translations.enableNotifications}</p>
            <p className="text-sm text-muted-foreground">{translations.enableNotificationsDesc}</p>
          </div>
          <Switch 
            checked={notificationsEnabled} 
            onCheckedChange={toggleNotifications}
            disabled={!isSupported || permission === 'denied'}
          />
        </div>

        {/* Test Notification */}
        {isSupported && permission === 'granted' && notificationsEnabled && (
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={sendTestNotification}
          >
            <TestTube2 className="w-4 h-4" />
            Invia notifica di test
          </Button>
        )}

        {/* Info about notifications */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">ℹ️ Come funzionano le notifiche:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Riceverai una notifica per i promemoria in scadenza</li>
            <li>Le notifiche vengono inviate in base ai giorni di preavviso configurati</li>
            <li>Puoi disabilitare le notifiche in qualsiasi momento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
