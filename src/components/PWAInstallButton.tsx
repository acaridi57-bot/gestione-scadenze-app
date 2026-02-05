import { Download, Trash2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PWAInstallButtonProps extends Omit<ButtonProps, 'onClick'> {
  showIcon?: boolean;
}

export function PWAInstallButton({ 
  showIcon = true, 
  children,
  ...props 
}: PWAInstallButtonProps) {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const handleClick = async () => {
    if (isInstalled) {
      toast.info('L\'app è già installata sul tuo dispositivo');
      return;
    }

    if (isIOS) {
      // On iOS, we can't programmatically install, so redirect to install page
      navigate('/install');
      return;
    }

    if (isInstallable) {
      const success = await promptInstall();
      if (success) {
        toast.success('App installata con successo!');
      }
    } else {
      // If not installable, redirect to install page with instructions
      navigate('/install');
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <Button onClick={handleClick} {...props}>
      {showIcon && <Download className="mr-2 w-5 h-5" />}
      {children || 'Installa App'}
    </Button>
  );
}

interface PWAUninstallButtonProps extends Omit<ButtonProps, 'onClick'> {
  showIcon?: boolean;
}

export function PWAUninstallButton({ 
  showIcon = true, 
  children,
  ...props 
}: PWAUninstallButtonProps) {
  const handleClick = () => {
    toast.info(
      'Per disinstallare l\'app:\n\n' +
      '• Android: Vai in Impostazioni > App > Gestione Scadenze > Disinstalla\n' +
      '• iOS: Tieni premuta l\'icona e seleziona "Rimuovi app"\n' +
      '• Desktop: Clicca sui 3 puntini nel browser e seleziona "Disinstalla"',
      { duration: 8000 }
    );
  };

  return (
    <Button onClick={handleClick} {...props}>
      {showIcon && <Trash2 className="mr-2 w-4 h-4" />}
      {children || 'Disinstalla'}
    </Button>
  );
}
