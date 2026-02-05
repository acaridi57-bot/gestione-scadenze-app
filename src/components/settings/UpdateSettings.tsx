import { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { UpdateStatus } from '@/types/electron.d';

interface UpdateSettingsProps {
  language: 'it' | 'en';
}

const translations = {
  it: {
    title: 'Aggiornamenti',
    description: 'Verifica e installa nuovi aggiornamenti dell\'applicazione',
    currentVersion: 'Versione attuale',
    checkForUpdates: 'Controlla aggiornamenti',
    checking: 'Controllo in corso...',
    noUpdates: 'Sei aggiornato!',
    noUpdatesDesc: 'Stai usando la versione più recente',
    updateAvailable: 'Aggiornamento disponibile',
    updateAvailableDesc: 'È disponibile una nuova versione',
    downloading: 'Download in corso...',
    downloadUpdate: 'Scarica aggiornamento',
    readyToInstall: 'Pronto per l\'installazione',
    readyToInstallDesc: 'Riavvia per completare l\'aggiornamento',
    installAndRestart: 'Installa e riavvia',
    error: 'Errore',
    notDesktop: 'Funzionalità disponibile solo nell\'app desktop',
    version: 'Versione',
  },
  en: {
    title: 'Updates',
    description: 'Check and install new application updates',
    currentVersion: 'Current version',
    checkForUpdates: 'Check for updates',
    checking: 'Checking...',
    noUpdates: 'You\'re up to date!',
    noUpdatesDesc: 'You\'re running the latest version',
    updateAvailable: 'Update available',
    updateAvailableDesc: 'A new version is available',
    downloading: 'Downloading...',
    downloadUpdate: 'Download update',
    readyToInstall: 'Ready to install',
    readyToInstallDesc: 'Restart to complete the update',
    installAndRestart: 'Install and restart',
    error: 'Error',
    notDesktop: 'Feature only available in desktop app',
    version: 'Version',
  },
};

export function UpdateSettings({ language }: UpdateSettingsProps) {
  const t = translations[language];
  const isElectron = !!window.electronAPI?.isElectron;
  
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloaded: false,
    downloading: false,
    progress: 0,
    error: null,
    version: null,
  });
  const [appVersion, setAppVersion] = useState<string>('');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isElectron) return;

    // Get current app version
    window.electronAPI?.getAppVersion?.().then(setAppVersion);
    
    // Get initial update status
    window.electronAPI?.getUpdateStatus?.().then((status) => {
      if (status) setUpdateStatus(status);
    });
    
    // Subscribe to update status changes
    const unsubscribe = window.electronAPI?.onUpdateStatus?.((status) => {
      setUpdateStatus(status);
    });

    return () => {
      unsubscribe?.();
    };
  }, [isElectron]);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setHasChecked(true);
    await window.electronAPI.checkForUpdates();
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.downloadUpdate) return;
    await window.electronAPI.downloadUpdate();
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI?.installUpdate) return;
    await window.electronAPI.installUpdate();
  };

  if (!isElectron) {
    return (
      <Card className="shadow-card opacity-60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-muted-foreground">{t.title}</CardTitle>
          </div>
          <CardDescription>{t.notDesktop}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#067d1c]" />
            <CardTitle className="text-[#067d1c]">{t.title}</CardTitle>
          </div>
          {appVersion && (
            <Badge variant="secondary" className="font-mono">
              v{appVersion}
            </Badge>
          )}
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error State */}
        {updateStatus.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{updateStatus.error}</p>
          </div>
        )}

        {/* Update Downloaded - Ready to Install */}
        {updateStatus.downloaded && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-primary">{t.readyToInstall}</p>
                <p className="text-sm text-muted-foreground">
                  {t.readyToInstallDesc} ({t.version} {updateStatus.version})
                </p>
              </div>
            </div>
            <Button 
              onClick={handleInstallUpdate}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.installAndRestart}
            </Button>
          </div>
        )}

        {/* Downloading */}
        {updateStatus.downloading && !updateStatus.downloaded && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="font-medium">{t.downloading}</p>
              <span className="text-sm text-muted-foreground ml-auto">
                {updateStatus.progress}%
              </span>
            </div>
            <Progress value={updateStatus.progress} className="h-2" />
          </div>
        )}

        {/* Update Available */}
        {updateStatus.available && !updateStatus.downloading && !updateStatus.downloaded && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10">
              <Download className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  {t.updateAvailable}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.updateAvailableDesc} ({t.version} {updateStatus.version})
                </p>
              </div>
            </div>
            <Button 
              onClick={handleDownloadUpdate}
              variant="outline"
              className="w-full text-blue-600 border-blue-500/50 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              {t.downloadUpdate}
            </Button>
          </div>
        )}

        {/* No Updates (after check) */}
        {hasChecked && !updateStatus.checking && !updateStatus.available && !updateStatus.downloaded && !updateStatus.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-primary">{t.noUpdates}</p>
              <p className="text-sm text-muted-foreground">{t.noUpdatesDesc}</p>
            </div>
          </div>
        )}

        {/* Check for Updates Button */}
        {!updateStatus.downloading && !updateStatus.downloaded && (
          <Button
            onClick={handleCheckForUpdates}
            variant="outline"
            className="w-full text-primary border-primary/30 hover:bg-primary/10"
            disabled={updateStatus.checking}
          >
            {updateStatus.checking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.checking}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.checkForUpdates}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
